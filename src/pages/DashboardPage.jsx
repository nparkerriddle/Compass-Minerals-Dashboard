import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, Clock, UserCheck, UserX, Zap } from 'lucide-react';
import { getWorkers } from '../lib/api.js';
import { getIncidents } from '../lib/api.js';
import { getRollingTotal, getActiveIncidents } from '../lib/attendancePolicy.js';
import { getDaysWorked } from '../lib/wagePolicy.js';
import { Card, CardBody } from '../components/ui/Card.jsx';
import { Badge, statusVariant } from '../components/ui/Badge.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';

const HEADCOUNT_GOAL = 52;

function StatCard({ label, value, sub, icon: Icon, color = 'blue', to }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const content = (
    <Card className="flex items-center gap-4 px-5 py-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

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

  const active      = workers.filter((w) => w.status === 'Active');
  const pending     = workers.filter((w) => w.status === 'Pending');
  const waitlist    = workers.filter((w) => ['Wait List', 'Furlough'].includes(w.status));
  const termed      = workers.filter((w) => ['Termed', 'DNA'].includes(w.status));

  // Workers approaching attendance thresholds (within 1 point of a CA level)
  const atRisk = active.filter((w) => {
    const wIncidents = allIncidents.filter((i) => i.worker_id === w.id);
    const total = getRollingTotal(wIncidents);
    return total >= 2; // flag at 2+ (one more could trigger verbal)
  });

  // Workers with 90-day raise due (past 90 days, no raise recorded yet)
  const raiseDue = active.filter((w) => {
    if (!w.start_date || w.ninety_day_raise_given) return false;
    return getDaysWorked(w.start_date) >= 90;
  });

  // Workers with BG expiring within 7 days
  const bgExpiring = workers
    .filter((w) => w.status === 'Pending' && w.bg_expiration)
    .filter((w) => {
      const daysLeft = differenceInDays(parseISO(w.bg_expiration), new Date());
      return daysLeft >= 0 && daysLeft <= 7;
    });

  // Upcoming orientations (next 7 days)
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
          color="yellow"
          to="/attendance"
        />
      </div>

      {/* Action items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Raise eligibility */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">90-Day Raises Due</h2>
            <Badge variant={raiseDue.length > 0 ? 'yellow' : 'gray'}>{raiseDue.length}</Badge>
          </div>
          <CardBody className="p-0">
            {raiseDue.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No raises currently due.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {raiseDue.slice(0, 8).map((w) => (
                  <li key={w.id} className="px-5 py-2.5 flex items-center justify-between">
                    <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                      {w.first_name} {w.last_name}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {getDaysWorked(w.start_date)} days in · {w.department}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* BG expiring soon */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Background Checks Expiring (7 days)</h2>
            <Badge variant={bgExpiring.length > 0 ? 'red' : 'gray'}>{bgExpiring.length}</Badge>
          </div>
          <CardBody className="p-0">
            {bgExpiring.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No BGs expiring soon.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {bgExpiring.map((w) => {
                  const daysLeft = differenceInDays(parseISO(w.bg_expiration), new Date());
                  return (
                    <li key={w.id} className="px-5 py-2.5 flex items-center justify-between">
                      <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                        {w.first_name} {w.last_name}
                      </Link>
                      <span className={`text-xs font-medium ${daysLeft <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                        Expires in {daysLeft}d
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Orientation this week */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Orientations This Week</h2>
            <Badge variant={orientationSoon.length > 0 ? 'blue' : 'gray'}>{orientationSoon.length}</Badge>
          </div>
          <CardBody className="p-0">
            {orientationSoon.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No orientations scheduled this week.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {orientationSoon.map((w) => (
                  <li key={w.id} className="px-5 py-2.5 flex items-center justify-between">
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
          </CardBody>
        </Card>

        {/* Attendance at-risk */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Attendance At-Risk</h2>
            <Badge variant={atRisk.length > 0 ? 'yellow' : 'gray'}>{atRisk.length}</Badge>
          </div>
          <CardBody className="p-0">
            {atRisk.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No at-risk workers.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {atRisk.slice(0, 8).map((w) => {
                  const wIncidents = allIncidents.filter((i) => i.worker_id === w.id);
                  const total = getRollingTotal(wIncidents);
                  return (
                    <li key={w.id} className="px-5 py-2.5 flex items-center justify-between">
                      <Link to={`/workers/${w.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                        {w.first_name} {w.last_name}
                      </Link>
                      <span className={`text-xs font-semibold ${total >= 7 ? 'text-red-600' : total >= 5 ? 'text-orange-600' : total >= 3 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {total} pts
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Headcount bar */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Headcount by Department</h2>
        </div>
        <CardBody>
          <DeptBreakdown workers={active} />
        </CardBody>
      </Card>
    </div>
  );
}

function DeptBreakdown({ workers }) {
  const counts = workers.reduce((acc, w) => {
    acc[w.department] = (acc[w.department] || 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  if (sorted.length === 0) return <p className="text-sm text-gray-400">No active workers.</p>;

  return (
    <div className="space-y-2">
      {sorted.map(([dept, count]) => (
        <div key={dept} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-36 shrink-0">{dept}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}
