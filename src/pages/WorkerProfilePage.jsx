import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, CheckCircle, XCircle, Clock, Save, X } from 'lucide-react';
import { getWorker, getIncidents, getNotes, createNote, deleteNote, updateWorker } from '../lib/api.js';
import { getRollingTotal, getActiveIncidents, getCurrentCALevel } from '../lib/attendancePolicy.js';
import { getDaysWorked, getWageSummary } from '../lib/wagePolicy.js';
import { HAUL_DEPARTMENTS } from '../lib/constants.js';
import { Badge, statusVariant } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { Textarea } from '../components/ui/Input.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { format, parseISO } from 'date-fns';

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function CheckItem({ label, done, date }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {done
        ? <CheckCircle size={15} className="text-green-500 shrink-0" />
        : <XCircle size={15} className="text-gray-300 shrink-0" />}
      <span className={`text-sm ${done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
      {date && <span className="ml-auto text-xs text-gray-400">{format(parseISO(date), 'MM/dd/yy')}</span>}
    </div>
  );
}

// Editable version of CheckItem used when checklist is in edit mode.
// boolField: the worker field name for boolean toggles (null if date-driven)
// dateField: the worker field name for the date (null if boolean-only)
function EditCheckItem({ label, boolField, dateField, draft, onChange }) {
  const isChecked = boolField ? !!draft[boolField] : !!draft[dateField];
  const dateVal = dateField ? (draft[dateField] || '') : '';

  const toggleCheck = () => {
    if (boolField && !dateField) {
      onChange({ [boolField]: !draft[boolField] });
    } else if (dateField) {
      // If toggling off, clear the date
      if (isChecked) {
        const patch = { [dateField]: '' };
        if (boolField) patch[boolField] = false;
        onChange(patch);
      } else {
        // Toggle on without a date — just mark the bool if present
        if (boolField) onChange({ [boolField]: true });
      }
    }
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <button type="button" onClick={toggleCheck} className="shrink-0">
        {isChecked
          ? <CheckCircle size={15} className="text-green-500" />
          : <XCircle size={15} className="text-gray-300 hover:text-gray-400" />}
      </button>
      <span className={`text-sm ${isChecked ? 'text-gray-700' : 'text-gray-400'} flex-1`}>{label}</span>
      {dateField && (
        <input
          type="date"
          value={dateVal}
          onChange={(e) => {
            const patch = { [dateField]: e.target.value };
            if (boolField) patch[boolField] = !!e.target.value;
            onChange(patch);
          }}
          className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400 w-32"
        />
      )}
    </div>
  );
}

export function WorkerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [worker, setWorker] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState({});

  useEffect(() => {
    Promise.all([getWorker(id), getIncidents(id), getNotes(id)]).then(([w, inc, n]) => {
      setWorker(w);
      setIncidents(inc);
      setNotes(n.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setLoading(false);
    });
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const note = await createNote({ worker_id: id, body: newNote.trim() });
    setNotes((prev) => [note, ...prev]);
    setNewNote('');
    toast({ message: 'Note added.' });
  };

  const handleDeleteNote = async (noteId) => {
    await deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const startEditChecklist = () => {
    setChecklistDraft({
      bg_date: worker.bg_date || '',
      dt_date: worker.dt_date || '',
      ffd_date: worker.ffd_date || '',
      photo_done: !!worker.photo_done,
      i9_date: worker.i9_date || '',
      everify_date: worker.everify_date || '',
      fcra_date: worker.fcra_date || '',
      orientation_date: worker.orientation_date || '',
      first_day_checkin: worker.first_day_checkin || '',
      thirty_day_checkin: worker.thirty_day_checkin || '',
      physical_date: worker.physical_date || '',
      physical_done: !!worker.physical_done,
      haul_truck_signoff: !!worker.haul_truck_signoff,
      stockpile_testing: !!worker.stockpile_testing,
      operator_signoff: !!worker.operator_signoff,
      training_signoff: !!worker.training_signoff,
    });
    setEditingChecklist(true);
  };

  const handleSaveChecklist = async () => {
    const updated = await updateWorker(id, checklistDraft);
    setWorker(updated);
    setEditingChecklist(false);
    toast({ message: 'Checklist saved.' });
  };

  if (loading) return <PageLoader />;
  if (!worker) return <div className="p-8 text-gray-500">Worker not found.</div>;

  const isHaul = HAUL_DEPARTMENTS.includes(worker.department);
  const rollingTotal = getRollingTotal(incidents);
  const caLevel = getCurrentCALevel(incidents);
  const wageSummary = getWageSummary(worker);
  const daysIn = getDaysWorked(worker.start_date, worker.term_date || undefined);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{worker.first_name} {worker.last_name}</h1>
            <Badge variant={statusVariant(worker.status)}>{worker.status}</Badge>
            {caLevel && <Badge variant="red">{caLevel}</Badge>}
          </div>
          <p className="text-sm text-gray-500">{worker.department} · {worker.supervisor}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/workers/${id}/edit`)}>
          <Edit size={14} /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">

          {/* Core info */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-700">Worker Info</h2></CardHeader>
            <CardBody className="grid grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="Bold ID"      value={worker.bold_id} />
                <InfoRow label="Assignment ID" value={worker.assignment_id} />
                <InfoRow label="Kronos #"     value={worker.kronos_id} />
                <InfoRow label="Phone"        value={worker.phone} />
                <InfoRow label="Email"        value={worker.email} />
                <InfoRow label="Birthday"     value={worker.birthday} />
              </div>
              <div>
                <InfoRow label="Shift"        value={worker.shift} />
                <InfoRow label="Start Date"   value={worker.start_date ? format(parseISO(worker.start_date), 'MM/dd/yyyy') : null} />
                <InfoRow label="Days Worked"  value={daysIn} />
                <InfoRow label="Season #"     value={worker.season_count || 1} />
                <InfoRow label="Current Wage" value={worker.current_wage ? `$${worker.current_wage}/hr` : null} />
                <InfoRow label="Intent to Return" value={worker.intent_to_return} />
                {worker.term_date && <InfoRow label="Term Date" value={format(parseISO(worker.term_date), 'MM/dd/yyyy')} />}
                {worker.term_reason && <InfoRow label="Term Reason" value={worker.term_reason} />}
              </div>
            </CardBody>
          </Card>

          {/* Onboarding checklist */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Onboarding Checklist</h2>
              {editingChecklist ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveChecklist}><Save size={13} /> Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingChecklist(false)}><X size={13} /> Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={startEditChecklist}><Edit size={13} /> Edit</Button>
              )}
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-x-8">
              {editingChecklist ? (
                <>
                  <div>
                    <EditCheckItem label="Background Check" dateField="bg_date"       draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="Drug Test"        dateField="dt_date"        draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="Fit for Duty"     dateField="ffd_date"       draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="Photo"            boolField="photo_done"     draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="I-9"              dateField="i9_date"        draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="E-Verify"         dateField="everify_date"   draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="FCRA"             dateField="fcra_date"      draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                  </div>
                  <div>
                    <EditCheckItem label="Orientation"        dateField="orientation_date"   draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="First Day Check-In" dateField="first_day_checkin"  draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    <EditCheckItem label="30-Day Check-In"    dateField="thirty_day_checkin" draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                    {isHaul ? (
                      <>
                        <EditCheckItem label="Physical (Haul)"     dateField="physical_date"    boolField="physical_done"    draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                        <EditCheckItem label="Haul Truck Sign-Off" boolField="haul_truck_signoff" draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                        <EditCheckItem label="Stockpile Testing"   boolField="stockpile_testing"  draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                        <EditCheckItem label="Operator Sign-Off"   boolField="operator_signoff"   draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                      </>
                    ) : (
                      <>
                        <EditCheckItem label="Training Sign-Off" boolField="training_signoff" draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                        <EditCheckItem label="Physical"          dateField="physical_date" boolField="physical_done" draft={checklistDraft} onChange={(p) => setChecklistDraft((d) => ({ ...d, ...p }))} />
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <CheckItem label="Background Check" done={!!worker.bg_date} date={worker.bg_date} />
                    <CheckItem label="Drug Test"        done={!!worker.dt_date}  date={worker.dt_date} />
                    <CheckItem label="Fit for Duty"     done={!!worker.ffd_date} date={worker.ffd_date} />
                    <CheckItem label="Photo"            done={!!worker.photo_done} />
                    <CheckItem label="I-9"              done={!!worker.i9_date}  date={worker.i9_date} />
                    <CheckItem label="E-Verify"         done={!!worker.everify_date} date={worker.everify_date} />
                    <CheckItem label="FCRA"             done={!!worker.fcra_date} date={worker.fcra_date} />
                  </div>
                  <div>
                    <CheckItem label="Orientation"      done={!!worker.orientation_date} date={worker.orientation_date} />
                    <CheckItem label="First Day Check-In" done={!!worker.first_day_checkin} date={worker.first_day_checkin} />
                    <CheckItem label="30-Day Check-In"  done={!!worker.thirty_day_checkin} date={worker.thirty_day_checkin} />
                    {isHaul ? (
                      <>
                        <CheckItem label="Physical (Haul)" done={!!worker.physical_date} date={worker.physical_date} />
                        <CheckItem label="Haul Truck Sign-Off" done={!!worker.haul_truck_signoff} />
                        <CheckItem label="Stockpile Testing"   done={!!worker.stockpile_testing} />
                        <CheckItem label="Operator Sign-Off"   done={!!worker.operator_signoff} />
                      </>
                    ) : (
                      <>
                        <CheckItem label="Training Sign-Off" done={!!worker.training_signoff} />
                        <CheckItem label="Physical"          done={!!worker.physical_date} date={worker.physical_date} />
                      </>
                    )}
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Attendance summary */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Attendance (Rolling 6 Months)</h2>
              <Link to="/attendance" className="text-xs text-brand-600 hover:underline">View full log</Link>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-6 mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{rollingTotal}</p>
                  <p className="text-xs text-gray-500">Incident total</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{caLevel || 'No action needed'}</p>
                  <p className="text-xs text-gray-500">Current CA level</p>
                </div>
              </div>
              {(worker.attendance_points > 0) && (
                <div className="flex items-center gap-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-md text-xs">
                  <span className="text-amber-700 font-medium">Roster baseline</span>
                  <span className="text-amber-600">{worker.attendance_points} pts imported from spreadsheet</span>
                  {rollingTotal > 0 && (
                    <span className="text-gray-500 ml-auto">+ {rollingTotal} logged = <span className="font-bold text-gray-700">{worker.attendance_points + rollingTotal} total</span></span>
                  )}
                </div>
              )}
              {incidents.length === 0 ? (
                <p className="text-sm text-gray-400">No incidents recorded.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {getActiveIncidents(incidents).map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                      <span className="text-gray-600">{inc.label || inc.type}</span>
                      <span className="text-gray-400">{format(parseISO(inc.date), 'MM/dd/yy')}</span>
                      <span className="font-medium text-gray-700">{inc.weight} pt{inc.weight !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Wage summary */}
          {wageSummary && (
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-700">Wage</h2></CardHeader>
              <CardBody className="space-y-2">
                <InfoRow label="Starting Wage"  value={`$${wageSummary.starting_wage}/hr`} />
                <InfoRow label="Current Wage"   value={`$${wageSummary.current_wage}/hr`} />
                <InfoRow label="Wage Cap"       value={`$${wageSummary.cap}/hr`} />
                <InfoRow label="Headroom"       value={wageSummary.atCap ? 'At cap' : `+$${wageSummary.headroom}`} />
                <InfoRow label="Season #"       value={wageSummary.season_count} />
                {!wageSummary.past90 && (
                  <p className="text-xs text-yellow-600 mt-1">90-day raise eligible in {90 - wageSummary.daysIn} days</p>
                )}
                {wageSummary.past90 && !worker.ninety_day_raise_given && (
                  <p className="text-xs text-green-600 font-medium mt-1">90-day raise due — check eligibility</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-700">Notes</h2></CardHeader>
            <CardBody className="space-y-3">
              <Textarea
                rows={3}
                placeholder="Add a note…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
              <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                {notes.map((n) => (
                  <div key={n.id} className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs text-gray-500 mb-1">{format(parseISO(n.created_at), 'MM/dd/yy h:mm a')}</p>
                    <p className="text-sm text-gray-800">{n.body}</p>
                    <button onClick={() => handleDeleteNote(n.id)} className="text-xs text-red-400 hover:text-red-600 mt-1">Delete</button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  );
}
