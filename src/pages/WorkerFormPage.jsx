// Add / Edit Worker form
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getWorker, createWorker, updateWorker } from '../lib/api.js';
import {
  DEPARTMENTS, SHIFTS, SUPERVISORS, STATUSES,
  INTENT_TO_RETURN, FFD_TYPES, HAUL_DEPARTMENTS,
} from '../lib/constants.js';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageLoader } from '../components/ui/LoadingSpinner.jsx';

const EMPTY = {
  first_name: '', last_name: '', bold_id: '', assignment_id: '', kronos_id: '',
  phone: '', email: '', birthday: '',
  status: 'Pending', department: '', shift: '', supervisor: '',
  start_date: '', term_date: '', term_reason: '', voluntary_term: '',
  starting_wage: '', current_wage: '', season_count: 1,
  intent_to_return: '', notes: '',
  // Onboarding
  bg_date: '', bg_expiration: '', dt_date: '', ffd_date: '', ffd_type: 'Standard',
  photo_done: false, i9_date: '', everify_date: '', everify_case: '', fcra_date: '',
  orientation_date: '', first_day_checkin: '', thirty_day_checkin: '',
  training_signoff: false, physical_date: '',
  // Haul-specific
  haul_truck_signoff: false, stockpile_testing: false, operator_signoff: false,
  ninety_day_raise_given: false,
  // Flags
  night_differential: false, weekend_differential: false,
};

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-gray-700">{title}</h2></CardHeader>
      <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </CardBody>
    </Card>
  );
}

