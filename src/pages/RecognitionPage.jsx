import { useState, useEffect } from 'react';
import { Gift, Calendar, Coffee, ChevronDown, ChevronRight, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Textarea } from '../components/ui/Input.jsx';
import { getWorkers, getHolidayRecords, upsertHolidayRecord, getBreakfastChecklist, saveBreakfastChecklist } from '../lib/api.js';

const TABS = [
  { id: 'birthdays',  label: 'Birthdays',       icon: Gift },
  { id: 'holidays',   label: 'Holidays',         icon: Calendar },
  { id: 'breakfast',  label: 'Spring Breakfast', icon: Coffee },
];

// ─── Birthday Helpers ─────────────────────────────────────────────────────────

function getDaysUntilBirthday(birthdayStr) {
  if (!birthdayStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(birthdayStr + 'T00:00:00');
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

function formatBirthday(birthdayStr) {
  if (!birthdayStr) return '';
  const d = new Date(birthdayStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ─── Holidays Data ────────────────────────────────────────────────────────────

const HOLIDAYS = [
  {
    key: 'new_years',
    name: "New Year's Day",
    date: 'January 1',
    suggestions: ['Send a personalized New Year card to each worker', 'Bring in a treat bag with snacks and a small note', 'Post a thank-you message on the site bulletin board'],
  },
  {
    key: 'valentines',
    name: "Valentine's Day",
    date: 'February 14',
    suggestions: ['Bring in a box of chocolates or candy for the break room', 'Leave a thank-you card on each locker', 'Small gift card drawing for active workers'],
  },
  {
    key: 'st_patricks',
    name: "St. Patrick's Day",
    date: 'March 17',
    suggestions: ['Green-themed snacks or donuts in the break room', 'Small shamrock treat bags', 'Lucky draw for a gift card'],
  },
  {
    key: 'easter',
    name: 'Easter',
    date: 'Variable (March–April)',
    suggestions: ['Easter candy in the break room', 'Small gift bags with a personal note', 'Gift card raffle'],
  },
  {
    key: 'mothers_day',
    name: "Mother's Day",
    date: 'Second Sunday of May',
    suggestions: ['Acknowledge working mothers on-site with a card or small gift', 'Bring in flowers or a sweet treat'],
  },
  {
    key: 'memorial_day',
    name: 'Memorial Day',
    date: 'Last Monday of May',
    suggestions: ['Send a message honoring veterans in the workforce', 'Bring in a patriotic-themed treat', 'Post a recognition note on the bulletin board'],
  },
  {
    key: 'fathers_day',
    name: "Father's Day",
    date: 'Third Sunday of June',
    suggestions: ['Acknowledge working fathers with a card or treat', 'Small gift card drawing'],
  },
  {
    key: 'independence_day',
    name: 'Independence Day',
    date: 'July 4',
    suggestions: ['Red, white & blue snack bags', 'Patriotic cookie tray in the break room', 'Early shift treat drop-off for night crews'],
  },
  {
    key: 'labor_day',
    name: 'Labor Day',
    date: 'First Monday of September',
    suggestions: ['Recognize workers with a personal thank-you note', 'Bring in a treat or snack spread', 'Highlight a worker of the month'],
  },
  {
    key: 'halloween',
    name: 'Halloween',
    date: 'October 31',
    suggestions: ['Candy bags in the break room', 'Small pumpkin or Halloween treat for each worker', 'Costume contest (casual, optional)'],
  },
  {
    key: 'veterans_day',
    name: "Veterans Day",
    date: 'November 11',
    suggestions: ['Honor veteran workers with a personalized thank-you card', 'Post a recognition message on-site', 'Small gift card for any active veterans on staff'],
  },
  {
    key: 'thanksgiving',
    name: 'Thanksgiving',
    date: 'Fourth Thursday of November',
    suggestions: ['Bring in a pie or fall-themed treat spread', 'Send a personalized thank-you card to every active worker', 'Give away a grocery gift card to a few workers'],
  },
  {
    key: 'christmas',
    name: 'Christmas',
    date: 'December 25',
    suggestions: ['Christmas gift bags for each active worker', 'Candy and snack spread in the break room', 'Gift card drawing', 'Personal holiday card from manager'],
  },
];

// ─── Breakfast Supply List ────────────────────────────────────────────────────

const SUPPLY_LIST = [
  { key: 'pancake_mix',    label: 'Krusteaz Pancake Mix',    qty: '5–6 bags' },
  { key: 'bacon',          label: 'Bacon (Pre-Cooked)',       qty: '28 packages total' },
  { key: 'sausage',        label: 'Sausage (Pre-Cooked)',     qty: '22 packages total' },
  { key: 'fruit',          label: 'Pre-Cut Fruit',           qty: '3 platters per day' },
  { key: 'syrup',          label: 'Syrup',                   qty: '6–8 jugs total' },
  { key: 'syrup_sf',       label: 'Sugar-Free Syrup',        qty: '2 jugs total' },
  { key: 'oj',             label: 'Orange Juice',            qty: '7 jugs per day' },
  { key: 'water',          label: 'Water',                   qty: '3 cases total' },
  { key: 'plates',         label: 'Paper Plates',            qty: '400 count total' },
  { key: 'butter',         label: 'Butter',                  qty: '1 large (main), 1 small (Salt Plant)' },
  { key: 'spray_butter',   label: 'Spray Butter',            qty: '2 cans total' },
  { key: 'tablecloths',    label: 'Table Cloths',            qty: '6 total' },
  { key: 'metal_pans',     label: 'Metal Pans',              qty: '20 total' },
  { key: 'whisk',          label: 'Whisk / Egg Beater',      qty: '1' },
  { key: 'coffers',        label: 'Coffers (propane)',        qty: '3 total' },
  { key: 'lighter',        label: 'Lighter',                 qty: '1' },
  { key: 'tongs',          label: 'Tongs',                   qty: '5 total' },
  { key: 'spatula',        label: 'Spatula',                 qty: '2 total' },
  { key: 'utensils',       label: 'Forks & Knives',          qty: 'Enough for 400 people' },
  { key: 'measuring_cup',  label: 'Measuring Cup',           qty: '1' },
  { key: 'mixing_bowl',    label: 'Mixing Bowl',             qty: '1' },
];

const PREP_CHECKLIST = [
  { key: 'notify_1mo',   label: 'Notify HR (Taryn / Sherry) 1 month in advance so they can announce to the site',  when: '1 month before' },
  { key: 'notify_execs', label: 'Notify YES executives for volunteers to help cook',                                when: '1 month before' },
  { key: 'get_grill',    label: 'Ask Sherry for grill and griddle',                                                when: '1 week before' },
  { key: 'arrive',       label: 'Arrive on site',                                                                  when: '5:15 am' },
  { key: 'tables',       label: 'Tables set up',                                                                   when: '5:45 am' },
  { key: 'light_grill',  label: 'Light coffers and grill',                                                         when: '5:45 am' },
  { key: 'mix_onsite',   label: 'Make pancake mix onsite (DO NOT transport pre-mixed batter)',                      when: '~6:00 am' },
  { key: 'cook',         label: 'Start cooking — preheat bacon & sausage in microwaves, finish on grill',          when: '6:00–6:15 am' },
  { key: 'salt_drop',    label: 'Take 3 tins of pancakes, sausage, and bacon to Salt Plant',                       when: 'During service' },
  { key: 'wrap_up',      label: 'All done and wrapped up',                                                         when: 'By 9:00 am' },
  { key: 'griddle',      label: 'Take griddle home and scrub it clean',                                            when: 'After event' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HolidayCard({ holiday, record, onSave }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(record?.what_was_done || '');
  const [saving, setSaving] = useState(false);
  const year = new Date().getFullYear();

  const handleSave = async () => {
    setSaving(true);
    await onSave(holiday.key, year, { what_was_done: notes });
    setSaving(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-gray-800">{holiday.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{holiday.date}</p>
        </div>
        <div className="flex items-center gap-2">
          {record?.what_was_done && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Logged</span>
          )}
          {open
            ? <ChevronDown size={15} className="text-gray-400 shrink-0" />
            : <ChevronRight size={15} className="text-gray-400 shrink-0" />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Suggestions</p>
            <ul className="space-y-1">
              {holiday.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="mt-0.5 text-brand-400">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">What we did ({year})</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what was done to celebrate or recognize this holiday…"
              rows={3}
            />
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

function CheckItem({ checked, label, subtext, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
    >
      {checked
        ? <CheckSquare size={16} className="text-brand-600 shrink-0 mt-0.5" />
        : <Square size={16} className="text-gray-300 shrink-0 mt-0.5" />
      }
      <div>
        <p className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RecognitionPage() {
  const [activeTab, setActiveTab] = useState('birthdays');
  const [workers, setWorkers] = useState([]);
  const [holidayRecords, setHolidayRecords] = useState([]);
  const [checklist, setChecklist] = useState({});

  useEffect(() => {
    getWorkers().then(setWorkers);
    getHolidayRecords().then(setHolidayRecords);
    getBreakfastChecklist().then(setChecklist);
  }, []);

  // ── Birthdays ──────────────────────────────────────────────────────────────

  const withBirthdays = workers
    .filter(w => w.birthday && ['Active', 'Pending', 'Furlough'].includes(w.status))
    .map(w => ({ ...w, daysUntil: getDaysUntilBirthday(w.birthday) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const upcoming = withBirthdays.filter(w => w.daysUntil <= 7);

  // ── Holiday helpers ────────────────────────────────────────────────────────

  const getRecord = (key) => {
    const year = new Date().getFullYear();
    return holidayRecords.find(r => r.holiday_key === key && r.year === year) || null;
  };

  const handleHolidaySave = async (holidayKey, year, patch) => {
    await upsertHolidayRecord(holidayKey, year, patch);
    const updated = await getHolidayRecords();
    setHolidayRecords(updated);
  };

  // ── Breakfast checklist ────────────────────────────────────────────────────

  const toggleCheck = async (key) => {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    await saveBreakfastChecklist(next);
  };

  const resetChecklist = async () => {
    setChecklist({});
    await saveBreakfastChecklist({});
  };

  const supplyDone = SUPPLY_LIST.filter(i => checklist[i.key]).length;
  const prepDone   = PREP_CHECKLIST.filter(i => checklist[i.key]).length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Recognition</h1>
        <p className="text-sm text-gray-500 mt-0.5">Birthdays, holidays, and annual events.</p>
      </div>

      {/* Upcoming birthday banner */}
      {upcoming.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {upcoming.length === 1 ? 'Upcoming birthday' : `${upcoming.length} upcoming birthdays`} within the next 7 days
            </p>
            <ul className="mt-1 space-y-0.5">
              {upcoming.map(w => (
                <li key={w.id} className="text-sm text-amber-700">
                  <span className="font-medium">{w.first_name} {w.last_name}</span>
                  {' — '}
                  {formatBirthday(w.birthday)}
                  {w.daysUntil === 0 ? ' (Today!)' : w.daysUntil === 1 ? ' (Tomorrow)' : ` (in ${w.daysUntil} days)`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Birthdays tab ── */}
      {activeTab === 'birthdays' && (
        <div>
          {withBirthdays.length === 0 ? (
            <p className="text-sm text-gray-500">No active workers have a birthday on file. Add birthdays on worker profiles.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Birthday</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Department</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Coming Up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withBirthdays.map(w => (
                    <tr key={w.id} className={w.daysUntil <= 7 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {w.first_name} {w.last_name}
                        {w.daysUntil <= 7 && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Soon</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{formatBirthday(w.birthday)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{w.department || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {w.daysUntil === 0 ? 'Today!' : w.daysUntil === 1 ? 'Tomorrow' : `${w.daysUntil} days`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Holidays tab ── */}
      {activeTab === 'holidays' && (
        <div className="space-y-2">
          {HOLIDAYS.map(holiday => (
            <HolidayCard
              key={holiday.key}
              holiday={holiday}
              record={getRecord(holiday.key)}
              onSave={handleHolidaySave}
            />
          ))}
        </div>
      )}

      {/* ── Spring Breakfast tab ── */}
      {activeTab === 'breakfast' && (
        <div className="space-y-5">

          {/* Overview */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-800">Annual Spring Pancake Breakfast</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: 'Attendance', value: '~225/day' },
                  { label: 'Days', value: 'Tue & Thu' },
                  { label: 'Service Hours', value: '6:30–7:30 am' },
                  { label: 'Wrap-up By', value: '9:00 am' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3">
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">Past dates: May 7th (Tuesday) and May 9th (Thursday) — held on-site at Compass Minerals, 6:30–7:30 am.</p>
            </CardBody>
          </Card>

          {/* Prep Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Prep Checklist</h2>
                <span className="text-xs text-gray-500">{prepDone} / {PREP_CHECKLIST.length} done</span>
              </div>
            </CardHeader>
            <CardBody className="p-2">
              {PREP_CHECKLIST.map(item => (
                <CheckItem
                  key={item.key}
                  checked={!!checklist[item.key]}
                  label={item.label}
                  subtext={item.when}
                  onChange={() => toggleCheck(item.key)}
                />
              ))}
            </CardBody>
          </Card>

          {/* Supply List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Supply List</h2>
                <span className="text-xs text-gray-500">{supplyDone} / {SUPPLY_LIST.length} checked off</span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 w-8"></th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Item</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SUPPLY_LIST.map(item => (
                    <tr
                      key={item.key}
                      onClick={() => toggleCheck(item.key)}
                      className={`cursor-pointer transition-colors ${checklist[item.key] ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-2.5">
                        {checklist[item.key]
                          ? <CheckSquare size={15} className="text-green-600" />
                          : <Square size={15} className="text-gray-300" />
                        }
                      </td>
                      <td className={`px-4 py-2.5 font-medium ${checklist[item.key] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.label}
                      </td>
                      <td className={`px-4 py-2.5 ${checklist[item.key] ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Tips & Notes</h2></CardHeader>
            <CardBody>
              <ul className="space-y-2">
                {[
                  'Spray butter on the griddle to prevent pancakes from burning.',
                  'Preheat sausage and bacon in microwaves first, then finish on the grill.',
                  'Make pancake mix ON-SITE — do not transport pre-mixed batter.',
                  'Once done, deliver 3 tins of pancakes, sausage, and bacon to the Salt Plant.',
                  'After the event, take the griddle home and scrub it clean.',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-brand-400 shrink-0 font-bold mt-0.5">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={resetChecklist}>Reset All Checklists</Button>
          </div>
        </div>
      )}
    </div>
  );
}
