import { useState } from 'react';
import { BookOpen, HelpCircle, FileText, ChevronDown, ChevronRight, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';

const TABS = [
  { id: 'policies', label: 'Policies', icon: FileText },
  { id: 'faq',      label: "FAQ's",    icon: HelpCircle },
  { id: 'help',     label: 'Help',     icon: BookOpen },
];

// ─── Policies ─────────────────────────────────────────────────────────────────

const policies = [
  {
    title: 'Attendance Policy',
    content: (
      <div className="space-y-4 text-sm text-gray-700">
        <p>Incidents are tracked on a <strong>rolling 6-month (183-day) window</strong>. Each incident type carries a weight:</p>
        <table className="w-full text-xs border border-gray-200 rounded overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Incident Type</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-600">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['Late / Left Early (< 25% of shift)', '0.5'],
              ['Late / Left Early (> 25% of shift)', '1.0'],
              ['Absent – Sick or Other', '1.0'],
              ['Absent – Denied Request', '2.0'],
              ['Holiday Absence', '2.0'],
              ['Mandatory OT Missed / Refused', '2.0'],
              ['No Call No Show (NCNS)', '3.0'],
            ].map(([type, pts]) => (
              <tr key={type} className="hover:bg-gray-50">
                <td className="px-3 py-2">{type}</td>
                <td className="px-3 py-2 text-right font-medium">{pts}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <p className="font-semibold text-gray-800 mb-2">Corrective Action Thresholds</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { level: 'Verbal Warning',             pts: '3.0', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
              { level: 'Written Warning',            pts: '5.0', color: 'bg-orange-50 border-orange-200 text-orange-800' },
              { level: 'Final Written + Suspension', pts: '7.0', color: 'bg-red-50 border-red-200 text-red-800' },
              { level: 'Termination',                pts: '8.0', color: 'bg-red-100 border-red-300 text-red-900' },
            ].map(({ level, pts, color }) => (
              <div key={level} className={`border rounded px-3 py-2 text-xs ${color}`}>
                <span className="font-bold text-base">{pts}</span>
                <span className="ml-1">pts — {level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={13} /> NCNS Rule</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>2 NCNS within 12 months → Final Written Warning</li>
            <li>3 NCNS within 12 months → Termination (regardless of total points)</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">Escalation Rule</p>
          <p>If a worker hits the <em>same threshold</em> within 90 days of a prior corrective action at that level, escalate one level up automatically.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Wage Policy',
    content: (
      <div className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '90-Day Raise',         amount: '+$0.75/hr', note: 'Requires ≤ 3 incidents in last 90 days' },
            { label: '6-Month Raise',         amount: '+$0.50/hr', note: 'Requires ≤ 5 incidents in rolling window' },
            { label: 'Return Season Raise',   amount: '+$0.50/hr', note: 'Per season returned' },
            { label: 'Night Differential',    amount: '+$0.80/hr', note: 'Night shift workers' },
            { label: 'Weekend Differential',  amount: '+$2.00/hr', note: 'Salt Plant weekend crew only' },
          ].map(({ label, amount, note }) => (
            <div key={label} className="border border-gray-200 rounded p-3 bg-gray-50">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-bold text-gray-900 text-base">{amount}</p>
              <p className="text-xs text-gray-500 mt-0.5">{note}</p>
            </div>
          ))}
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
          <p className="font-semibold mb-1">Wage Caps</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Max total increase from starting wage: <strong>+$2.00</strong></li>
            <li>Haul Driver / Haul Operator absolute cap: <strong>$27.00/hr</strong></li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: 'Furlough Policy',
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>Furloughs are <strong>seasonal</strong>. Workers remain employed through YES during furlough.</p>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Furlough Process</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Collect <strong>Intent to Return</strong> at time of furlough</li>
            <li>Place worker in Furlough status in the dashboard</li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Return Process</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Confirm availability with worker</li>
            <li>Re-run Background Check + Drug Test</li>
            <li>Update record in Avionte Bold</li>
            <li>Notify client (Compass Minerals)</li>
            <li>Day 1 follow-up check-in</li>
          </ol>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">No-Response Rule</p>
          <p>After <strong>3 unanswered contact attempts</strong>, move worker to <strong>Inactive – No Response</strong> status.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'DNA (Do Not Assign) Policy',
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>DNA is a <strong>permanent</strong> Do Not Assign designation. Records date back to 2013.</p>
        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
          <p className="font-semibold mb-1">Cross-Check Requirement</p>
          <p>Before placing any new hire, verify against the DNA list using <strong>Bold ID + Name/Phone</strong> combination.</p>
        </div>
        <p className="text-xs text-gray-500">DNA workers are tracked on the Terminations page under the DNA tab.</p>
      </div>
    ),
  },
  {
    title: 'Onboarding Checklist',
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <div>
          <p className="font-semibold text-gray-800 mb-1">All Workers</p>
          <ul className="space-y-1 text-sm list-disc list-inside">
            <li>Background Check date + expiration (30 days standard, 60 days with Yardstick)</li>
            <li>Drug Test date</li>
            <li>Fit for Duty (FFD) date + type (Standard / DOT / Operator)</li>
            <li>Photo on file</li>
            <li>I-9 completed</li>
            <li>E-Verify + case number</li>
            <li>FCRA signed</li>
            <li>Orientation date</li>
            <li>First Day Check-In</li>
            <li>30-Day Check-In</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Haul Driver / Haul Operator (Additional)</p>
          <ul className="space-y-1 text-sm list-disc list-inside">
            <li>Physical date</li>
            <li>Haul Truck Sign-Off</li>
            <li>Stockpile Testing</li>
            <li>Operator Sign-Off</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">Post-Orientation Email</p>
          <p>Send to applicable supervisors & HR with: Name, Employee ID, Email, Phone, Agency (YES), Start Date, Supervisor, Kronos #. CC Taryn Keller and relevant HR.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Temp-to-Hire (T/H) Policy',
    content: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>Workers converted from temporary to permanent Compass Minerals employment are designated <strong>T/H</strong>.</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Record conversion date on worker profile</li>
          <li>Track on the Conversions page</li>
          <li>Worker remains in dashboard for historical record</li>
        </ul>
      </div>
    ),
  },
];

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'How do I add a new worker?',
    a: 'Go to Workers → click "Add Worker" in the top right. Fill in the Bold ID, name, department, and status. The onboarding checklist will auto-populate based on the department selected.',
  },
  {
    q: 'How do I log an attendance incident?',
    a: 'Go to the Attendance page and click "Log Incident." Select the worker, incident type, and date. The system automatically calculates their rolling 6-month total and flags any corrective action thresholds reached.',
  },
  {
    q: 'What triggers a NCNS escalation?',
    a: '2 NCNS incidents within any 12-month period triggers a Final Written Warning. 3 NCNS within 12 months triggers Termination, regardless of total incident points.',
  },
  {
    q: 'How do I process a furlough?',
    a: 'On the worker\'s profile, change status to "Furlough" and record their Intent to Return. They\'ll appear on the Waitlist / Furlough page. When returning, follow the return process: confirm availability, re-run BG + DT, update Avionte, notify client, Day 1 follow-up.',
  },
  {
    q: 'When is the 90-day raise triggered?',
    a: 'The 90-day raise (+$0.75/hr) is eligible after 90 days of active employment with ≤ 3 attendance incidents in that 90-day window. It must still be applied manually in Avionte Bold.',
  },
  {
    q: 'What\'s the difference between Standard, DOT, and Operator FFD?',
    a: 'Standard FFD is required for most roles. DOT (Department of Transportation) FFD is required for drivers covered under DOT regulations. Operator FFD is required for heavy equipment operators.',
  },
  {
    q: 'How do I check if someone is on the DNA list?',
    a: 'Go to Terminations → DNA tab. Before placing any new hire, cross-check their Bold ID and name/phone number against this list. DNA status is permanent.',
  },
  {
    q: 'What Bold ID format does YES use?',
    a: 'Bold IDs come from Avionte Bold — they are the primary identifier for all workers. There is no WorkDay or C# format used at this site.',
  },
  {
    q: 'How does the Kronos # get assigned?',
    a: 'Workers receive their Kronos UKG number at orientation. Enter it on the worker profile. This is used only for time tracking — payroll is handled via Compass emailing Kronos timecard PDFs Monday/Tuesday.',
  },
  {
    q: 'Who do I contact at Compass Minerals?',
    a: 'Eric Quilter (Ops Manager), Kalecia Hulsey (HRBP), Taryn Keller (HR Coordinator — CC on all orientation emails), Michael Jensen (Haul operations).',
  },
];

