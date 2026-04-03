import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkers } from '../lib/api.js';
import { differenceInDays, parseISO, format } from 'date-fns';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { AlertTriangle, CheckCircle } from 'lucide-react';

// Determine what a pending worker is still waiting on
function getBlockers(w) {
  const blockers = [];
  if (!w.bg_date) blockers.push('BG');
  if (!w.dt_date)  blockers.push('DT');
  if (!w.ffd_date) blockers.push('FFD');
  if (!w.photo_done) blockers.push('Photo');
  if (!w.i9_date)  blockers.push('I-9');
  if (!w.everify_date) blockers.push('E-Verify');
  return blockers;
}

function isOrientationReady(w) {
  return !!w.bg_date && !!w.dt_date && !!w.ffd_date && !!w.photo_done && !!w.i9_date;
}

function isOrientationScheduled(w) {
  return isOrientationReady(w) && !!w.orientation_date;
}

function isActive(w) {
  return w.status === 'Active';
}

// Columns for the pipeline
function PipelineColumn({ title, workers, color, emptyMsg }) {
  const colors = {
    red:    'bg-red-500',
    yellow: 'bg-yellow-400',
    blue:   'bg-blue-500',
    green:  'bg-green-500',
  };
  return (
    <div className="flex-1 min-w-0">
      <div className={`h-1 rounded-t-md ${colors[color]}`} />
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <Badge variant="gray">{workers.length}</Badge>
        </div>
        <div className="p-3 space-y-2 min-h-[200px]">
          {workers.length === 0 && <p className="text-xs text-gray-400 px-1 pt-1">{emptyMsg}</p>}
          {workers.map((w) => (
            <PipelineCard key={w.id} worker={w} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ worker: w }) {
  const blockers = getBlockers(w);
  const bgDaysLeft = w.bg_expiration
    ? differenceInDays(parseISO(w.bg_expiration), new Date())
    : null;

  return (
    <Link to={`/workers/${w.id}`} className="block bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md p-3 transition-colors">
      <p className="text-sm font-medium text-gray-900">{w.first_name} {w.last_name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{w.department} · {w.shift || '—'}</p>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {blockers.map((b) => (
            <span key={b} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
              <AlertTriangle size={10} /> {b}
            </span>
          ))}
        </div>
      )}

      {/* BG expiration warning */}
      {bgDaysLeft !== null && bgDaysLeft <= 7 && (
        <p className={`text-xs mt-1.5 font-medium ${bgDaysLeft <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
          BG expires in {bgDaysLeft}d
        </p>
      )}

      {/* Orientation date */}
      {w.orientation_date && (
        <p className="text-xs text-blue-600 mt-1">
          Orientation: {format(parseISO(w.orientation_date), 'MMM d')}
        </p>
      )}
    </Link>
  );
}

export function OnboardingPipelinePage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tileDept, setTileDept] = useState(null);
  const [tileBlocker, setTileBlocker] = useState(null);

  useEffect(() => {
    getWorkers().then((w) => { setWorkers(w); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  const pending = workers.filter((w) => w.status === 'Pending');

  // Stage 1: Still waiting on blockers, no orientation scheduled
  const waitingOnDocs = pending.filter((w) => !isOrientationReady(w) && !w.orientation_date);

  // Stage 2: Ready for orientation but not yet scheduled
  const readyForOrientation = pending.filter((w) => isOrientationReady(w) && !w.orientation_date);

  // Stage 3: Orientation scheduled (has a date in the future or recent past)
  const orientationScheduled = pending.filter((w) => isOrientationScheduled(w));

  // Stage 4: Orientation done, first day pending
  const firstDayPending = pending.filter(
    (w) => !!w.orientation_date && !w.first_day_checkin,
  ).concat(
    workers.filter((w) => w.status === 'Active' && !!w.orientation_date && !w.first_day_checkin)
  );

  // Tile data
  const BLOCKER_KEYS = ['BG', 'DT', 'FFD', 'Photo', 'I-9', 'E-Verify'];
  const blockerCounts = BLOCKER_KEYS.reduce((acc, b) => {
    acc[b] = pending.filter((w) => getBlockers(w).includes(b)).length;
    return acc;
  }, {});
  const blockerTiles = Object.entries(blockerCounts)
    .filter(([, c]) => c > 0)
    .map(([label, count]) => ({ label, count, value: label }));

  const deptCounts = pending.reduce((acc, w) => {
    const d = w.department || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deptTiles = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, value: label }));

  const stageTiles = [
    { label: 'Waiting on Docs',       value: 'docs',      count: waitingOnDocs.length },
    { label: 'Ready for Orientation', value: 'ready',     count: readyForOrientation.length },
    { label: 'Orientation Scheduled', value: 'scheduled', count: orientationScheduled.length },
    { label: 'First Day Pending',     value: 'firstday',  count: firstDayPending.length },
  ].filter((t) => t.count > 0);

  const filterByTile = (list) => {
    if (tileDept)    return list.filter((w) => (w.department || 'Unknown') === tileDept);
    if (tileBlocker) return list.filter((w) => getBlockers(w).includes(tileBlocker));
    return list;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Onboarding Pipeline</h1>
        <p className="text-sm text-gray-500">{pending.length} pending candidates</p>
      </div>

      {/* Widget tiles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pipeline Stage</p>
        <FilterTiles tiles={stageTiles} selected={null} onSelect={() => {}} />
        {deptTiles.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">By Department</p>
            <FilterTiles tiles={deptTiles} selected={tileDept} onSelect={(v) => { setTileDept(v); setTileBlocker(null); }} />
          </>
        )}
        {blockerTiles.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Blocked By</p>
            <FilterTiles tiles={blockerTiles} selected={tileBlocker} onSelect={(v) => { setTileBlocker(v); setTileDept(null); }} />
          </>
        )}
      </div>

      {/* Pipeline columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <PipelineColumn
          title="Waiting on Docs"
          workers={filterByTile(waitingOnDocs)}
          color="red"
          emptyMsg="No candidates blocked."
        />
        <PipelineColumn
          title="Ready for Orientation"
          workers={filterByTile(readyForOrientation)}
          color="yellow"
          emptyMsg="None ready yet."
        />
        <PipelineColumn
          title="Orientation Scheduled"
          workers={filterByTile(orientationScheduled)}
          color="blue"
          emptyMsg="None scheduled."
        />
        <PipelineColumn
          title="First Day Pending"
          workers={filterByTile(firstDayPending)}
          color="green"
          emptyMsg="All checked in."
        />
      </div>

      {/* Full pending list */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-gray-700">All Pending Candidates</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">BG</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">DT</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">FFD</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Photo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">I-9</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Orientation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Set Up By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filterByTile(pending).length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No pending candidates.</td></tr>
              )}
              {filterByTile(pending).map((w) => {
                const check = (val) => val
                  ? <CheckCircle size={14} className="text-green-500" />
                  : <span className="text-gray-300 text-xs">—</span>;
                return (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/workers/${w.id}`} className="font-medium text-brand-600 hover:underline">
                        {w.first_name} {w.last_name}
                      </Link>
                      <p className="text-xs text-gray-400">{w.phone}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{w.department}</td>
                    <td className="px-4 py-2.5">{check(w.bg_date)}</td>
                    <td className="px-4 py-2.5">{check(w.dt_date)}</td>
                    <td className="px-4 py-2.5">{check(w.ffd_date)}</td>
                    <td className="px-4 py-2.5">{check(w.photo_done)}</td>
                    <td className="px-4 py-2.5">{check(w.i9_date)}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {w.orientation_date ? format(parseISO(w.orientation_date), 'MMM d') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{w.setup_by || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
