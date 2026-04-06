import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getWorkers, getInjuries, createInjury } from '../lib/api.js';
import { DEPARTMENTS, SHIFTS, SUPERVISORS } from '../lib/constants.js';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const SHIFT_COLORS = ['#f97316','#ef4444','#3b82f6','#8b5cf6','#10b981','#f59e0b','#06b6d4','#84cc16','#ec4899'];

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'Unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(obj, n = 8) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

const EMPTY_FORM = {
  worker_id: '', first_name: '', last_name: '', date: '', time: '',
  department: '', shift: '', supervisor: '', notes: '',
};

export function InjuriesPage() {
  const [workers, setWorkers] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tileFilter, setTileFilter] = useState({ type: null, value: null });
  const toast = useToast();

  const load = () => Promise.all([getWorkers(), getInjuries()]).then(([w, i]) => {
    setWorkers(w);
    setInjuries(i.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setLoading(false);
  });

  useEffect(() => { load(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleWorkerSelect = (workerId) => {
    const w = workers.find((wk) => wk.id === workerId);
    if (w) {
      setForm((f) => ({
        ...f,
        worker_id: workerId,
        first_name: w.first_name,
        last_name: w.last_name,
        department: w.department || '',
        shift: w.shift || '',
        supervisor: w.supervisor || '',
      }));
    } else {
      setForm((f) => ({ ...f, worker_id: workerId }));
    }
  };

  const handleAdd = async () => {
    if (!form.date) {
      toast({ message: 'Date is required.', type: 'error' });
      return;
    }
    await createInjury(form);
    toast({ message: 'Incident recorded.' });
    setModalOpen(false);
    setForm(EMPTY_FORM);
    load();
  };

  if (loading) return <PageLoader />;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const byDept       = countBy(injuries, 'department');
  const bySupervisor = countBy(injuries, 'supervisor');
  const byShift      = countBy(injuries, 'shift');

  const deptChartData = topEntries(byDept).map(([name, value]) => ({ name, value }));
  const supChartData  = topEntries(bySupervisor).map(([name, value]) => ({ name, value }));
  const shiftChartData = Object.entries(byShift).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const monthData = (() => {
    const counts = {};
    injuries.forEach((inj) => {
      if (!inj.date) return;
      const d = parseISO(inj.date);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yy');
      if (!counts[key]) counts[key] = { name: label, value: 0 };
      counts[key].value++;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  })();

  // ── Tile data ──────────────────────────────────────────────────────────────
  const supervisorTiles = topEntries(bySupervisor, 6).map(([label, count]) => ({ label, count, value: label, color: 'red' }));
  const deptTiles       = topEntries(byDept, 6).map(([label, count]) => ({ label, count, value: label, color: 'orange' }));

  const filtered = injuries.filter((inj) => {
    if (!tileFilter.type) return true;
    if (tileFilter.type === 'supervisor') return (inj.supervisor || 'Unknown') === tileFilter.value;
    if (tileFilter.type === 'department') return (inj.department || 'Unknown') === tileFilter.value;
    return true;
  });

  const handleTile = (type, value) => {
    setTileFilter((prev) => prev.type === type && prev.value === value ? { type: null, value: null } : { type, value });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Injuries & Incidents</h1>
          <p className="text-sm text-gray-500">
            {filtered.length}{filtered.length !== injuries.length ? ` of ${injuries.length}` : ''} records
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Log Incident
        </Button>
      </div>

      {/* Charts */}
      {injuries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* By Department */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Incidents by Department</h2>
            </CardHeader>
            <CardBody>
              {deptChartData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptChartData} layout="vertical" margin={{ left: 90, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v) => [v, 'Incidents']} />
                      <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* By Supervisor */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Incidents by Supervisor</h2>
            </CardHeader>
            <CardBody>
              {supChartData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={supChartData} layout="vertical" margin={{ left: 110, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip formatter={(v) => [v, 'Incidents']} />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* By Shift */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Incidents by Shift</h2>
            </CardHeader>
            <CardBody className="flex items-center justify-center">
              {shiftChartData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={shiftChartData}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {shiftChartData.map((_, i) => (
                          <Cell key={i} fill={SHIFT_COLORS[i % SHIFT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Incidents']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* Monthly trend */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Monthly Incident Trend</h2>
            </CardHeader>
            <CardBody>
              {monthData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
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

        </div>
      )}

      {/* Filter tiles */}
      {injuries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">By Supervisor</p>
          <FilterTiles
            tiles={supervisorTiles}
            selected={tileFilter.type === 'supervisor' ? tileFilter.value : null}
            onSelect={(v) => handleTile('supervisor', v)}
          />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">By Department</p>
          <FilterTiles
            tiles={deptTiles}
            selected={tileFilter.type === 'department' ? tileFilter.value : null}
            onSelect={(v) => handleTile('department', v)}
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Worker</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Shift</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supervisor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No incidents recorded.</td></tr>
              )}
              {filtered.map((inj) => {
                const worker = workers.find((w) => w.id === inj.worker_id);
                const name = worker
                  ? `${worker.first_name} ${worker.last_name}`
                  : [inj.first_name, inj.last_name].filter(Boolean).join(' ') || '—';
                return (
                  <tr key={inj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">
                      {inj.date ? format(parseISO(inj.date), 'MM/dd/yy') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{inj.time || '—'}</td>
                    <td className="px-4 py-2.5">
                      {worker
                        ? <Link to={`/workers/${worker.id}`} className="font-medium text-brand-700 hover:underline">{name}</Link>
                        : <span className="font-medium text-gray-700">{name}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{inj.department || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400">{inj.shift || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{inj.supervisor || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 max-w-xs truncate">{inj.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Incident Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Injury / Incident" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select label="Worker (if in system)" value={form.worker_id} onChange={(e) => handleWorkerSelect(e.target.value)}>
              <option value="">Select or leave blank for manual entry…</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.first_name} {w.last_name} — {w.department}</option>
              ))}
            </Select>
          </div>
          <Input label="First Name" value={form.first_name} onChange={set('first_name')} />
          <Input label="Last Name"  value={form.last_name}  onChange={set('last_name')} />
          <Input label="Date *"  type="date" value={form.date}  onChange={set('date')} />
          <Input label="Time"    type="time" value={form.time}  onChange={set('time')} />
          <Select label="Department" value={form.department} onChange={set('department')}>
            <option value="">Select…</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Shift" value={form.shift} onChange={set('shift')}>
            <option value="">Select…</option>
            {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div className="col-span-2">
            <Select label="Supervisor" value={form.supervisor} onChange={set('supervisor')}>
              <option value="">Select…</option>
              {SUPERVISORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="col-span-2">
            <Textarea label="Notes" rows={4} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Log Incident</Button>
        </div>
      </Modal>
    </div>
  );
}
