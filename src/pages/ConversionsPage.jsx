import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkers } from '../lib/api.js';
import { getDaysWorked } from '../lib/wagePolicy.js';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';

export function ConversionsPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tileDept, setTileDept] = useState(null);
  const [tileSup, setTileSup] = useState(null);

  useEffect(() => {
    getWorkers().then((w) => { setWorkers(w); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  // T/H = workers who converted to perm (status = T/H)
  const converted = workers.filter((w) => w.status === 'T/H')
    .sort((a, b) => new Date(b.converted_date || b.term_date || 0) - new Date(a.converted_date || a.term_date || 0));

  // Active workers who may be conversion candidates (long tenure, good standing)
  const potential = workers.filter((w) => w.status === 'Active' && getDaysWorked(w.start_date) >= 90);

  // Tile data (from converted list)
  const deptCounts = converted.reduce((acc, w) => {
    const d = w.department || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const supCounts = converted.reduce((acc, w) => {
    const s = w.supervisor || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const deptTiles = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, value: label }));
  const supTiles  = Object.entries(supCounts).sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, value: label }));

  const avgDays = converted.length
    ? Math.round(converted.reduce((s, w) => s + getDaysWorked(w.start_date, w.converted_date || w.term_date || undefined), 0) / converted.length)
    : 0;

  const filteredConverted = converted.filter((w) => {
    const matchDept = !tileDept || (w.department || 'Unknown') === tileDept;
    const matchSup  = !tileSup  || (w.supervisor  || 'Unknown') === tileSup;
    return matchDept && matchSup;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Conversions</h1>
        <p className="text-sm text-gray-500">
          {converted.length} converted · avg {avgDays} days before perm · {potential.length} active 90+ days
        </p>
      </div>

      <div className="flex gap-3 bg-teal-50 border border-teal-200 rounded-lg p-4 items-start">
        <ArrowRightLeft size={18} className="text-teal-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-teal-800">Conversion Process</p>
          <p className="text-xs text-teal-700 mt-0.5">
            When a worker is hired permanently, update their status to T/H and record the conversion date.
            Converted workers remain in the system for historical tracking.
          </p>
        </div>
      </div>

      {/* Widget tiles */}
      {deptTiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversions by Department</p>
          <FilterTiles tiles={deptTiles} selected={tileDept} onSelect={(v) => { setTileDept(v); setTileSup(null); }} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Conversions by Supervisor</p>
          <FilterTiles tiles={supTiles}  selected={tileSup}  onSelect={(v) => { setTileSup(v);  setTileDept(null); }} />
        </div>
      )}

      {/* Converted workers */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Converted to Permanent</h2>
          <Badge variant="teal">{filteredConverted.length}</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bold ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Shift</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supervisor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Converted</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Days Worked</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Season</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Final Wage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredConverted.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No conversions recorded.</td></tr>
              )}
              {filteredConverted.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/workers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                      {w.first_name} {w.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{w.bold_id || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.department}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.shift || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.supervisor || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {w.start_date ? format(parseISO(w.start_date), 'MM/dd/yy') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {w.converted_date ? format(parseISO(w.converted_date), 'MM/dd/yy') : w.term_date ? format(parseISO(w.term_date), 'MM/dd/yy') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {getDaysWorked(w.start_date, w.converted_date || w.term_date || undefined)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{w.season_count || 1}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {w.current_wage ? `$${w.current_wage}/hr` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Potential conversions */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Active Workers 90+ Days</h2>
          <Badge variant="blue">{potential.length}</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supervisor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Days In</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Season</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Current Wage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {potential.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-gray-400">No qualifying workers.</td></tr>
              )}
              {potential.sort((a, b) => getDaysWorked(b.start_date) - getDaysWorked(a.start_date)).map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/workers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                      {w.first_name} {w.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{w.department}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.supervisor || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">{w.start_date ? format(parseISO(w.start_date), 'MM/dd/yy') : '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{getDaysWorked(w.start_date)}</td>
                  <td className="px-4 py-2.5 text-gray-400">{w.season_count || 1}</td>
                  <td className="px-4 py-2.5 text-gray-700">{w.current_wage ? `$${w.current_wage}/hr` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
