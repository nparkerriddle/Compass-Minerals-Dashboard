import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, Clock, UserCheck, UserX, Zap, ChevronRight } from 'lucide-react';
import { getWorkers, getIncidents } from '../lib/api.js';
import { getRollingTotal } from '../lib/attendancePolicy.js';
import { getDaysWorked } from '../lib/wagePolicy.js';
import { Card, CardBody } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { differenceInDays, parseISO, format } from 'date-fns';

const HEADCOUNT_GOAL = 52;

// ─── Stat Card ────────────────────────────────────────────────────────────────

const THEMES = {
  blue: {
    border:     'border-blue-500',
    gradient:   'from-blue-50/70 to-white',
    iconBg:     'bg-blue-500',
    iconShadow: 'shadow-blue-200',
    value:      'text-blue-600',
  },
  green: {
    border:     'border-green-500',
    gradient:   'from-green-50/70 to-white',
    iconBg:     'bg-green-500',
    iconShadow: 'shadow-green-200',
    value:      'text-green-600',
  },
  yellow: {
    border:     'border-amber-400',
    gradient:   'from-amber-50/70 to-white',
    iconBg:     'bg-amber-400',
    iconShadow: 'shadow-amber-200',
    value:      'text-amber-600',
  },
  red: {
    border:     'border-red-500',
    gradient:   'from-red-50/70 to-white',
    iconBg:     'bg-red-500',
    iconShadow: 'shadow-red-200',
    value:      'text-red-600',
  },
  purple: {
    border:     'border-purple-500',
    gradient:   'from-purple-50/70 to-white',
    iconBg:     'bg-purple-500',
    iconShadow: 'shadow-purple-200',
    value:      'text-purple-600',
  },
};

function StatCard({ label, value, sub, icon: Icon, color = 'blue', to }) {
  const t = THEMES[color] ?? THEMES.blue;

  const content = (
    <div
      className={`
        relative flex flex-col justify-between rounded-xl h-40
        border border-gray-100 border-t-[3px] ${t.border}
        bg-gradient-to-br ${t.gradient}
        px-5 pt-4 pb-5 shadow-sm
        transition-all duration-200 ease-out
        hover:shadow-lg hover:-translate-y-0.5
      `}
    >
      {/* Icon — top right */}
      <div className="flex justify-end">
        <div className={`${t.iconBg} text-white p-2.5 rounded-lg shadow-md ${t.iconShadow}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>

      {/* Value + label */}
      <div className="mt-3">
        <p className={`text-3xl font-bold tracking-tight leading-none ${t.value}`}>{value}</p>
        <p className="mt-1.5 text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>

      {to && <ChevronRight size={14} className="absolute bottom-4 right-4 text-gray-300" />}
    </div>
  );

  return to ? <Link to={to} className="block">{content}</Link> : content;
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, badge, badgeVariant = 'gray', children }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
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

  const active   = workers.filter((w) => w.status === 'Active');
  const pending  = workers.filter((w) => w.status === 'Pending');
  const waitlist = workers.filter((w) => ['Wait List', 'Furlough'].includes(w.status));

  const atRisk = active.filter((w) => {
    const total = getRollingTotal(allIncidents.filter((i) => i.worker_id === w.id));
    return total >= 2;
  });

  const raiseDue = active.filter((w) => {
    if (!w.start_date || w.ninety_day_raise_given) return false;
    return getDaysWorked(w.start_date) >= 90;
  });

  const bgExpiring = workers
    .filter((w) => w.status === 'Pending' && w.bg_expiration)
    .filter((w) => {
      const d = differenceInDays(parseISO(w.bg_expiration), new Date());
      return d >= 0 && d <= 7;
    });

  const orientationSoon = workers.filter((w) => {
    if (!w.orientation_date) return false;
    const d = differenceInDays(parseISO(w.orientation_date), new Date());
    return d >= 0 && d <= 7;
  });

  const headcountPct = Math.round((active.length / HEADCOUNT_GOAL) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Compass Minerals — Ogden Site</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Workers"
          value={active.length}
          sub={`Goal: ${HEADCOUNT_GOAL} (${headcountPct}%)`}
          icon={Users}
          color={headcountPct >= 90 ? 'green' : headcountPct >= 70 ? 'yellow' : 'red'}
          to="/workers"
        />
        <StatCard
          label="Pending / Onboarding"
          value={pending.length}
          icon={Clock}
          color="blue"
          to="/onboarding"
        />
        <StatCard
          label="Waitlist / Furlough"
          value={waitlist.length}
          icon={Zap}
          color="purple"
          to="/waitlist"
        />
        <StatCard
          label="At-Risk Attendance"
          value={atRisk.length}
          sub="2+ incidents (rolling 6mo)"
          icon={AlertTriangle}
          color={atRisk.length > 0 ? 'yellow' : 'green'}
          to="/attendance"
        />
      </div>

      {/* Action items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SectionCard
          title="90-Day Raises Due"
          badge={raiseDue.length}
          badgeVariant={raiseDue.length > 0 ? 'yellow' : 'gray'}
        >
          {raiseDue.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No raises currently due.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {raiseDue.slice(0, 8).map((w) => (
                <li key={w.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                    {w.first_name} {w.last_name}
                  </Link>
                  <span className="text-xs text-gray-400">
                    {getDaysWorked(w.start_date)}d in · {w.department}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Background Checks Expiring (7 days)"
          badge={bgExpiring.length}
          badgeVariant={bgExpiring.length > 0 ? 'red' : 'gray'}
        >
          {bgExpiring.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No BGs expiring soon.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {bgExpiring.map((w) => {
                const daysLeft = differenceInDays(parseISO(w.bg_expiration), new Date());
                return (
                  <li key={w.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                      {w.first_name} {w.last_name}
                    </Link>
                    <span className={`text-xs font-semibold ${daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                      Expires in {daysLeft}d
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Orientations This Week"
          badge={orientationSoon.length}
          badgeVariant={orientationSoon.length > 0 ? 'blue' : 'gray'}
        >
          {orientationSoon.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No orientations scheduled this week.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {orientationSoon.map((w) => (
                <li key={w.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                    {w.first_name} {w.last_name}
                  </Link>
                  <span className="text-xs text-gray-400">
                    {format(parseISO(w.orientation_date), 'MMM d')} · {w.department}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Attendance At-Risk"
          badge={atRisk.length}
          badgeVariant={atRisk.length > 0 ? 'yellow' : 'gray'}
        >
          {atRisk.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No at-risk workers.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {atRisk.slice(0, 8).map((w) => {
                const total = getRollingTotal(allIncidents.filter((i) => i.worker_id === w.id));
                return (
                  <li key={w.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                      {w.first_name} {w.last_name}
                    </Link>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      total >= 7 ? 'bg-red-100 text-red-700'    :
                      total >= 5 ? 'bg-orange-100 text-orange-700' :
                      total >= 3 ? 'bg-amber-100 text-amber-700'  :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {total} pts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Headcount by department */}
      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Headcount by Department</h2>
          <span className="text-xs text-gray-400">{active.length} active</span>
        </div>
        <CardBody>
          <DeptBreakdown workers={active} />
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Dept Breakdown ───────────────────────────────────────────────────────────

function DeptBreakdown({ workers }) {
  const counts = workers.reduce((acc, w) => {
    acc[w.department] = (acc[w.department] || 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  if (sorted.length === 0) return <p className="text-sm text-gray-400">No active workers.</p>;

  return (
    <div className="space-y-2.5">
      {sorted.map(([dept, count]) => (
        <div key={dept} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-36 shrink-0">{dept}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 w-5 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}