// ─── Help ─────────────────────────────────────────────────────────────────────

const helpSections = [
  {
    title: 'Dashboard Overview',
    body: 'The home Dashboard shows headcount at a glance, onboarding status, upcoming 90-day raise eligibility, and active attendance flags. Use it as your daily starting point.',
  },
  {
    title: 'Worker Lifecycle',
    body: 'Workers move through statuses: Pending → Active → (Furlough ↔ Active) → Termed / DNA / T/H. Use the Workers list to search, filter, and update records. All key dates and checklist items live on the Worker Profile.',
  },
  {
    title: 'Onboarding Pipeline',
    body: 'Kanban-style board showing workers moving through 4 stages: Pre-Hire → Orientation → Onboarding → Active. Drag cards or update checklist items directly on the card.',
  },
  {
    title: 'Attendance Tracking',
    body: 'Log incidents per worker. The system uses the rolling 6-month (183-day) window to calculate total points and highlight corrective action thresholds automatically. NCNS is tracked separately for the 12-month rule.',
  },
  {
    title: 'Waitlist / Furlough',
    body: 'Manage workers on the waitlist for placement and those currently furloughed. Track Intent to Return and contact attempts. After 3 failed contacts, move to Inactive – No Response.',
  },
  {
    title: 'Analytics',
    body: 'View trends across headcount, attendance, terminations, department breakdowns, and wage raise eligibility. Use to prepare weekly or monthly reports for Compass Minerals.',
  },
  {
    title: 'Data & Integrations',
    body: 'All data is stored locally and synced via localStorage. The API layer (src/lib/api.js) is ready for a server swap — function bodies can be replaced with fetch() calls to Avionte Bold\'s API without changing any UI code.',
  },
  {
    title: 'Key Contacts',
    body: null,
    contacts: [
      { name: 'Eric Quilter',    role: 'Ops Manager',      org: 'Compass Minerals' },
      { name: 'Kalecia Hulsey',  role: 'HRBP',             org: 'Compass Minerals' },
      { name: 'Taryn Keller',    role: 'HR Coordinator',   org: 'Compass Minerals' },
      { name: 'Michael Jensen',  role: 'Haul Operations',  org: 'Compass Minerals' },
    ],
  },
];

