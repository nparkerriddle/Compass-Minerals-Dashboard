// Compass Tracker spreadsheet importer.
// Reads the Excel file and maps each sheet to worker/injury records.
// Uses the xlsx library (SheetJS).

import * as XLSX from 'xlsx';
import { newId } from './store.js';

// ─── Excel date serial → 'YYYY-MM-DD' string ────────────────────────────────
// Excel day 1 = Jan 1 1900 (with leap-year bug: treats 1900 as leap year)
// JS: (serial - 25569) * 86400 * 1000 → Unix ms
function excelDateToISO(serial) {
  if (!serial || isNaN(Number(serial))) return '';
  const n = Number(serial);
  if (n < 1000) return ''; // clearly not a date (small numbers like UPTO counts)
  const date = new Date((n - 25569) * 86400 * 1000);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

// ─── Excel time fraction → '12:30 PM' string ────────────────────────────────
// Excel stores times as a fraction of a day (0.5 = noon, 0.75 = 6 PM).
// Some cells are already entered as strings ('1:25pm') — pass those through.
function excelTimeToString(val) {
  if (!val && val !== 0) return '';
  const str = String(val).trim();
  // Already a human-readable time string — just normalize casing
  if (isNaN(Number(str))) return str;
  const fraction = Number(str);
  // Only treat as time if clearly a fraction of a day (0–1)
  if (fraction < 0 || fraction >= 1) return str;
  const totalMinutes = Math.round(fraction * 24 * 60);
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const min = totalMinutes % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

// Is a value truthy / "Yes"
function isYes(v) {
  if (!v) return false;
  return String(v).toLowerCase().trim() === 'yes' || v === true;
}

function cleanPhone(v) {
  if (!v) return '';
  return String(v).replace(/\s+/g, '').trim();
}

function cleanId(v) {
  if (!v) return '';
  return String(v).replace(/\s+/g, '').trim();
}

function parseWage(v) {
  const n = parseFloat(v);
  return isNaN(n) ? '' : n;
}

// Season value can be "4 of 4", "2", "1", etc. — extract the last number
function parseSeason(v) {
  if (!v) return 1;
  const str = String(v).trim();
  const match = str.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

// ─── Haul Data 25-26 ─────────────────────────────────────────────────────────
function parseHaulSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return rows
    .filter((r) => r['First'] && r['Last'] && r['Status'])
    .filter((r) => !['Status'].includes(String(r['First']).trim())) // skip extra header rows
    .map((r) => ({
      id: newId(),
      status: String(r['Status'] || '').trim(),
      first_name: String(r['First'] || '').trim(),
      last_name: String(r['Last'] || '').trim(),
      birthday: excelDateToISO(r['Birthday']),
      phone: cleanPhone(r['Phone']),
      bold_id: cleanId(r['Bold ID']),
      department: String(r['Department'] || '').trim(),
      shift: String(r['Shift'] || '').trim(),
      supervisor: String(r['Supervisor'] || '').trim(),
      // Haul checklist
      photo_done: isYes(r['Photo Done']),
      haul_truck_signoff: isYes(r['Haul Truck Sign Off']),
      stockpile_testing: isYes(r['Passed Stockplie Testing']),
      operator_signoff: isYes(r['Operator Sign Off']),
      physical_date: isYes(r['Physical Expiration']) ? '' : excelDateToISO(r['Physical Expiration']),
      physical_done: isYes(r['Physical Expiration']),
      start_date: excelDateToISO(r['Start Date']),
      term_date: (() => {
        const status = String(r['Status'] || '').trim();
        const val = r['Today/Term'];
        if (['Termed','DNA','T/H'].includes(status)) return excelDateToISO(val);
        return '';
      })(),
      ninety_day_raise_given: isYes(r['90 Day Raise Given']),
      term_reason: String(r['Term Reason'] || '').trim(),
      voluntary_term: String(r['Voluntary Term'] || '').trim(),
      intent_to_return: String(r['Intent to Return'] || '').trim(),
      season_count: parseSeason(r['Season']),
      current_wage: parseWage(r['Wage']),
      starting_wage: parseWage(r['Wage']),
      first_day_checkin: excelDateToISO(r['First Day Check in']),
      thirty_day_checkin: excelDateToISO(r['30 Day Check in']),
      notes: String(r['Notes'] || '').trim(),
      attendance_points: parseFloat(r['UPTO'] || r['Points'] || r['Attendance Points'] || r['Pts'] || 0) || 0,
      _source_sheet: 'Haul Data 25-26',
    }));
}

// ─── Fueler-HEO-Salt-Mag ─────────────────────────────────────────────────────
function parseFuelerSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return rows
    .filter((r) => r['First'] && r['Last'] && r['Status'])
    .map((r) => ({
      id: newId(),
      status: String(r['Status'] || '').trim(),
      first_name: String(r['First'] || '').trim(),
      last_name: String(r['Last'] || '').trim(),
      birthday: excelDateToISO(r['Birthday']),
      phone: cleanPhone(r['Phone']),
      bold_id: cleanId(r['Bold ID']),
      department: String(r['Department'] || '').trim(),
      shift: String(r['Shift'] || '').trim(),
      supervisor: String(r['Supervisor'] || '').trim(),
      // Non-haul checklist
      training_signoff: isYes(r['Training Sign Off Rcvd']),
      photo_done: isYes(r['Photo Done']),
      physical_done: isYes(r['Physical']) || !!excelDateToISO(r['Physical']),
      physical_date: excelDateToISO(r['Physical']),
      start_date: excelDateToISO(r['Start Date']),
      term_date: (() => {
        const status = String(r['Status'] || '').trim();
        const val = r['Today/Term'];
        if (['Termed','DNA','T/H','DNA'].includes(status)) return excelDateToISO(val);
        return '';
      })(),
      term_reason: String(r['Term Reason'] || '').trim(),
      voluntary_term: String(r['Voluntary Term'] || '').trim(),
      intent_to_return: String(r['Intent to Return'] || '').trim(),
      season_count: parseSeason(r['Season']),
      current_wage: parseWage(r['Wage']),
      starting_wage: parseWage(r['Wage']),
      ninety_day_raise_given: isYes(r['90 Day Wage Review']),
      first_day_checkin: excelDateToISO(r['First Day Check In']),
      thirty_day_checkin: excelDateToISO(r['30 Day Check In']),
      notes: String(r['Notes'] || '').trim(),
      attendance_points: parseFloat(r['UPTO'] || r['Points'] || r['Attendance Points'] || r['Pts'] || 0) || 0,
      _source_sheet: 'Fueler-HEO-Salt-Mag',
    }));
}

// ─── Waitlist-Furlough ───────────────────────────────────────────────────────
function parseWaitlistSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return rows
    .filter((r) => r['First'] && r['Last'])
    .map((r) => ({
      id: newId(),
      status: String(r['Status'] || 'Wait List').trim(),
      first_name: String(r['First'] || '').trim(),
      last_name: String(r['Last'] || '').trim(),
      phone: cleanPhone(r['Phone']),
      bold_id: cleanId(r['Bold ID']),
      department: String(r['Department'] || '').trim(),
      shift: String(r['Preferred Shift'] || '').trim(),
      _source_sheet: 'Waitlist-Furlough',
    }));
}

