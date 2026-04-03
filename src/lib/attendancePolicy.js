// Attendance policy calculations.
// Based on Compass Minerals Contractor/Temp Attendance Policy 2023.
//
// Key rules:
// - Incident weights: 0.5 / 1.0 / 2.0 / 3.0 depending on type
// - Rolling 6-month window (183 days)
// - CA thresholds: 3 Verbal | 5 Written | 7 Final+Susp | 8 Termination
// - NCNS escalation: 2 within 12 months → Final Written; 3 → Termination
// - 90-day escalation: reaching same threshold within 90 days of prior CA → escalate 1 level

import { differenceInDays, subDays, subMonths, parseISO, isAfter } from 'date-fns';
import { CA_THRESHOLDS, ROLLING_WINDOW_DAYS, INCIDENT_TYPES } from './constants.js';

// Returns all incidents within the rolling 6-month window from today
export function getActiveIncidents(incidents) {
  const cutoff = subDays(new Date(), ROLLING_WINDOW_DAYS);
  return incidents.filter((i) => isAfter(parseISO(i.date), cutoff));
}

// Sum of incident weights in the rolling window
export function getRollingTotal(incidents) {
  return getActiveIncidents(incidents).reduce((sum, i) => sum + (i.weight || 0), 0);
}

// Current CA level based on rolling total (null if below threshold)
export function getCurrentCALevel(incidents) {
  const total = getRollingTotal(incidents);
  let level = null;
  for (const threshold of CA_THRESHOLDS) {
    if (total >= threshold.min) level = threshold.level;
  }
  return level;
}

// Count NCNSs within the last N days
export function getNCNSCount(incidents, days = 365) {
  const cutoff = subDays(new Date(), days);
  return incidents.filter(
    (i) => i.type === 'ncns' && isAfter(parseISO(i.date), cutoff),
  ).length;
}

// Returns true if worker should be auto-terminated based on NCNS rule (3 in 12 months)
export function isNCNSTermination(incidents) {
  return getNCNSCount(incidents, 365) >= 3;
}

// Returns true if NCNS count warrants Final Written (2 in 12 months)
export function isNCNSFinalWritten(incidents) {
  return getNCNSCount(incidents, 365) >= 2;
}

// Determines the recommended CA level, accounting for escalation within 90 days
export function getRecommendedCALevel(incidents, priorCAs) {
  const baseLevel = getCurrentCALevel(incidents);
  if (!baseLevel) return null;

  // Check if a CA was issued within the last 90 days
  const cutoff90 = subDays(new Date(), 90);
  const recentCA = priorCAs
    .filter((ca) => isAfter(parseISO(ca.date), cutoff90))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (!recentCA) return baseLevel;

  // Escalate one level
  const levels = CA_THRESHOLDS.map((t) => t.level);
  const currentIdx = levels.indexOf(baseLevel);
  const escalated = levels[Math.min(currentIdx + 1, levels.length - 1)];
  return escalated;
}

// Returns the weight for an incident type string
export function getIncidentWeight(type) {
  const found = INCIDENT_TYPES.find((t) => t.value === type);
  return found ? found.weight : 1.0;
}

// How many incident points will drop off within the next N days
export function getExpiringPoints(incidents, daysAhead = 30) {
  const windowStart = subDays(new Date(), ROLLING_WINDOW_DAYS);
  const windowEnd = subDays(new Date(), ROLLING_WINDOW_DAYS - daysAhead);
  return incidents
    .filter((i) => {
      const d = parseISO(i.date);
      return isAfter(d, windowStart) && !isAfter(d, windowEnd);
    })
    .reduce((sum, i) => sum + (i.weight || 0), 0);
}

// Attendance eligibility for 90-day wage raise: ≤3 incidents in last 90 days
export function isEligibleForNinetyDayRaise(incidents) {
  const cutoff = subDays(new Date(), 90);
  const recent = incidents.filter((i) => isAfter(parseISO(i.date), cutoff));
  const total = recent.reduce((sum, i) => sum + (i.weight || 0), 0);
  return total <= 3;
}

// Attendance eligibility for 6-month raise: ≤5 incidents in rolling window
export function isEligibleForSixMonthRaise(incidents) {
  return getRollingTotal(incidents) <= 5;
}
