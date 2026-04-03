import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWorkers, updateWorker } from '../lib/api.js';
import { DEPARTMENTS, INTENT_TO_RETURN } from '../lib/constants.js';
import { Badge, statusVariant } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { FilterTiles } from '../components/ui/FilterTiles.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { format, parseISO } from 'date-fns';
import { Phone, RotateCcw } from 'lucide-react';

export function WaitlistFurloughPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tileDept, setTileDept] = useState(null);
  const [tileIntent, setTileIntent] = useState(null);
  const [tileStatus, setTileStatus] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => getWorkers().then((w) => { setWorkers(w); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleReactivate = async (worker) => {
    await updateWorker(worker.id, { status: 'Active', intent_to_return: '' });
    toast({ message: `${worker.first_name} ${worker.last_name} reactivated.` });
    load();
  };

  const handleInactive = async (worker) => {
    await updateWorker(worker.id, { status: 'Inactive - No Response' });
    toast({ message: `${worker.first_name} ${worker.last_name} marked inactive.`, type: 'warning' });
    load();
  };

  if (loading) return <PageLoader />;

  const allPool = workers.filter((w) => ['Wait List','Furlough','Pending','Inactive - No Response'].includes(w.status));
  const waitlist   = allPool.filter((w) => w.status === 'Wait List');
  const furloughed = allPool.filter((w) => w.status === 'Furlough');
  const pending    = allPool.filter((w) => w.status === 'Pending');
  const inactive   = allPool.filter((w) => w.status === 'Inactive - No Response');

  // Tiles
  const deptCounts = allPool.reduce((acc, w) => {
    const d = w.department || 'Unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deptTiles = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, value: label }));

  const intentCounts = furloughed.reduce((acc, w) => {
    const v = w.intent_to_return || 'Not Asked';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  const intentTiles = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, value: label }));

  const statusTiles = [
    { label: 'Furloughed', value: 'Furlough',               count: furloughed.length },
    { label: 'Wait List',  value: 'Wait List',              count: waitlist.length },
    { label: 'Pending',    value: 'Pending',                count: pending.length },
    { label: 'No Response',value: 'Inactive - No Response', count: inactive.length },
  ].filter((t) => t.count > 0);

  const filterWorkers = (list) => list.filter((w) => {
    const matchDept   = !tileDept   || (w.department || 'Unknown') === tileDept;
    const matchIntent = !tileIntent || (w.intent_to_return || 'Not Asked') === tileIntent;
    const matchStatus = !tileStatus || w.status === tileStatus;
    return matchDept && matchIntent && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Waitlist & Furlough</h1>
        <p className="text-sm text-gray-500">
          {waitlist.length} on waitlist · {furloughed.length} furloughed · {pending.length} pending
        </p>
      </div>

      {/* Widget tiles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">By Status</p>
        <FilterTiles tiles={statusTiles} selected={tileStatus} onSelect={(v) => { setTileStatus(v); setTileDept(null); setTileIntent(null); }} />
        {deptTiles.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">By Department</p>
            <FilterTiles tiles={deptTiles} selected={tileDept} onSelect={(v) => { setTileDept(v); setTileStatus(null); }} />
          </>
        )}
        {intentTiles.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Intent to Return (Furloughed)</p>
            <FilterTiles tiles={intentTiles} selected={tileIntent} onSelect={(v) => { setTileIntent(v); setTileStatus(null); }} />
          </>
        )}
      </div>

      {/* Furloughed */}
      <WorkerTable
        title="Furloughed"
        workers={filterWorkers(furloughed)}
        showIntent
        onReactivate={handleReactivate}
        onMarkInactive={handleInactive}
        navigate={navigate}
      />

      {/* Waitlist */}
      <WorkerTable
        title="Wait List"
        workers={filterWorkers(waitlist)}
        onReactivate={handleReactivate}
        onMarkInactive={handleInactive}
        navigate={navigate}
      />

      {/* Pending (in onboarding pipeline) */}
      <WorkerTable
        title="Pending / Onboarding"
        workers={filterWorkers(pending)}
        navigate={navigate}
      />

      {/* Inactive - no response */}
      {inactive.length > 0 && (
        <WorkerTable
          title="Inactive — No Response"
          workers={filterWorkers(inactive)}
          onReactivate={handleReactivate}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function WorkerTable({ title, workers, showIntent, onReactivate, onMarkInactive, navigate }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <Badge variant="gray">{workers.length}</Badge>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dept</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pref. Shift</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Bold ID</th>
              {showIntent && <th className="text-left px-4 py-3 font-medium text-gray-600">Intent</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Season #</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workers.length === 0 && (
              <tr><td colSpan={8} className="text-center py-6 text-gray-400">None.</td></tr>
            )}
            {workers.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link to={`/workers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                    {w.first_name} {w.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{w.phone || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{w.department || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{w.shift || '—'}</td>
                <td className="px-4 py-2.5 text-gray-400">{w.bold_id || '—'}</td>
                {showIntent && (
                  <td className="px-4 py-2.5">
                    {w.intent_to_return
                      ? <Badge variant={w.intent_to_return === 'Yes' ? 'green' : w.intent_to_return === 'No' ? 'red' : 'yellow'}>{w.intent_to_return}</Badge>
                      : <span className="text-gray-300">—</span>}
                  </td>
                )}
                <td className="px-4 py-2.5 text-gray-500">{w.season_count || 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2 justify-end">
                    {onReactivate && (
                      <Button size="sm" onClick={() => onReactivate(w)}>
                        <RotateCcw size={12} /> Activate
                      </Button>
                    )}
                    {onMarkInactive && (
                      <Button size="sm" variant="secondary" onClick={() => onMarkInactive(w)}>
                        No Response
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
