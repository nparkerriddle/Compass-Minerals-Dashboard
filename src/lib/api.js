// API abstraction layer.
//
// All data operations in the app go through this file.
// Currently backed by localStorage (via store.js).
// When the server is ready, swap each function body to a fetch() call —
// the rest of the app stays unchanged.
//
// Collections: workers | incidents | corrective_actions | injuries | notes

import * as store from './store.js';

// ─── Workers ────────────────────────────────────────────────────────────────

export async function getWorkers() {
  return store.getAll('workers');
}

export async function getWorker(id) {
  return store.getById('workers', id);
}

export async function createWorker(data) {
  return store.insert('workers', data);
}

export async function updateWorker(id, patch) {
  return store.update('workers', id, patch);
}

export async function deleteWorker(id) {
  return store.remove('workers', id);
}

// ─── Attendance Incidents ────────────────────────────────────────────────────

export async function getIncidents(workerId) {
  const all = store.getAll('incidents');
  return workerId ? all.filter((i) => i.worker_id === workerId) : all;
}

export async function createIncident(data) {
  return store.insert('incidents', data);
}

export async function updateIncident(id, patch) {
  return store.update('incidents', id, patch);
}

export async function deleteIncident(id) {
  return store.remove('incidents', id);
}

// ─── Corrective Actions ──────────────────────────────────────────────────────

export async function getCorrectiveActions(workerId) {
  const all = store.getAll('corrective_actions');
  return workerId ? all.filter((ca) => ca.worker_id === workerId) : all;
}

export async function createCorrectiveAction(data) {
  return store.insert('corrective_actions', data);
}

export async function updateCorrectiveAction(id, patch) {
  return store.update('corrective_actions', id, patch);
}

export async function deleteCorrectiveAction(id) {
  return store.remove('corrective_actions', id);
}

// ─── Injuries / Incidents ────────────────────────────────────────────────────

export async function getInjuries(workerId) {
  const all = store.getAll('injuries');
  return workerId ? all.filter((i) => i.worker_id === workerId) : all;
}

export async function createInjury(data) {
  return store.insert('injuries', data);
}

export async function updateInjury(id, patch) {
  return store.update('injuries', id, patch);
}

export async function deleteInjury(id) {
  return store.remove('injuries', id);
}

// ─── Holiday Records ─────────────────────────────────────────────────────────

export async function getHolidayRecords() {
  return store.getAll('holiday_records');
}

export async function upsertHolidayRecord(holidayKey, year, patch) {
  const all = store.getAll('holiday_records');
  const existing = all.find((r) => r.holiday_key === holidayKey && r.year === year);
  if (existing) {
    return store.update('holiday_records', existing.id, patch);
  }
  return store.insert('holiday_records', { holiday_key: holidayKey, year, ...patch });
}

// ─── Breakfast Checklist ─────────────────────────────────────────────────────

export async function getBreakfastChecklist() {
  const raw = localStorage.getItem('compass_breakfast_checklist');
  return raw ? JSON.parse(raw) : {};
}

export async function saveBreakfastChecklist(state) {
  localStorage.setItem('compass_breakfast_checklist', JSON.stringify(state));
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getNotes(workerId) {
  const all = store.getAll('notes');
  return workerId ? all.filter((n) => n.worker_id === workerId) : all;
}

export async function createNote(data) {
  return store.insert('notes', data);
}

export async function deleteNote(id) {
  return store.remove('notes', id);
}
