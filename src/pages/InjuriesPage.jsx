import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getWorkers, getInjuries, createInjury } from '../lib/api.js';
import { DEPARTMENTS, SHIFTS, SUPERVISORS } from '../lib/constants.js';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'Unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(obj, n = 6) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

const OUTCOMES = ['Nothing', 'Warning', 'Sent Home', 'Missed Time', 'Termination', 'Medical Treatment', 'Hospitalization', 'Near Miss', 'Other'];

const EMPTY_FORM = {
  worker_id: '', first_name: '', last_name: '', date: '', time: '',
  department: '', shift: '', supervisor: '',
  outcome: '', notes: '',
};

function outcomeVariant(outcome) {
  if (!outcome) return 'gray';
  if (outcome === 'Termination' || outcome === 'Hospitalization') return 'red';
  if (outcome === 'Missed Time' || outcome === 'Medical Treatment') return 'orange';
  if (outcome === 'Sent Home') return 'yellow';
  if (outcome === 'Near Miss') return 'yellow';
  return 'gray';
}

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

  // Auto-fill worker info when a known worker is selected
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

  // ── Tile data ──────────────────────────────────────────────────────────────
  const bySupervisor = countBy(injuries, 'supervisor');
  const byDepartment = countBy(injuries, 'department');
  const byOutcome    = countBy(injuries, 'outcome');

  const supervisorTiles = topEntries(bySupervisor).map(([label, count]) => ({ label, count, value: label }));
  const deptTiles       = topEntries(byDepartment).map(([label, count]) => ({ label, count, value: label }));
  const outcomeTiles    = topEntries(byOutcome).map(([label, count]) => ({ label, count, value: label }));

  const filtered = injuries.filter((inj) => {
    if (!tileFilter.type) return true;
    if (tileFilter.type === 'supervisor')  return (inj.supervisor  || 'Unknown') === tileFilter.value;
    if (tileFilter.type === 'department')  return (inj.department  || 'Unknown') === tileFilter.value;
    if (tileFilter.type === 'outcome')     return (inj.outcome     || 'Unknown') === tileFilter.value;
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

      {/* Widget tiles */}
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">By Outcome</p>
        <FilterTiles
          tiles={outcomeTiles}
          selected={tileFilter.type === 'outcome' ? tileFilter.value : null}
          onSelect={(v) => handleTile('outcome', v)}
        />
      </div>

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Outcome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No incidents recorded.</td></tr>
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
                    <td className="px-4 py-2.5">
                      {inj.outcome
                        ? <Badge variant={outcomeVariant(inj.outcome)}>{inj.outcome}</Badge>
                        : <span className="text-gray-300">—</span>}
                    </td>
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
          <Select label="Supervisor" value={form.supervisor} onChange={set('supervisor')}>
            <option value="">Select…</option>
            {SUPERVISORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select label="Outcome" value={form.outcome} onChange={set('outcome')}>
            <option value="">Select…</option>
            {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
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
