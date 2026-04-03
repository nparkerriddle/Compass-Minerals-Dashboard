// ─── Worker Statuses ────────────────────────────────────────────────────────
export const STATUSES = [
  'Active',
  'Pending',
  'Wait List',
  'Furlough',
  'Termed',
  'DNA',
  'T/H',          // Temp-to-hire (converted to permanent, tracked on Converted page)
  'Inactive - No Response',
];

// ─── Departments ─────────────────────────────────────────────────────────────
export const DEPARTMENTS = [
  'Haul Driver',
  'Haul Operator',
  'Salt Plant',
  'Harvest',
  'Fueler',
  'HEO',
  'Mag Plant',
  'Maintenance',
  'SOP Plant',
  'Lab',
  'Shipping',
  'Admin',
  'Other',
];

// Departments that require the Haul-specific onboarding checklist
export const HAUL_DEPARTMENTS = ['Haul Driver', 'Haul Operator'];

// ─── Shifts ──────────────────────────────────────────────────────────────────
export const SHIFTS = ['A', 'B', 'C', 'D', 'Su-W', 'W-Sa', 'M-F', 'B/D Days', 'B/D Nights'];

// ─── Supervisors ─────────────────────────────────────────────────────────────
export const SUPERVISORS = [
  'Dennis Hoskins',
  'Aubri White',
  'Pedro Pena',
  'MacKenzi Silcox',
  'Mike Anderson',
  'Troy Pederson',
  'Candy Cunnington',
  'Kyle Gregg',
  'Jack Robinson',
  'Chris Leonelli',
  'Craig Hansen',
  'Shane Shafer',
  'Matt Lyon',
  'Lee Doxey',
  'Other',
];

// ─── Term Reasons ────────────────────────────────────────────────────────────
export const TERM_REASONS = [
  'Attendance',
  'Safety',
  'Misconduct',
  'NCNS',
  'Walked Off Job',
  'Denied/Failed DT',
  'Other Job',
  'Dislike Job',
  'Dislike Environment',
  'Dislike Supervisor',
  'Health',
  'Personal',
  'Transportation',
  'Scheduling Issues',
  'Wage',
  'Hired Perm',
  'Performance',
  'Near Miss',
  'Accident',
  'Not Allowed Back',
  'New Job',
  'Other',
];

// ─── Intent to Return ─────────────────────────────────────────────────────────
export const INTENT_TO_RETURN = ['Yes', 'No', 'Maybe', 'Undecided'];

// ─── FFD Types ───────────────────────────────────────────────────────────────
export const FFD_TYPES = ['Standard', 'DOT', 'Operator'];

// ─── Attendance Incident Types ───────────────────────────────────────────────
// weight: the incident value per occurrence
export const INCIDENT_TYPES = [
  { value: 'late_minor',       label: 'Late (<25% of shift)',            weight: 0.5 },
  { value: 'late_major',       label: 'Late (>25% of shift)',            weight: 1.0 },
  { value: 'leave_early_minor',label: 'Left Early (<25% of shift)',      weight: 0.5 },
  { value: 'leave_early_major',label: 'Left Early (>25% of shift)',      weight: 1.0 },
  { value: 'sick',             label: 'Absent – Sick',                   weight: 1.0 },
  { value: 'absent',           label: 'Absent – Other',                  weight: 1.0 },
  { value: 'absent_denied',    label: 'Absent – Denied Request',         weight: 2.0 },
  { value: 'holiday',          label: 'Holiday Absence',                 weight: 2.0 },
  { value: 'mandatory_ot',     label: 'Mandatory OT Missed/Refused',     weight: 2.0 },
  { value: 'ncns',             label: 'No Call No Show (NCNS)',          weight: 3.0 },
];

// Corrective action thresholds (rolling 6-month incident total)
export const CA_THRESHOLDS = [
  { level: 'Verbal Warning',              min: 3 },
  { level: 'Written Warning',             min: 5 },
  { level: 'Final Written + Suspension',  min: 7 },
  { level: 'Termination',                min: 8 },
];

export const ROLLING_WINDOW_DAYS = 183; // ~6 months

// ─── Wage Policy ─────────────────────────────────────────────────────────────
export const WAGE_NINETY_DAY_RAISE   = 0.75;
export const WAGE_SIX_MONTH_RAISE    = 0.50;
export const WAGE_SEASON_RAISE       = 0.50;
export const WAGE_TOTAL_CAP          = 2.00;  // max total increase from starting wage
export const WAGE_HAUL_ABSOLUTE_CAP  = 27.00;
export const WAGE_NIGHT_DIFF         = 0.80;
export const WAGE_WEEKEND_DIFF       = 2.00;  // Salt Plant weekend crew

// 90-day raise requires ≤3 incidents in last 90 days
export const NINETY_DAY_RAISE_MAX_INCIDENTS = 3;
// 6-month raise requires ≤5 incidents in rolling window
export const SIX_MONTH_RAISE_MAX_INCIDENTS  = 5;

// ─── Background Check ────────────────────────────────────────────────────────
export const BG_EXPIRATION_STANDARD_DAYS = 30;
export const BG_EXPIRATION_YARDSTICK_DAYS = 60;
