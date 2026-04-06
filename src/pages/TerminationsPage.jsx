import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkers } from '../lib/api.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';
import { Search, ShieldOff } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const REASON_COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#06b6d4','#8b5cf6','#ec4899','#64748b'];
const VOL_COLORS = ['#10b981', '#ef4444'];

export function TerminationsPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('termed'); // 'termed' | 'dna'
  const navigate = useNavigate();

  useEffect(() => {
    getWorkers().then((w) => { setWorkers(w); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  const termed = workers.filter((w) => w.status === 'Termed');
  const dna    = workers.filter((w) => w.status === 'DNA');
  const list   = tab === 'dna' ? dna : termed;

  // ── Chart data ────────────────────────────────────────────────────────────

  const reasonCounts = list.reduce((acc, w) => {
    const r = w.term_reason || 'Unknown';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  const reasonChartData = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const volData = [
    { name: 'Voluntary',   value: list.filter((w) => w.voluntary_term === 'Yes').length },
    { name: 'Involuntary', value: list.filter((w) => w.voluntary_term === 'No').length },
    { name: 'Unknown',     value: list.filter((w) => !w.voluntary_term || (w.voluntary_term !== 'Yes' && w.voluntary_term !== 'No')).length },
  ].filter((d) => d.value > 0);

  const deptCounts = list.reduce((acc, w) => {
    const d = w.department || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deptChartData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const monthData = (() => {
    const counts = {};
    list.forEach((w) => {
      const raw = w.term_date;
      if (!raw) return;
      const key   = format(parseISO(raw), 'yyyy-MM');
      const label = format(parseISO(raw), 'MMM yy');
      if (!counts[key]) counts[key] = { name: label, value: 0 };
      counts[key].value++;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  })();

  // ── Filtered table ────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filtered = list.filter((w) =>
    !q
    || `${w.first_name} ${w.last_name}`.toLowerCase().includes(q)
    || (w.bold_id || '').toString().includes(q)
    || (w.phone || '').includes(q)
    || (w.term_reason || '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Terminations & DNA</h1>
          <p className="text-sm text-gray-500">{termed.length} termed · {dna.length} DNA · {filtered.length} shown</p>
        </div>
      </div>

      {/* DNA alert box */}
      {tab === 'dna' && (
        <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-4 items-start">
          <ShieldOff size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Do Not Assign Registry</p>
            <p className="text-xs text-red-600 mt-0.5">
              These workers are permanently flagged. Always cross-check Bold ID and name/phone when adding new workers.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('termed')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === 'termed' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          Termed ({termed.length})
        </button>
        <button
          onClick={() => setTab('dna')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === 'dna' ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          DNA ({dna.length})
        </button>
      </div>

      {/* Charts */}
      {list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* By Term Reason */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">By Term Reason</h2>
            </CardHeader>
            <CardBody>
              {reasonChartData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={reasonChartData} layout="vertical" margin={{ left: 110, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip formatter={(v) => [v, 'Workers']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {reasonChartData.map((_, i) => (
                          <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* Voluntary vs Involuntary */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Voluntary vs Involuntary</h2>
            </CardHeader>
            <CardBody className="flex items-center justify-center">
              {volData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={volData}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {volData.map((_, i) => (
                          <Cell key={i} fill={VOL_COLORS[i % VOL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Workers']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* By Department */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">By Department</h2>
            </CardHeader>
            <CardBody>
              {deptChartData.length === 0
                ? <p className="text-sm text-gray-400">No data.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptChartData} layout="vertical" margin={{ left: 90, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v) => [v, 'Workers']} />
                      <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

          {/* Monthly trend */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Monthly Trend</h2>
            </CardHeader>
            <CardBody>
              {monthData.length === 0
                ? <p className="text-sm text-gray-400">No dated terminations.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthData} margin={{ right: 16 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, 'Terminations']} />
                      <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardBody>
          </Card>

        </div>
      )}

      {/* Search */}
      <div className="relative w-72">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Name, Bold ID, reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bold ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Term Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Voluntary</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Intent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Season</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No records.</td></tr>
              )}
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/workers/${w.id}`)}>
                  <td className="px-4 py-2.5 font-medium text-brand-700">{w.first_name} {w.last_name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{w.bold_id || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.department || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">{w.start_date ? format(parseISO(w.start_date), 'MM/dd/yy') : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{w.term_date ? format(parseISO(w.term_date), 'MM/dd/yy') : '—'}</td>
                  <td className="px-4 py-2.5">
                    {w.term_reason
                      ? <Badge variant={w.term_reason === 'Hired Perm' ? 'teal' : w.status === 'DNA' ? 'red' : 'gray'}>{w.term_reason}</Badge>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{w.voluntary_term || '—'}</td>
                  <td className="px-4 py-2.5">
                    {w.intent_to_return
                      ? <Badge variant={w.intent_to_return === 'Yes' ? 'green' : 'gray'}>{w.intent_to_return}</Badge>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{w.season_count || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
