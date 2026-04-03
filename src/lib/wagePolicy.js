// Wage increase policy calculations.
// Based on Compass Minerals Wage Increase Policy.
//
// - +$0.75 after 90 days (if ≤3 incidents in last 90 days)
// - +$0.50 every 6 months after that (if ≤5 incidents in rolling window)
// - +$0.50 per return season
// - Total cap: +$2.00 from starting wage
// - Haul absolute cap: $27.00
// - Night shift differential: +$0.80/hr
// - Weekend Salt Plant differential: +$2.00/hr

import { differenceInDays, parseISO } from 'date-fns';
import {
  WAGE_NINETY_DAY_RAISE,
  WAGE_SEASON_RAISE,
  WAGE_TOTAL_CAP,
  WAGE_HAUL_ABSOLUTE_CAP,
  HAUL_DEPARTMENTS,
} from './constants.js';

// Expected wage based on starting wage, season count, and raise history.
// Does NOT factor in attendance eligibility — use attendancePolicy for that.
export function calculateExpectedWage(startingWage, seasonCount = 0) {
  const seasonRaises = (seasonCount || 0) * WAGE_SEASON_RAISE;
  const totalIncrease = Math.min(WAGE_NINETY_DAY_RAISE + seasonRaises, WAGE_TOTAL_CAP);
  return +(startingWage + totalIncrease).toFixed(2);
}

// Cap for a given department
export function getWageCap(department, startingWage) {
  const absoluteCap = HAUL_DEPARTMENTS.includes(department) ? WAGE_HAUL_ABSOLUTE_CAP : Infinity;
  const policyMax = +(startingWage + WAGE_TOTAL_CAP).toFixed(2);
  return Math.min(policyMax, absoluteCap);
}

// Days since start date
export function getDaysWorked(startDate, endDate = null) {
  if (!startDate) return 0;
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : new Date();
  return Math.max(0, differenceInDays(end, start));
}

// Whether the 90-day raise milestone has passed
export function isNinetyDaysPast(startDate) {
  return getDaysWorked(startDate) >= 90;
}

// Returns a human-readable wage increase summary for a worker
export function getWageSummary(worker) {
  const { starting_wage, current_wage, season_count, department, start_date } = worker;
  if (!starting_wage || !start_date) return null;

  const cap = getWageCap(department, starting_wage);
  const atCap = current_wage >= cap;
  const daysIn = getDaysWorked(start_date);
  const past90 = daysIn >= 90;

  return {
    starting_wage,
    current_wage,
    cap,
    atCap,
    daysIn,
    past90,
    season_count: season_count || 0,
    headroom: +(cap - current_wage).toFixed(2),
  };
}
