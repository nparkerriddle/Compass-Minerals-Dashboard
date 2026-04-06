import { useEffect, useState } from 'react';
import { getWorkers, getIncidents } from '../lib/api.js';
import { getRollingTotal } from '../lib/attendancePolicy.js';
import { getDaysWorked } from '../lib/wagePolicy.js';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, UserCheck, TrendingUp, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';

const STAT_THEMES = {
  blue:   { border: 'border-blue-500',   gradient: 'from-blue-50/70 to-white',   iconBg: 'bg-blue-500',   iconShadow: 'shadow-blue-200',   value: 'text-blue-600' },
  green:  { border: 'border-green-500',  gradient: 'from-green-50/70 to-white',  iconBg: 'bg-green-500',  iconShadow: 'shadow-green-200',  value: 'text-green-600' },
  yellow: { border: 'border-amber-400',  gradient: 'from-amber-50/70 to-white',  iconBg: 'bg-amber-400',  iconShadow: 'shadow-amber-200',  value: 'text-amber-600' },
  purple: { border: 'border-purple-500', gradient: 'from-purple-50/70 to-white', iconBg: 'bg-purple-500', iconShadow: 'shadow-purple-200', value: 'text-purple-600' },
};

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const t = STAT_THEMES[color] ?? STAT_THEMES.blue;
  return (
    <div className={`
      relative flex flex-col justify-between rounded-xl
      border border-gray-100 border-t-[3px] ${t.border}
      bg-gradient-to-br ${t.gradient}
      px-5 pt-4 pb-5 shadow-sm
      transition-all duration-200 ease-out
    `}>
      <div className="flex justify-end">
        <div className={`${t.iconBg} text-white p-2.5 rounded-lg shadow-md ${t.iconShadow}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-3">
        <p className={`text-3xl font-bold tracking-tight leading-none ${t.value}`}>{value}</p>
        <p className="mt-1.5 text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const HEADCOUNT_GOAL = 52;

export function AnalyticsPage() {
  const [workers, setWorkers] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorkers(), getIncidents()]).then(([w, i]) => {
      setWorkers(w);
      setAllIncidents(i);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  const active  = workers.filter((w) => w.status === 'Active');
  const termed  = workers.filter((w) => ['Termed', 'DNA'].includes(w.status));
  const all     = workers.length;

  // Headcount by department
  const deptCounts = active.reduce((acc, w) => {
    acc[w.department || 'Unknown'] = (acc[w.department || 'Unknown'] || 0) + 1;
    return acc;
  }, {});
  const deptData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Attrition by reason
  const reasonCounts = termed.reduce((acc, w) => {
    const r = w.term_reason || 'Unknown';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  const reasonData = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Status breakdown
  const statusCounts = workers.reduce((acc, w) => {
    acc[w.status || 'Unknown'] = (acc[w.status || 'Unknown'] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Season distribution (active only)
  const seasonCounts = active.reduce((acc, w) => {
    const s = `Season ${w.season_count || 1}`;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const seasonData = Object.entries(seasonCounts).sort().map(([name, value]) => ({ name, value }));

  // Wage distribution (active)
  const wageRanges = { '<$23': 0, '$23-$24': 0, '$24-$25': 0, '$25-$26': 0, '$26+': 0 };
  active.forEach((w) => {
    const wage = parseFloat(w.current_wage) || 0;
    if (wage < 23) wageRanges['<$23']++;
    else if (wage < 24) wageRanges['$23-$24']++;
    else if (wage < 25) wageRanges['$24-$25']++;
    else if (wage < 26) wageRanges['$25-$26']++;
    else wageRanges['$26+']++;
  });
  const wageData = Object.entries(wageRanges).map(([name, value]) => ({ name, value }));

  // Voluntary vs involuntary
  const volCount  = termed.filter((w) => w.voluntary_term === 'Yes').length;
  const involCount = termed.filter((w) => w.voluntary_term === 'No').length;
  const volData = [
    { name: 'Voluntary', value: volCount },
    { name: 'Involuntary', value: involCount },
    { name: 'Unknown', value: termed.length - volCount - involCount },
  ].filter((d) => d.value > 0);

  // Summary stats
  const avgDaysActive = active.length
    ? Math.round(active.reduce((s, w) => s + getDaysWorked(w.start_date), 0) / active.length)
    : 0;

  const retentionPct = all > 0 ? Math.round((active.length / all) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Workforce overview — Compass Minerals</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Workers"
          value={all}
          sub="All time"
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Active"
          value={`${active.length} / ${HEADCOUNT_GOAL}`}
          sub={`${Math.round((active.length / HEADCOUNT_GOAL) * 100)}% of goal`}
          icon={UserCheck}
          color={active.length >= HEADCOUNT_GOAL * 0.9 ? 'green' : 'yellow'}
        />
        <StatCard
          label="Retention Rate"
          value={`${retentionPct}%`}
          sub="Active / all time"
          icon={TrendingUp}
          color={retentionPct >= 70 ? 'green' : 'yellow'}
        />
        <StatCard
          label="Avg Days Active"
          value={`${avgDaysActive}d`}
          sub="Current active workers"
          icon={Clock}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Headcount by dept */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-gray-700">Active Headcount by Department</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-gray-700">Workers by Status</h2></CardHeader>
          <CardBody className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Attrition by reason */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-gray-700">Attrition by Reason</h2></CardHeader>
          <CardBody>
            {reasonData.length === 0 ? (
              <p className="text-sm text-gray-400">No termination data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reasonData} layout="vertical" margin={{ left: 110 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Season distribution */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-gray-700">Active Workers by Season</h2></CardHeader>
          <CardBody>
            {seasonData.length === 0 ? (
              <p className="text-sm text-gray-400">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={seasonData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Wage distribution */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-gray-700">Active Workers by Wage Range</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={wageData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Voluntary vs involuntary */}
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-gray-700">Voluntary vs Involuntary Attrition</h2></CardHeader>
          <CardBody className="flex items-center justify-center">
            {volData.length === 0 ? (
              <p className="text-sm text-gray-400">No termination data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={volData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {volData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
