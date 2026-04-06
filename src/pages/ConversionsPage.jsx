import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkers } from '../lib/api.js';
import { getDaysWorked } from '../lib/wagePolicy.js';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TEAL  = '#0d9488';
const BLUE  = '#3b82f6';
const SLATE = '#64748b';
const DAY_BUCKET_COLORS = ['#14b8a6', '#0d9488', '#0f766e', '#134e4a'];

export function ConversionsPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkers().then((w) => { setWorkers(w); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  const converted = workers
    .filter((w) => w.status === 'T/H')
    .sort((a, b) => new Date(b.converted_date || b.term_date || 0) - new Date(a.converted_date || a.term_date || 0));

  const potential = workers
    .filter((w) => w.status === 'Active' && getDaysWorked(w.start_date) >= 90)
    .sort((a, b) => getDaysWorked(b.start_date) - getDaysWorked(a.start_date));

  const avgDays = converted.length
    ? Math.round(converted.reduce((s, w) => s + getDaysWorked(w.start_date, w.converted_date || w.term_date || undefined), 0) / converted.length)
    : 0;

  // ── Chart data ─────────────────────────────────────────────────────────────

  const deptCounts = converted.reduce((acc, w) => {
    const d = w.department || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deptChartData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const supCounts = converted.reduce((acc, w) => {
    const s = w.supervisor || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const supChartData = Object.entries(supCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const daysBuckets = { '<90d': 0, '90–180d': 0, '181–365d': 0, '1yr+': 0 };
  converted.forEach((w) => {
    const days = getDaysWorked(w.start_date, w.converted_date || w.term_date || undefined);
    if (days < 90)       daysBuckets['<90d']++;
    else if (days < 181) daysBuckets['90–180d']++;
    else if (days < 366) daysBuckets['181–365d']++;
    else                 daysBuckets['1yr+']++;
  });
  const daysData = Object.entries(daysBuckets)
    .map(([name, value]) => ({ name, value }));

  const monthData = (() => {
    const counts = {};
    converted.forEach((w) => {
      const raw = w.converted_date || w.term_date;
      if (!raw) return;
      const d = parseISO(raw);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yy');
      if (!counts[key]) counts[key] = { name: label, value: 0 };
      counts[key].value++;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  })();

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

      {/* Charts */}
      {converted.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* By Department */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Conversions by Department</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptChartData} layout="vertical" margin={{ left: 90, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => [v, 'Conversions']} />
                  <Bar dataKey="value" fill={TEAL} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* By Supervisor */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Conversions by Supervisor</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={supChartData} layout="vertical" margin={{ left: 110, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v) => [v, 'Conversions']} />
                  <Bar dataKey="value" fill={BLUE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Days to Conversion */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Days Worked Before Conversion</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daysData} margin={{ right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Workers']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {daysData.map((_, i) => (
                      <Cell key={i} fill={DAY_BUCKET_COLORS[i % DAY_BUCKET_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Monthly trend */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Conversions by Month</h2>
            </CardHeader>
            <CardBody>
              {monthData.length === 0
                ? <p className="text-sm text-gray-400">No dated conversions.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthData} margin={{ right: 16 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, 'Conversions']} />
                      <Bar dataKey="value" fill={SLATE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

        </div>
      )}

      {/* Converted workers */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Converted to Permanent</h2>
          <Badge variant="teal">{converted.length}</Badge>
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
              {converted.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No conversions recorded.</td></tr>
              )}
              {converted.map((w) => (
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
                    {w.converted_date
                      ? format(parseISO(w.converted_date), 'MM/dd/yy')
                      : w.term_date
                        ? format(parseISO(w.term_date), 'MM/dd/yy')
                        : '—'}
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

      {/* Active 90+ days (potential conversions) */}
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
              {potential.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/workers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                      {w.first_name} {w.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{w.department}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.supervisor || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {w.start_date ? format(parseISO(w.start_date), 'MM/dd/yy') : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{getDaysWorked(w.start_date)}</td>
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
    </div>
  );
}
