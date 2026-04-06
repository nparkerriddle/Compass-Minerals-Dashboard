import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
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
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';

function caVariant(level) {
  if (!level) return 'gray';
  if (level.includes('Termination')) return 'red';
  if (level.includes('Final'))  return 'red';
  if (level.includes('Written') && !level.includes('Final')) return 'orange';
  return 'yellow';
}

function IncidentBadge({ total }) {
  if (total >= 8) return <Badge variant="red">{total}</Badge>;
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
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [filterWorker, setFilterWorker] = useState('');
  const [tileCA, setTileCA] = useState(null);
  const toast = useToast();

  const [form, setForm] = useState({ worker_id: '', type: 'late_minor', date: '', notes: '' });

  useEffect(() => {
    Promise.all([getWorkers(), getIncidents()]).then(([w, i]) => {
      setWorkers(w.filter((wk) => wk.status === 'Active' || allIncidents.some((inc) => inc.worker_id === wk.id)));
      setAllIncidents(i);
      setLoading(false);
    });
  }, []);

  // Reload after adding
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

  // Build per-worker summaries
  const activeWorkers = workers.filter((w) => w.status === 'Active');
  const summaries = activeWorkers.map((w) => {
    const wInc = allIncidents.filter((i) => i.worker_id === w.id);
    return {
      worker: w,
      incidents: wInc,
      rolling: getRollingTotal(wInc),
      caLevel: getCurrentCALevel(wInc),
      ncns12mo: getNCNSCount(wInc, 365),
    };
  }).sort((a, b) => b.rolling - a.rolling);

  // CA-level tile counts
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">Rolling 6-month incident tracking · {displayed.length} workers shown</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Log Incident
        </Button>
      </div>

      {/* CA level tiles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filter by CA Level</p>
        <FilterTiles tiles={caTiles} selected={tileCA} onSelect={setTileCA} />
      </div>

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

      {/* Filter */}
      <select value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64">
        <option value="">All Active Workers</option>
        {activeWorkers.map((w) => (
          <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
        ))}
      </select>

      {/* Worker attendance rows */}
      <div className="space-y-3">
        {displayed.map(({ worker: w, incidents, rolling, caLevel, ncns12mo }) => (
          <Card key={w.id}>
            <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Link to={`/workers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                  {w.first_name} {w.last_name}
                </Link>
                <span className="text-xs text-gray-400">{w.department} · {w.supervisor}</span>
                {ncns12mo >= 2 && (
                  <Badge variant="red">NCNS ×{ncns12mo}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {caLevel && <Badge variant={caVariant(caLevel)}>{caLevel}</Badge>}
                <IncidentBadge total={rolling} />
                <Button size="sm" variant="secondary" onClick={() => {
                  setForm((f) => ({ ...f, worker_id: w.id }));
                  setModalOpen(true);
                }}>
                  <Plus size={12} /> Log
                </Button>
              </div>
            </div>

            {/* Incident rows */}
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
          </Card>
        ))}
      </div>

      {/* Add Incident Modal */}
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