// ─── Termed or DNA ───────────────────────────────────────────────────────────
function parseTermedSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return rows
    .filter((r) => r['First'] && r['Last'] && r['Status'])
    .map((r) => ({
      id: newId(),
      status: String(r['Status'] || '').trim(),
      first_name: String(r['First'] || '').trim(),
      last_name: String(r['Last'] || '').trim(),
      phone: cleanPhone(r['Phone']),
      bold_id: cleanId(r['Bold ID']),
      shift: String(r['Shift'] || '').trim(),
      department: String(r['Department'] || '').trim(),
      supervisor: String(r['Supervisor'] || '').trim(),
      start_date: excelDateToISO(r['Start Date']),
      term_date: excelDateToISO(r['Today/Term']),
      term_reason: String(r['Term Reason'] || '').trim(),
      voluntary_term: String(r['Voluntary Term'] || '').trim(),
      intent_to_return: String(r['Intent to Return'] || '').trim(),
      season_count: parseSeason(r['Season']),
      current_wage: parseWage(r['Wage']),
      starting_wage: parseWage(r['Wage']),
      first_day_checkin: excelDateToISO(r['First Day Check In']),
      thirty_day_checkin: excelDateToISO(r['30 Day Check In']),
      notes: String(r['Notes'] || '').trim(),
      attendance_points: parseFloat(r['UPTO'] || r['Points'] || r['Attendance Points'] || r['Pts'] || 0) || 0,
      _source_sheet: 'Termed or DNA',
    }));
}

