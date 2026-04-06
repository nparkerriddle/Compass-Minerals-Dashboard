import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { getWorkers, getIncidents, createIncident, deleteIncident } from '../lib/api.js';
import {
  getRollingTotal, getActiveIncidents, getCurrentCALevel,
  getIncidentWeight, getNCNSCount,
} from '../lib/attendancePolicy.js';
import { INCIDENT_TYPES, CA_THRESHOLDS } from '../lib/constants.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Select } from '../components/ui/Input.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const BUCKET_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'];

function caVariant(level) {
  if (!level) return 'gray';
  if (level.includes('Termination')) return 'red';
  if (level.includes('Final'))  return 'red';
  if (level.includes('Written') && !level.includes('Final')) return 'orange';
  return 'yellow';
}

function IncidentBadge({ total }) {
  if (total >= 7) return <Badge variant="red">{total}</Badge>;
  if (total >= 5) return <Badge variant="orange">{total}</Badge>;
  if (total >= 3) return <Badge variant="yellow">{total}</Badge>;
  return <Badge variant="gray">{total}</Badge>;
}

export function AttendancePage() {
  const [workers, setWorkers] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterWorker, setFilterWorker] = useState('');
  const [tileCA, setTileCA] = useState(null);
  const toast = useToast();

  const [form, setForm] = useState({ worker_id: '', type: 'late_minor', date: '', notes: '' });

  useEffect(() => {
    Promise.all([getWorkers(), getIncidents()]).then(([w, i]) => {
      setWorkers(w);
      setAllIncidents(i);
      setLoading(false);
    });
  }, []);

  const refresh = () => {
    Promise.all([getWorkers(), getIncidents()]).then(([w, i]) => {
      setWorkers(w);
      setAllIncidents(i);
    });
  };

  const handleAdd = async () => {
    if (!form.worker_id || !form.date) {
      toast({ message: 'Worker and date are required.', type: 'error' });
      return;
    }
    const incType = INCIDENT_TYPES.find((t) => t.value === form.type);
    await createIncident({
      worker_id: form.worker_id,
      type: form.type,
      label: incType?.label,
      weight: incType?.weight || 1,
      date: form.date,
      notes: form.notes,
    });
    toast({ message: 'Incident logged.' });
    setModalOpen(false);
    setForm({ worker_id: '', type: 'late_minor', date: '', notes: '' });
    refresh();
  };

  const handleDelete = async (incId) => {
    await deleteIncident(incId);
    toast({ message: 'Incident removed.' });
    refresh();
  };

  if (loading) return <PageLoader />;

  const activeWorkers = workers.filter((w) => w.status === 'Active');

  const summaries = activeWorkers.map((w) => {
    const wInc = allIncidents.filter((i) => i.worker_id === w.id);
    const importedPoints = parseFloat(w.attendance_points) || 0;
    return {
      worker: w,
      incidents: wInc,
      rolling: getRollingTotal(wInc),
      importedPoints,
      caLevel: getCurrentCALevel(wInc),
      ncns12mo: getNCNSCount(wInc, 365),
    };
  }).sort((a, b) => (b.rolling + b.importedPoints) - (a.rolling + a.importedPoints));

  // ── Alert: near termination ────────────────────────────────────────────────
  const nearTerm = summaries.filter((s) => (s.rolling + s.importedPoints) >= 7);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const ptsBuckets = [
    { name: 'Clean (0)',  color: BUCKET_COLORS[0], value: summaries.filter((s) => (s.rolling + s.importedPoints) === 0).length },
    { name: '0.5 – 2',   color: BUCKET_COLORS[1], value: summaries.filter((s) => { const t = s.rolling + s.importedPoints; return t > 0 && t < 3; }).length },
    { name: '3 – 4',     color: BUCKET_COLORS[2], value: summaries.filter((s) => { const t = s.rolling + s.importedPoints; return t >= 3 && t < 5; }).length },
    { name: '5 – 6',     color: BUCKET_COLORS[3], value: summaries.filter((s) => { const t = s.rolling + s.importedPoints; return t >= 5 && t < 7; }).length },
    { name: '7+',        color: BUCKET_COLORS[4], value: summaries.filter((s) => (s.rolling + s.importedPoints) >= 7).length },
  ];

  const deptTotals = {};
  summaries.forEach(({ worker: w, rolling, importedPoints }) => {
    const d = w.department || 'Unknown';
    deptTotals[d] = (deptTotals[d] || 0) + rolling + importedPoints;
  });
  const deptChartData = Object.entries(deptTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  const monthData = (() => {
    const counts = {};
    allIncidents.forEach((inc) => {
      if (!inc.date) return;
      const key = format(parseISO(inc.date), 'yyyy-MM');
      const label = format(parseISO(inc.date), 'MMM yy');
      if (!counts[key]) counts[key] = { name: label, value: 0 };
      counts[key].value++;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  })();

  // ── Tiles & filters ────────────────────────────────────────────────────────
  const caTiles = [
    { label: 'No Action',         value: 'none',                       color: 'gray',   count: summaries.filter((s) => !s.caLevel).length },
    { label: 'Verbal Warning',    value: 'Verbal Warning',             color: 'yellow', count: summaries.filter((s) => s.caLevel === 'Verbal Warning').length },
    { label: 'Written Warning',   value: 'Written Warning',            color: 'orange', count: summaries.filter((s) => s.caLevel === 'Written Warning').length },
    { label: 'Final Written',     value: 'Final Written + Suspension', color: 'red',    count: summaries.filter((s) => s.caLevel === 'Final Written + Suspension').length },
    { label: 'Termination Level', value: 'Termination',                color: 'red',    count: summaries.filter((s) => s.caLevel === 'Termination').length },
    { label: 'NCNS (12mo)',       value: 'ncns',                       color: 'red',    count: summaries.filter((s) => s.ncns12mo >= 1).length },
  ].filter((t) => t.count > 0);

  const displayed = summaries.filter((s) => {
    if (filterWorker && s.worker.id !== filterWorker) return false;
    if (tileCA === 'none') return !s.caLevel;
    if (tileCA === 'ncns') return s.ncns12mo >= 1;
    if (tileCA) return s.caLevel === tileCA;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">Rolling 6-month incident tracking · {activeWorkers.length} active workers</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Log Incident
        </Button>
      </div>

      {/* ── Near-termination alert ── */}
      {nearTerm.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <h2 className="text-sm font-semibold text-red-800">
              {nearTerm.length} worker{nearTerm.length !== 1 ? 's' : ''} at or near termination — 7+ points
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {nearTerm.map(({ worker: w, rolling, importedPoints, caLevel }) => {
              const total = rolling + importedPoints;
              return (
                <div key={w.id} className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-4 py-2.5">
                  <div>
                    <Link to={`/workers/${w.id}`} className="font-medium text-red-700 hover:underline text-sm">
                      {w.first_name} {w.last_name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{w.department} · {w.supervisor}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {caLevel && <Badge variant={caVariant(caLevel)}>{caLevel}</Badge>}
                    <span className={`text-xl font-bold ${total >= 8 ? 'text-red-700' : 'text-orange-600'}`}>
                      {total}
                    </span>
                    <span className="text-xs text-gray-400">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Points distribution */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Points Distribution</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ptsBuckets} margin={{ right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Workers']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {ptsBuckets.map((b, i) => (
                      <Cell key={i} fill={b.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Total points by department */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Total Points by Department</h2>
            </CardHeader>
            <CardBody>
              {deptChartData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={deptChartData} layout="vertical" margin={{ left: 90, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v) => [v, 'Total pts']} />
                      <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* Monthly incident trend */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Incidents Logged by Month</h2>
            </CardHeader>
            <CardBody>
              {monthData.length === 0
                ? <p className="text-sm text-gray-400">No incidents logged yet.</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthData} margin={{ right: 16 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, 'Incidents']} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* CA level breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Workers by CA Level</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'Clean',        value: summaries.filter((s) => !s.caLevel).length,                                          fill: '#10b981' },
                    { name: 'Verbal',       value: summaries.filter((s) => s.caLevel === 'Verbal Warning').length,                      fill: '#f59e0b' },
                    { name: 'Written',      value: summaries.filter((s) => s.caLevel === 'Written Warning').length,                     fill: '#f97316' },
                    { name: 'Final',        value: summaries.filter((s) => s.caLevel === 'Final Written + Suspension').length,          fill: '#ef4444' },
                    { name: 'Term Level',   value: summaries.filter((s) => s.caLevel === 'Termination').length,                         fill: '#b91c1c' },
                  ]}
                  margin={{ right: 16 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Workers']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'Clean',      fill: '#10b981' },
                      { name: 'Verbal',     fill: '#f59e0b' },
                      { name: 'Written',    fill: '#f97316' },
                      { name: 'Final',      fill: '#ef4444' },
                      { name: 'Term Level', fill: '#b91c1c' },
                    ].map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

        </div>
      )}

      {/* ── CA level filter tiles ── */}
      {caTiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filter by CA Level</p>
          <FilterTiles tiles={caTiles} selected={tileCA} onSelect={setTileCA} />
        </div>
      )}

      {/* Threshold reference */}
      <div className="flex gap-3 flex-wrap">
        {CA_THRESHOLDS.map((t) => (
          <div key={t.level} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs">
            <span className="font-semibold text-gray-700">{t.min}+ pts</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">{t.level}</span>
          </div>
        ))}
      </div>

      {/* Worker filter */}
      <select
        value={filterWorker}
        onChange={(e) => setFilterWorker(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
      >
        <option value="">All Active Workers</option>
        {activeWorkers.map((w) => (
          <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
        ))}
      </select>

      {/* ── Worker attendance cards ── */}
      <div className="space-y-3">
        {displayed.map(({ worker: w, incidents, rolling, importedPoints, caLevel, ncns12mo }) => (
          <Card key={w.id}>
            <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Link to={`/workers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                  {w.first_name} {w.last_name}
                </Link>
                <span className="text-xs text-gray-400">{w.department} · {w.supervisor}</span>
                {ncns12mo >= 2 && <Badge variant="red">NCNS ×{ncns12mo}</Badge>}
              </div>
              <div className="flex items-center gap-3">
                {caLevel && <Badge variant={caVariant(caLevel)}>{caLevel}</Badge>}
                {importedPoints > 0 && (
                  <span className="text-xs text-amber-600 font-medium">{importedPoints} imported</span>
                )}
                <IncidentBadge total={rolling + importedPoints} />
                <Button size="sm" variant="secondary" onClick={() => {
                  setForm((f) => ({ ...f, worker_id: w.id }));
                  setModalOpen(true);
                }}>
                  <Plus size={12} /> Log
                </Button>
              </div>
            </div>

            {getActiveIncidents(incidents).length > 0 && (
              <div className="divide-y divide-gray-50">
                {getActiveIncidents(incidents)
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((inc) => (
                    <div key={inc.id} className="px-5 py-2 flex items-center justify-between text-xs">
                      <span className="text-gray-600">{inc.label || inc.type}</span>
                      <span className="text-gray-400">{format(parseISO(inc.date), 'MM/dd/yy')}</span>
                      {inc.notes && <span className="text-gray-400 truncate max-w-xs">{inc.notes}</span>}
                      <span className="font-semibold text-gray-700">{inc.weight} pt{inc.weight !== 1 ? 's' : ''}</span>
                      <button onClick={() => handleDelete(inc.id)} className="text-red-300 hover:text-red-600 ml-2">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {importedPoints > 0 && (
              <div className="px-5 py-2 flex items-center justify-between text-xs bg-amber-50/60 border-t border-amber-100">
                <span className="text-amber-700">Roster baseline (imported from spreadsheet)</span>
                <span className="font-semibold text-amber-700">{importedPoints} pts</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Log Incident Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Attendance Incident">
        <div className="space-y-4">
          <Select
            label="Worker *"
            value={form.worker_id}
            onChange={(e) => setForm((f) => ({ ...f, worker_id: e.target.value }))}
          >
            <option value="">Select worker…</option>
            {activeWorkers.map((w) => (
              <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
            ))}
          </Select>

          <Select
            label="Incident Type *"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label} ({t.weight} pt{t.weight !== 1 ? 's' : ''})</option>
            ))}
          </Select>

          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />

          <Textarea
            label="Notes"
            rows={3}
            placeholder="Optional details…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Log Incident</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
