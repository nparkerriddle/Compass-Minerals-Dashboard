import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { getWorkers } from '../lib/api.js';
import { DEPARTMENTS, SUPERVISORS, STATUSES, SHIFTS } from '../lib/constants.js';
import { getDaysWorked } from '../lib/wagePolicy.js';
import { Badge, statusVariant } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';

export function WorkerListPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [tileDept, setTileDept] = useState(null);
  const [tileStatus, setTileStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getWorkers().then((w) => { setWorkers(w); setLoading(false); });
  }, []);

  const filtered = workers.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || `${w.first_name} ${w.last_name}`.toLowerCase().includes(q)
      || (w.bold_id || '').toString().includes(q)
      || (w.phone || '').includes(q);
    const matchStatus = !filterStatus || w.status === filterStatus;
    const matchDept   = !filterDept   || w.department === filterDept;
    const matchSup    = !filterSupervisor || w.supervisor === filterSupervisor;
    const matchShift  = !filterShift  || w.shift === filterShift;
    const matchTileDept   = !tileDept   || w.department === tileDept;
    const matchTileStatus = !tileStatus || w.status === tileStatus;
    return matchSearch && matchStatus && matchDept && matchSup && matchShift && matchTileDept && matchTileStatus;
  });

  // Tile counts (always from full workers list so tiles don't zero out)
  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = workers.filter((w) => w.status === s).length;
    return acc;
  }, {});
  const deptCounts = workers
    .filter((w) => w.status === 'Active')
    .reduce((acc, w) => {
      const d = w.department || 'Unknown';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

  const statusTiles = STATUSES.filter((s) => statusCounts[s] > 0).map((s) => ({
    label: s, count: statusCounts[s], value: s,
  }));
  const deptTiles = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, value: label }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500">{filtered.length} of {workers.length} workers</p>
        </div>
        <Button onClick={() => navigate('/workers/new')}>
          <Plus size={15} /> Add Worker
        </Button>
      </div>

      {/* Widget tiles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">By Status</p>
        <FilterTiles tiles={statusTiles} selected={tileStatus} onSelect={setTileStatus} />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Active by Department</p>
        <FilterTiles tiles={deptTiles} selected={tileDept} onSelect={setTileDept} />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Name, Bold ID, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterSupervisor} onChange={(e) => setFilterSupervisor(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Supervisors</option>
          {SUPERVISORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Shifts</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Bold ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Shift</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Supervisor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Season</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Days</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Wage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400">No workers found.</td>
              </tr>
            )}
            {filtered.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/workers/${w.id}`)}>
                <td className="px-4 py-3 font-medium text-brand-700">
                  {w.first_name} {w.last_name}
                </td>
                <td className="px-4 py-3 text-gray-500">{w.bold_id || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{w.phone || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{w.department || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{w.shift || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{w.supervisor || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-center">{w.season_count || 1}</td>
                <td className="px-4 py-3 text-gray-500">
                  {w.start_date ? getDaysWorked(w.start_date, w.term_date || undefined) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {w.current_wage ? `$${w.current_wage}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