function CheckField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export function WorkerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = !!id && id !== 'new';
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getWorker(id).then((w) => {
      if (w) setForm({ ...EMPTY, ...w });
      setLoading(false);
    });
  }, [id, isEdit]);

  const set = (field) => (e) => {
    const val = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      toast({ message: 'First and last name are required.', type: 'error' });
      return;
    }
    setSaving(true);
    if (isEdit) {
      await updateWorker(id, form);
      toast({ message: 'Worker updated.' });
      navigate(`/workers/${id}`);
    } else {
      const created = await createWorker(form);
      toast({ message: 'Worker added.' });
      navigate(`/workers/${created.id}`);
    }
    setSaving(false);
  };

  if (loading) return <PageLoader />;

  const isHaul = HAUL_DEPARTMENTS.includes(form.department);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Worker' : 'Add Worker'}</h1>
      </div>

      <Section title="Personal Info">
        <Input label="First Name *" value={form.first_name} onChange={set('first_name')} required />
        <Input label="Last Name *"  value={form.last_name}  onChange={set('last_name')}  required />
        <Input label="Phone"        value={form.phone}       onChange={set('phone')} type="tel" />
        <Input label="Email"        value={form.email}       onChange={set('email')} type="email" />
        <Input label="Birthday"     value={form.birthday}    onChange={set('birthday')} type="date" />
      </Section>

      <Section title="Placement">
        <Input label="Bold ID"       value={form.bold_id}       onChange={set('bold_id')} />
        <Input label="Assignment ID" value={form.assignment_id} onChange={set('assignment_id')} />
        <Input label="Kronos #"      value={form.kronos_id}     onChange={set('kronos_id')} />
        <Select label="Status" value={form.status} onChange={set('status')}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select label="Department" value={form.department} onChange={set('department')}>
          <option value="">Select…</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select label="Shift" value={form.shift} onChange={set('shift')}>
          <option value="">Select…</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select label="Supervisor" value={form.supervisor} onChange={set('supervisor')}>
          <option value="">Select…</option>
          {SUPERVISORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Input label="Start Date" value={form.start_date} onChange={set('start_date')} type="date" />
        <Input label="Season #"   value={form.season_count} onChange={set('season_count')} type="number" min={1} />
      </Section>

      <Section title="Wage">
        <Input label="Starting Wage ($/hr)" value={form.starting_wage} onChange={set('starting_wage')} type="number" step="0.25" />
        <Input label="Current Wage ($/hr)"  value={form.current_wage}  onChange={set('current_wage')}  type="number" step="0.25" />
        <div className="flex flex-col gap-3 pt-6">
          <CheckField label="Night differential (+$0.80/hr)" checked={form.night_differential} onChange={set('night_differential')} />
          <CheckField label="Weekend differential (+$2.00/hr)" checked={form.weekend_differential} onChange={set('weekend_differential')} />
          <CheckField label="90-day raise given" checked={form.ninety_day_raise_given} onChange={set('ninety_day_raise_given')} />
        </div>
      </Section>

      <Section title="Onboarding">
        <Input label="BG Date"       value={form.bg_date}       onChange={set('bg_date')}       type="date" />
        <Input label="BG Expiration" value={form.bg_expiration} onChange={set('bg_expiration')} type="date" />
        <Input label="Drug Test Date" value={form.dt_date}      onChange={set('dt_date')}       type="date" />
        <Input label="FFD Date"      value={form.ffd_date}      onChange={set('ffd_date')}      type="date" />
        <Select label="FFD Type" value={form.ffd_type} onChange={set('ffd_type')}>
          {FFD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="I-9 Date"      value={form.i9_date}       onChange={set('i9_date')}       type="date" />
        <Input label="E-Verify Date" value={form.everify_date}  onChange={set('everify_date')}  type="date" />
        <Input label="E-Verify Case #" value={form.everify_case} onChange={set('everify_case')} />
        <Input label="FCRA Date"     value={form.fcra_date}     onChange={set('fcra_date')}     type="date" />
        <Input label="Orientation Date" value={form.orientation_date} onChange={set('orientation_date')} type="date" />
        <Input label="First Day Check-In" value={form.first_day_checkin} onChange={set('first_day_checkin')} type="date" />
        <Input label="30-Day Check-In"    value={form.thirty_day_checkin} onChange={set('thirty_day_checkin')} type="date" />

        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
          <CheckField label="Photo Done" checked={form.photo_done} onChange={set('photo_done')} />
          {isHaul ? (
            <>
              <Input label="Physical Date (Haul)" value={form.physical_date} onChange={set('physical_date')} type="date" />
              <CheckField label="Haul Truck Sign-Off"  checked={form.haul_truck_signoff} onChange={set('haul_truck_signoff')} />
              <CheckField label="Stockpile Testing Passed" checked={form.stockpile_testing} onChange={set('stockpile_testing')} />
              <CheckField label="Operator Sign-Off"   checked={form.operator_signoff}   onChange={set('operator_signoff')} />
            </>
          ) : (
            <>
              <Input label="Physical Date" value={form.physical_date} onChange={set('physical_date')} type="date" />
              <CheckField label="Training Sign-Off" checked={form.training_signoff} onChange={set('training_signoff')} />
            </>
          )}
        </div>
      </Section>

      <Section title="Separation (if applicable)">
        <Input label="Term Date" value={form.term_date} onChange={set('term_date')} type="date" />
        <Select label="Term Reason" value={form.term_reason} onChange={set('term_reason')}>
          <option value="">—</option>
          {['Attendance','Safety','Misconduct','NCNS','Walked Off Job','Denied/Failed DT','Other Job','Dislike Job','Health','Personal','Transportation','Scheduling Issues','Wage','Hired Perm','Performance','Near Miss','Accident','Not Allowed Back','New Job','Other'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
        <Select label="Voluntary?" value={form.voluntary_term} onChange={set('voluntary_term')}>
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Select>
        <Select label="Intent to Return" value={form.intent_to_return} onChange={set('intent_to_return')}>
          <option value="">—</option>
          {INTENT_TO_RETURN.map((v) => <option key={v} value={v}>{v}</option>)}
        </Select>
      </Section>

      <div className="flex justify-end gap-3 pb-6">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Worker'}</Button>
      </div>
    </form>
  );
}