// ─── Converted (T/H → Perm) ──────────────────────────────────────────────────
function parseConvertedSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return rows
    .filter((r) => r['First'] && r['Last'])
    .map((r) => ({
      id: newId(),
      status: 'T/H',
      first_name: String(r['First'] || '').trim(),
      last_name: String(r['Last'] || '').trim(),
      phone: cleanPhone(r['Phone']),
      bold_id: cleanId(r['Bold ID']),
      department: String(r['Department'] || '').trim(),
      shift: String(r['Shift'] || '').trim(),
      supervisor: String(r['Supervisor'] || '').trim(),
      training_signoff: isYes(r['Training Docs']),
      photo_done: isYes(r['Photo Done']),
      start_date: excelDateToISO(r['Start Date']),
      converted_date: excelDateToISO(r['Today/Term']),
      term_date: excelDateToISO(r['Today/Term']),
      term_reason: String(r['Term Reason'] || 'Hired Perm').trim(),
      voluntary_term: String(r['Voluntary Term'] || '').trim(),
      intent_to_return: String(r['Intent to Return'] || '').trim(),
      season_count: parseSeason(r['Season']),
      current_wage: parseWage(r['Wage']),
      starting_wage: parseWage(r['Wage']),
      first_day_checkin: excelDateToISO(r['First Day Check In']),
      thirty_day_checkin: excelDateToISO(r['30 Day Check In']),
      notes: String(r['Notes'] || '').trim(),
      attendance_points: parseFloat(r['UPTO'] || r['Points'] || r['Attendance Points'] || r['Pts'] || 0) || 0,
      _source_sheet: 'Converted',
    }));
}

// ─── Injuries.Incidents ───────────────────────────────────────────────────────
function parseInjuriesSheet(sheet) {
  // Row 1 (index 0) has a stray cell; actual headers are on row 2 (index 1).
  // range: 1 tells SheetJS to treat row index 1 as the header row.
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true, range: 1 });
  return rows
    .filter((r) => r['First Name'] || r['Last Name'])
    .map((r) => ({
      id: newId(),
      date: excelDateToISO(r['Incident Date']),
      time: excelTimeToString(r['Incident Time']),
      first_name: String(r['First Name'] || '').trim(),
      last_name: String(r['Last Name'] || '').trim(),
      shift: String(r['Shift'] || '').trim(),
      supervisor: String(r['Supervisor'] || '').trim(),
      department: String(r['Department'] || '').trim(),
      outcome: String(r['Outcome'] || '').trim(),
      notes: String(r['Notes'] || '').trim(),
    }));
}

// ─── Main import function ─────────────────────────────────────────────────────
// Returns { workers: [], injuries: [], summary: {} }
export function parseCompassTracker(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetNames = workbook.SheetNames;
  const get = (name) => {
    const found = sheetNames.find(
      (s) => s.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
    );
    return found ? workbook.Sheets[found] : null;
  };

  const haulWorkers      = get('hauldata25-26')      ? parseHaulSheet(get('hauldata25-26'))         : [];
  const fuelerWorkers    = get('fueler-heo-salt-mag') ? parseFuelerSheet(get('fueler-heo-salt-mag')) : [];
  const waitlistWorkers  = get('waitlist-furlough')   ? parseWaitlistSheet(get('waitlist-furlough')) : [];
  const termedWorkers    = get('termeddna') || get('termeddordna')
    ? parseTermedSheet(get('termeddna') || get('termeddordna'))
    : [];
  const convertedWorkers = get('converted')           ? parseConvertedSheet(get('converted'))       : [];
  const injuries         = get('injuries.incidents')  ? parseInjuriesSheet(get('injuries.incidents')): [];

  // Merge all worker sources, deduplicate by Bold ID (keep first occurrence)
  const allWorkers = [
    ...haulWorkers,
    ...fuelerWorkers,
    ...waitlistWorkers,
    ...termedWorkers,
    ...convertedWorkers,
  ];

  const seen = new Set();
  const workers = [];
  const dupes = [];

  for (const w of allWorkers) {
    if (!w.first_name || !w.last_name) continue;
    const key = w.bold_id
      ? `boldid:${w.bold_id}`
      : `name:${w.first_name.toLowerCase()}:${w.last_name.toLowerCase()}`;
    if (seen.has(key)) {
      dupes.push(w);
    } else {
      seen.add(key);
      workers.push(w);
    }
  }

  return {
    workers,
    injuries,
    summary: {
      haul:      haulWorkers.length,
      fueler:    fuelerWorkers.length,
      waitlist:  waitlistWorkers.length,
      termed:    termedWorkers.length,
      converted: convertedWorkers.length,
      injuries:  injuries.length,
      total:     workers.length,
      dupes:     dupes.length,
    },
  };
}