// ─── Accordion Component ───────────────────────────────────────────────────────

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left text-sm font-medium text-gray-800 transition-colors"
      >
        {title}
        {open ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('policies');

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Resources</h1>
        <p className="text-sm text-gray-500 mt-0.5">Compass Minerals policies, frequently asked questions, and dashboard help.</p>
      </div>

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

      {/* Policies tab */}
      {activeTab === 'policies' && (
        <div className="space-y-3">
          {policies.map(({ title, content }) => (
            <Accordion key={title} title={title}>
              {content}
            </Accordion>
          ))}
        </div>
      )}

      {/* FAQ tab */}
      {activeTab === 'faq' && (
        <div className="space-y-3">
          {faqs.map(({ q, a }) => (
            <Accordion key={q} title={q}>
              <p className="text-sm text-gray-700">{a}</p>
            </Accordion>
          ))}
        </div>
      )}

      {/* Help tab */}
      {activeTab === 'help' && (
        <div className="space-y-4">
          {helpSections.map(({ title, body, contacts }) => (
            <Card key={title} className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
              {body && <p className="text-sm text-gray-600">{body}</p>}
              {contacts && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {contacts.map(({ name, role, org }) => (
                    <div key={name} className="border border-gray-100 rounded p-2.5 bg-gray-50">
                      <p className="text-sm font-medium text-gray-800">{name}</p>
                      <p className="text-xs text-gray-500">{role}</p>
                      <p className="text-xs text-gray-400">{org}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
