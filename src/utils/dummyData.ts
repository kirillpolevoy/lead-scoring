import { Lead } from '../types';

const US_STATES = [
  'California', 'Texas', 'Florida', 'New York', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan',
  'Arizona', 'Colorado', 'Tennessee', 'Virginia', 'Washington',
  'Massachusetts', 'Maryland', 'Minnesota', 'Oregon', 'Nevada'
];

const HOME_SERVICES_SUBS = ['HVAC', 'Plumbing', 'Roofing', 'Electrical', 'Pest Control', 'Landscaping'];
const LEGAL_SUBS = ['Personal Injury', 'Family Law', 'Criminal Defense', 'Estate Planning', 'Immigration', 'Bankruptcy'];

const LEAD_SOURCES = [
  'Organic Search', 'Paid Search', 'Facebook/Instagram', 'LinkedIn',
  'Partner Referral', 'Direct/Brand', 'Content Download', 'Webinar',
  'Event', 'Client Referral'
];

const REVENUE_RANGES = ['<$500K', '$500K-$1M', '$1M-$5M', '$5M-$10M', '$10M+'];
const EMPLOYEE_COUNTS = ['1-10', '11-50', '51-200', '200+'];
const LOCATION_COUNTS = ['1', '2-5', '6+'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randomDate(start: Date, end: Date, rand: () => number): Date {
  const time = start.getTime() + rand() * (end.getTime() - start.getTime());
  return new Date(time);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedPick<T>(arr: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

export function generateDummyData(count: number = 2000): Lead[] {
  const rand = seededRandom(42);
  const leads: Lead[] = [];

  const startDate = new Date('2025-02-01');
  const endDate = new Date('2026-01-31');

  for (let i = 0; i < count; i++) {
    const segment = weightedPick(
      ['Home Services', 'Legal'],
      [55, 45],
      rand
    );

    let subVertical: string;
    if (segment === 'Home Services') {
      subVertical = weightedPick(
        HOME_SERVICES_SUBS,
        [30, 25, 15, 12, 10, 8],
        rand
      );
    } else {
      subVertical = weightedPick(
        LEGAL_SUBS,
        [30, 20, 15, 15, 12, 8],
        rand
      );
    }

    // Lead source distribution - segment-specific
    let leadSource: string;
    if (segment === 'Legal') {
      leadSource = weightedPick(
        LEAD_SOURCES,
        [20, 20, 10, 8, 15, 8, 7, 5, 4, 3],
        rand
      );
    } else {
      leadSource = weightedPick(
        LEAD_SOURCES,
        [25, 22, 12, 5, 3, 10, 8, 6, 5, 4],
        rand
      );
    }

    // Lead created date - roughly uniform across months
    const leadCreatedDate = randomDate(startDate, endDate, rand);
    // Behavioral signals
    const pricingPageViews = weightedPick([0, 1, 2, 3], [30, 35, 20, 15], rand);
    const caseStudyPageViews = weightedPick([0, 1, 2, 3], [40, 30, 18, 12], rand);
    const demoRequest = rand() < 0.15;
    const chatEngaged = rand() < 0.25;
    const contentDownloads = weightedPick([0, 1, 2], [50, 30, 20], rand);
    const webinarAttended = rand() < 0.12;
    const emailClicks = weightedPick([0, 2, 5], [40, 35, 25], rand);
    const returnVisits = weightedPick([0, 1, 2, 3], [35, 30, 20, 15], rand);

    const geography = pick(US_STATES, rand);
    const companyRevenue = weightedPick(REVENUE_RANGES, [15, 25, 35, 15, 10], rand);
    const employeeCount = weightedPick(EMPLOYEE_COUNTS, [20, 35, 30, 15], rand);
    const locations = weightedPick(LOCATION_COUNTS, [40, 40, 20], rand);

    // === CONVERSION LOGIC WITH HIDDEN SIGNALS ===
    let conversionProb = 0.09; // baseline ~9%

    // Signal 1: Case study page views 3+ → 3.2x lift
    if (caseStudyPageViews >= 3) {
      conversionProb *= 3.2;
    } else if (caseStudyPageViews === 2) {
      conversionProb *= 1.5;
    } else if (caseStudyPageViews === 1) {
      conversionProb *= 1.1;
    }

    // Signal 2: HVAC from organic search → highest converting (~22%)
    if (subVertical === 'HVAC' && leadSource === 'Organic Search') {
      conversionProb = Math.max(conversionProb, 0.22);
      conversionProb *= 1.3;
    }

    // Signal 3: Criminal defense from paid social → very low (~2%)
    if (subVertical === 'Criminal Defense' && (leadSource === 'Facebook/Instagram' || leadSource === 'LinkedIn')) {
      conversionProb = 0.02;
    }

    // Signal 4: Webinar attendance → baseline (noise)
    // Intentionally NO boost for webinar

    // Signal 5: Partner referral + legal → 4x lift
    if (leadSource === 'Partner Referral' && segment === 'Legal') {
      conversionProb *= 4.0;
    }

    // Signal 6: Paid search conversion declining over 12 months
    if (leadSource === 'Paid Search') {
      const monthFraction = (leadCreatedDate.getTime() - startDate.getTime()) /
        (endDate.getTime() - startDate.getTime());
      const decayFactor = 1.0 - (monthFraction * 0.55); // drops from ~12% to ~6%
      conversionProb *= decayFactor;
    }

    // Other behavioral boosts
    if (demoRequest) conversionProb *= 2.0;
    if (pricingPageViews >= 3) conversionProb *= 1.8;
    else if (pricingPageViews === 2) conversionProb *= 1.3;
    if (returnVisits >= 3) conversionProb *= 1.6;
    else if (returnVisits >= 2) conversionProb *= 1.2;
    if (emailClicks >= 4) conversionProb *= 1.4;
    if (chatEngaged) conversionProb *= 1.15;
    if (contentDownloads >= 2) conversionProb *= 1.2;

    // Company size signals
    if (companyRevenue === '$5M-$10M' || companyRevenue === '$10M+') {
      conversionProb *= 1.3;
    }
    if (locations === '6+') conversionProb *= 1.2;

    // Segment-level adjustments
    if (segment === 'Home Services') {
      conversionProb *= 1.05;
    }

    // Cap at 0.85
    conversionProb = Math.min(conversionProb, 0.85);

    // Determine outcome
    let outcome: 'Won' | 'Lost' | 'Disqualified';
    const roll = rand();
    if (roll < conversionProb) {
      outcome = 'Won';
    } else if (roll < conversionProb + 0.15) {
      outcome = 'Disqualified';
    } else {
      outcome = 'Lost';
    }

    // Deal size
    let dealSize: number;
    if (segment === 'Home Services') {
      const baseDeal: Record<string, number> = {
        'HVAC': 8000, 'Plumbing': 6000, 'Roofing': 12000,
        'Electrical': 7000, 'Pest Control': 4000, 'Landscaping': 5000
      };
      dealSize = (baseDeal[subVertical] || 7000) * (0.5 + rand() * 1.0);
    } else {
      const baseDeal: Record<string, number> = {
        'Personal Injury': 15000, 'Family Law': 10000, 'Criminal Defense': 8000,
        'Estate Planning': 12000, 'Immigration': 7000, 'Bankruptcy': 6000
      };
      dealSize = (baseDeal[subVertical] || 10000) * (0.5 + rand() * 1.0);
    }
    dealSize = Math.round(dealSize);

    // Sales cycle - Signal 7: Home services closes 3x faster than legal
    let salesCycleDays: number;
    if (segment === 'Home Services') {
      salesCycleDays = Math.round(7 + rand() * 23); // 7-30 days
    } else {
      salesCycleDays = Math.round(14 + rand() * 46); // 14-60 days
    }

    const outcomeDate = new Date(leadCreatedDate);
    outcomeDate.setDate(outcomeDate.getDate() + salesCycleDays);

    leads.push({
      id: `LEAD-${String(i + 1).padStart(4, '0')}`,
      leadCreatedDate: leadCreatedDate.toISOString().split('T')[0],
      outcomeDate: outcomeDate.toISOString().split('T')[0],
      outcome,
      segment,
      subVertical,
      leadSource,
      geography,
      dealSize,
      companyRevenue,
      employeeCount,
      locations,
      pricingPageViews,
      caseStudyPageViews,
      demoRequest,
      chatEngaged,
      contentDownloads,
      webinarAttended,
      emailClicks,
      returnVisits,
    });
  }

  return leads;
}

export function leadsToCsvString(leads: Lead[]): string {
  if (leads.length === 0) return '';
  const headers = Object.keys(leads[0]);
  const rows = leads.map(lead =>
    headers.map(h => {
      const val = lead[h];
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return String(val);
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function getDefaultColumnMapping(): Record<string, string> {
  return {
    outcome: 'outcome',
    leadCreatedDate: 'leadCreatedDate',
    outcomeDate: 'outcomeDate',
    dealSize: 'dealSize',
    segment: 'segment',
    subVertical: 'subVertical',
    leadSource: 'leadSource',
    geography: 'geography',
    companySize: 'employeeCount',
  };
}
