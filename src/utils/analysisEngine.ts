import { Lead, AnalysisResult, MonthlyTrend, ChannelMixEntry, SignalStrengthEntry, HeatmapCell, ModelComparisonEntry, ScoringCardEntry, StaircaseEntry, Recommendations, RecommendationCard, BusinessParams } from '../types';

function parseDate(d: string): Date {
  return new Date(d + 'T00:00:00');
}

function daysBetween(a: string, b: string): number {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function monthKey(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key: string): string {
  const [year, month] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function runAnalysis(leads: Lead[], params: BusinessParams): AnalysisResult {
  const wonLeads = leads.filter(l => l.outcome === 'Won');
  const totalLeads = leads.length;

  // Basic metrics
  const currentConversionRate = wonLeads.length / totalLeads;
  const avgDealSize = params.avgDealSize || (wonLeads.reduce((s, l) => s + l.dealSize, 0) / wonLeads.length);
  const avgSalesCycle = wonLeads.reduce((s, l) => s + daysBetween(l.leadCreatedDate, l.outcomeDate), 0) / wonLeads.length;

  // Date range
  const dates = leads.map(l => l.leadCreatedDate).sort();
  const dateRange = { start: dates[0], end: dates[dates.length - 1] };

  // Monthly lead volume for annualization
  const monthsSpan = Math.max(1, new Set(leads.map(l => monthKey(l.leadCreatedDate))).size);
  const annualLeadVolume = (totalLeads / monthsSpan) * 12;
  const currentAnnualRevenue = Math.round(currentConversionRate * annualLeadVolume * avgDealSize);

  // Possible conversion rate: top quartile performance applied more broadly
  const possibleConversionRate = computePossibleConversionRate(leads);
  const possibleAnnualRevenue = Math.round(possibleConversionRate * annualLeadVolume * avgDealSize);
  const revenueGap = possibleAnnualRevenue - currentAnnualRevenue;

  // Monthly trends
  const monthlyTrends = computeMonthlyTrends(leads);

  // Channel mix trend
  const channelMixTrend = computeChannelMixTrend(leads);

  // Signal strength
  const signalStrength = computeSignalStrength(leads, currentConversionRate);

  // Heatmaps
  const segmentChannelHeatmap = computeHeatmap(leads, 'subVertical', 'leadSource', 'conversion');
  const revenueVelocityHeatmap = computeHeatmap(leads, 'subVertical', 'leadSource', 'velocity');

  // Scoring card from signal strength
  const scoringCard = buildScoringCard(signalStrength);

  // Model comparison (only if user provided weights)
  const modelComparison = params.hasCurrentWeights
    ? computeModelComparison(scoringCard, params.currentWeights)
    : [];

  // Staircase validation
  const staircaseData = computeStaircase(leads, scoringCard);
  const oldStaircaseData = params.hasCurrentWeights
    ? computeStaircaseFromWeights(leads, params.currentWeights)
    : [];

  // MQL threshold
  const mqlThreshold = computeMqlThreshold(leads, scoringCard);

  // Recommendations
  const recommendations = generateRecommendations(leads, signalStrength, segmentChannelHeatmap, revenueVelocityHeatmap, modelComparison, params);

  return {
    currentConversionRate,
    possibleConversionRate,
    currentAnnualRevenue,
    possibleAnnualRevenue,
    revenueGap,
    totalLeads,
    dateRange,
    avgDealSize,
    avgSalesCycle,
    monthlyTrends,
    channelMixTrend,
    signalStrength,
    segmentChannelHeatmap,
    revenueVelocityHeatmap,
    modelComparison,
    scoringCard,
    staircaseData,
    oldStaircaseData,
    mqlThreshold,
    recommendations,
  };
}

function computePossibleConversionRate(leads: Lead[]): number {
  // Score each lead by simple behavioral signals, then take top quartile conversion
  const scored = leads.map(l => {
    let score = 0;
    if (l.caseStudyPageViews >= 3) score += 30;
    else if (l.caseStudyPageViews >= 2) score += 15;
    if (l.pricingPageViews >= 3) score += 20;
    else if (l.pricingPageViews >= 2) score += 12;
    if (l.demoRequest) score += 25;
    if (l.returnVisits >= 3) score += 18;
    else if (l.returnVisits >= 2) score += 10;
    if (l.emailClicks >= 4) score += 12;
    if (l.chatEngaged) score += 8;
    if (l.contentDownloads >= 2) score += 10;
    // Channel-based
    if (l.leadSource === 'Partner Referral') score += 15;
    if (l.leadSource === 'Organic Search') score += 8;
    if (l.leadSource === 'Client Referral') score += 10;
    return { lead: l, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topQuartile = scored.slice(0, Math.ceil(scored.length * 0.25));
  const topWins = topQuartile.filter(s => s.lead.outcome === 'Won').length;
  const topRate = topWins / topQuartile.length;

  // The "possible" rate is a blend: assume shifting 30% of pipeline to look like top quartile
  const blendedRate = 0.7 * (leads.filter(l => l.outcome === 'Won').length / leads.length) + 0.3 * topRate;
  return Math.min(blendedRate, 0.25); // cap at 25%
}

function computeMonthlyTrends(leads: Lead[]): MonthlyTrend[] {
  const byMonth: Record<string, Lead[]> = {};
  leads.forEach(l => {
    const mk = monthKey(l.leadCreatedDate);
    if (!byMonth[mk]) byMonth[mk] = [];
    byMonth[mk].push(l);
  });

  return Object.keys(byMonth).sort().map(mk => {
    const monthLeads = byMonth[mk];
    const wins = monthLeads.filter(l => l.outcome === 'Won');
    const conversionRate = wins.length / monthLeads.length;
    const avgDS = wins.length > 0 ? wins.reduce((s, l) => s + l.dealSize, 0) / wins.length : 0;
    const avgDTC = wins.length > 0 ? wins.reduce((s, l) => s + daysBetween(l.leadCreatedDate, l.outcomeDate), 0) / wins.length : 30;
    return {
      month: formatMonth(mk),
      conversionRate: Math.round(conversionRate * 1000) / 10,
      leadVolume: monthLeads.length,
      avgDealSize: Math.round(avgDS),
      avgDaysToClose: Math.round(avgDTC),
      revenueVelocity: avgDTC > 0 ? Math.round(avgDS / avgDTC) : 0,
    };
  });
}

function computeChannelMixTrend(leads: Lead[]): ChannelMixEntry[] {
  const channels = Array.from(new Set(leads.map(l => l.leadSource))).sort();
  const byMonth: Record<string, Lead[]> = {};
  leads.forEach(l => {
    const mk = monthKey(l.leadCreatedDate);
    if (!byMonth[mk]) byMonth[mk] = [];
    byMonth[mk].push(l);
  });

  return Object.keys(byMonth).sort().map(mk => {
    const monthLeads = byMonth[mk];
    const entry: ChannelMixEntry = { month: formatMonth(mk) };
    channels.forEach(ch => {
      entry[ch] = monthLeads.filter(l => l.leadSource === ch).length;
    });
    return entry;
  });
}

function computeSignalStrength(leads: Lead[], baselineRate: number): SignalStrengthEntry[] {
  const entries: SignalStrengthEntry[] = [];

  // Behavioral signals
  const behavioralFactors: { name: string; key: string; segments: { label: string; filter: (l: Lead) => boolean }[] }[] = [
    {
      name: 'Pricing Page Views', key: 'pricingPageViews',
      segments: [
        { label: '0', filter: l => l.pricingPageViews === 0 },
        { label: '1', filter: l => l.pricingPageViews === 1 },
        { label: '2', filter: l => l.pricingPageViews === 2 },
        { label: '3+', filter: l => l.pricingPageViews >= 3 },
      ]
    },
    {
      name: 'Case Study Views', key: 'caseStudyPageViews',
      segments: [
        { label: '0', filter: l => l.caseStudyPageViews === 0 },
        { label: '1', filter: l => l.caseStudyPageViews === 1 },
        { label: '2', filter: l => l.caseStudyPageViews === 2 },
        { label: '3+', filter: l => l.caseStudyPageViews >= 3 },
      ]
    },
    {
      name: 'Demo Request', key: 'demoRequest',
      segments: [
        { label: 'Yes', filter: l => l.demoRequest === true },
        { label: 'No', filter: l => l.demoRequest === false },
      ]
    },
    {
      name: 'Chat Engaged', key: 'chatEngaged',
      segments: [
        { label: 'Yes', filter: l => l.chatEngaged === true },
        { label: 'No', filter: l => l.chatEngaged === false },
      ]
    },
    {
      name: 'Content Downloads', key: 'contentDownloads',
      segments: [
        { label: '0', filter: l => l.contentDownloads === 0 },
        { label: '1', filter: l => l.contentDownloads === 1 },
        { label: '2+', filter: l => l.contentDownloads >= 2 },
      ]
    },
    {
      name: 'Webinar Attended', key: 'webinarAttended',
      segments: [
        { label: 'Yes', filter: l => l.webinarAttended === true },
        { label: 'No', filter: l => l.webinarAttended === false },
      ]
    },
    {
      name: 'Email Clicks', key: 'emailClicks',
      segments: [
        { label: '0', filter: l => l.emailClicks === 0 },
        { label: '1-3', filter: l => l.emailClicks >= 1 && l.emailClicks <= 3 },
        { label: '4+', filter: l => l.emailClicks >= 4 },
      ]
    },
    {
      name: 'Return Visits (14d)', key: 'returnVisits',
      segments: [
        { label: '0', filter: l => l.returnVisits === 0 },
        { label: '1', filter: l => l.returnVisits === 1 },
        { label: '2', filter: l => l.returnVisits === 2 },
        { label: '3+', filter: l => l.returnVisits >= 3 },
      ]
    },
  ];

  // Categorical signals
  const categoricalFactors = [
    { name: 'Segment', key: 'segment' },
    { name: 'Sub-Vertical', key: 'subVertical' },
    { name: 'Lead Source', key: 'leadSource' },
    { name: 'Geography', key: 'geography' },
    { name: 'Company Revenue', key: 'companyRevenue' },
    { name: 'Employee Count', key: 'employeeCount' },
    { name: 'Locations', key: 'locations' },
  ];

  behavioralFactors.forEach(factor => {
    factor.segments.forEach(seg => {
      const matching = leads.filter(seg.filter);
      const wins = matching.filter(l => l.outcome === 'Won').length;
      const cr = matching.length > 0 ? wins / matching.length : 0;
      const lift = baselineRate > 0 ? cr / baselineRate : 0;
      entries.push({
        factor: factor.name,
        segmentValue: seg.label,
        totalLeads: matching.length,
        wins,
        conversionRate: Math.round(cr * 1000) / 10,
        lift: Math.round(lift * 100) / 100,
        confidence: matching.length >= 100 ? 'High' : matching.length >= 30 ? 'Medium' : 'Low',
      });
    });
  });

  categoricalFactors.forEach(factor => {
    const values = Array.from(new Set(leads.map(l => String(l[factor.key])))).sort();
    values.forEach(val => {
      const matching = leads.filter(l => String(l[factor.key]) === val);
      const wins = matching.filter(l => l.outcome === 'Won').length;
      const cr = matching.length > 0 ? wins / matching.length : 0;
      const lift = baselineRate > 0 ? cr / baselineRate : 0;
      entries.push({
        factor: factor.name,
        segmentValue: val,
        totalLeads: matching.length,
        wins,
        conversionRate: Math.round(cr * 1000) / 10,
        lift: Math.round(lift * 100) / 100,
        confidence: matching.length >= 100 ? 'High' : matching.length >= 30 ? 'Medium' : 'Low',
      });
    });
  });

  return entries.sort((a, b) => b.lift - a.lift);
}

function computeHeatmap(leads: Lead[], rowKey: string, colKey: string, mode: 'conversion' | 'velocity'): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const rows = Array.from(new Set(leads.map(l => String(l[rowKey])))).sort();
  const cols = Array.from(new Set(leads.map(l => String(l[colKey])))).sort();

  rows.forEach(row => {
    cols.forEach(col => {
      const matching = leads.filter(l => String(l[rowKey]) === row && String(l[colKey]) === col);
      if (matching.length < 3) return;
      const wins = matching.filter(l => l.outcome === 'Won');
      const cr = wins.length / matching.length;
      const avgDS = wins.length > 0 ? wins.reduce((s, l) => s + l.dealSize, 0) / wins.length : 0;
      const avgSC = wins.length > 0 ? wins.reduce((s, l) => s + daysBetween(l.leadCreatedDate, l.outcomeDate), 0) / wins.length : 30;
      const rv = avgSC > 0 ? avgDS / avgSC : 0;
      cells.push({
        row,
        col,
        conversionRate: Math.round(cr * 1000) / 10,
        leadCount: matching.length,
        avgDealSize: Math.round(avgDS),
        avgSalesCycle: Math.round(avgSC),
        revenueVelocity: Math.round(rv),
      });
    });
  });

  return cells;
}

function buildScoringCard(signals: SignalStrengthEntry[]): ScoringCardEntry[] {
  const card: ScoringCardEntry[] = [];

  const behavioralFactors = ['Pricing Page Views', 'Case Study Views', 'Demo Request', 'Chat Engaged', 'Content Downloads', 'Webinar Attended', 'Email Clicks', 'Return Visits (14d)'];
  const channelFactors = ['Lead Source'];

  signals.forEach(sig => {
    if (sig.lift <= 0.5) return;
    if (sig.confidence === 'Low' && sig.lift < 1.5) return;

    let category: 'Behavioral' | 'Channel' | 'Firmographic';
    if (behavioralFactors.includes(sig.factor)) category = 'Behavioral';
    else if (channelFactors.includes(sig.factor)) category = 'Channel';
    else category = 'Firmographic';

    const points = Math.round(sig.lift * 10);

    card.push({
      factor: sig.factor,
      segment: sig.segmentValue,
      category,
      points,
      lift: sig.lift,
    });
  });

  return card.sort((a, b) => b.points - a.points);
}

function computeModelComparison(scoringCard: ScoringCardEntry[], currentWeights: { factor: string; points: number }[]): ModelComparisonEntry[] {
  const entries: ModelComparisonEntry[] = [];
  const evidenceMap = new Map<string, { points: number; lift: number }>();

  scoringCard.forEach(c => {
    const key = `${c.factor}: ${c.segment}`;
    if (!evidenceMap.has(key) || c.lift > (evidenceMap.get(key)?.lift || 0)) {
      evidenceMap.set(key, { points: c.points, lift: c.lift });
    }
  });

  // Check each current weight against evidence
  currentWeights.forEach(cw => {
    // Try to find matching evidence entry
    let bestMatch: { points: number; lift: number } | undefined;
    let matchKey = '';
    evidenceMap.forEach((val, key) => {
      if (key.toLowerCase().includes(cw.factor.toLowerCase())) {
        if (!bestMatch || val.lift > bestMatch.lift) {
          bestMatch = val;
          matchKey = key;
        }
      }
    });

    if (bestMatch) {
      const ratio = cw.points / bestMatch.points;
      let status: 'overweighted' | 'underweighted' | 'aligned';
      if (ratio > 1.5) status = 'overweighted';
      else if (ratio < 0.6) status = 'underweighted';
      else status = 'aligned';

      entries.push({
        factor: cw.factor,
        currentPoints: cw.points,
        evidencePoints: bestMatch.points,
        lift: bestMatch.lift,
        status,
      });
      evidenceMap.delete(matchKey);
    } else {
      entries.push({
        factor: cw.factor,
        currentPoints: cw.points,
        evidencePoints: 0,
        lift: 0,
        status: 'overweighted',
      });
    }
  });

  // Find missing signals (high-lift signals not in current model)
  evidenceMap.forEach((val, key) => {
    if (val.lift >= 1.5) {
      entries.push({
        factor: key,
        currentPoints: 0,
        evidencePoints: val.points,
        lift: val.lift,
        status: 'missing',
      });
    }
  });

  return entries.sort((a, b) => {
    const statusOrder = { missing: 0, underweighted: 1, overweighted: 2, aligned: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
}

function scoreLead(lead: Lead, scoringCard: ScoringCardEntry[]): number {
  let totalScore = 0;
  scoringCard.forEach(card => {
    let matches = false;
    const val = lead[card.factor === 'Case Study Views' ? 'caseStudyPageViews'
      : card.factor === 'Pricing Page Views' ? 'pricingPageViews'
      : card.factor === 'Return Visits (14d)' ? 'returnVisits'
      : card.factor === 'Email Clicks' ? 'emailClicks'
      : card.factor === 'Content Downloads' ? 'contentDownloads'
      : card.factor === 'Demo Request' ? 'demoRequest'
      : card.factor === 'Chat Engaged' ? 'chatEngaged'
      : card.factor === 'Webinar Attended' ? 'webinarAttended'
      : card.factor === 'Lead Source' ? 'leadSource'
      : card.factor === 'Segment' ? 'segment'
      : card.factor === 'Sub-Vertical' ? 'subVertical'
      : card.factor === 'Company Revenue' ? 'companyRevenue'
      : card.factor === 'Employee Count' ? 'employeeCount'
      : card.factor === 'Locations' ? 'locations'
      : card.factor === 'Geography' ? 'geography'
      : card.factor];

    if (card.segment.includes('+')) {
      const threshold = parseInt(card.segment);
      if (typeof val === 'number' && val >= threshold) matches = true;
    } else if (card.segment === 'Yes') {
      if (val === true || val === 'Yes') matches = true;
    } else if (card.segment === 'No') {
      if (val === false || val === 'No') matches = true;
    } else if (typeof val === 'number') {
      if (val === parseInt(card.segment)) matches = true;
    } else {
      if (String(val) === card.segment) matches = true;
    }

    if (matches) {
      totalScore += card.points;
    }
  });
  return totalScore;
}

function computeStaircase(leads: Lead[], scoringCard: ScoringCardEntry[]): StaircaseEntry[] {
  const scored = leads.map(l => ({ lead: l, score: scoreLead(l, scoringCard) }));
  scored.sort((a, b) => b.score - a.score);

  const quartileSize = Math.ceil(scored.length / 4);
  const quartiles = [
    { label: 'Q1 (Top)', items: scored.slice(0, quartileSize) },
    { label: 'Q2', items: scored.slice(quartileSize, quartileSize * 2) },
    { label: 'Q3', items: scored.slice(quartileSize * 2, quartileSize * 3) },
    { label: 'Q4 (Bottom)', items: scored.slice(quartileSize * 3) },
  ];

  return quartiles.map((q, i) => {
    const wins = q.items.filter(s => s.lead.outcome === 'Won').length;
    const cr = q.items.length > 0 ? wins / q.items.length : 0;
    return {
      quartile: `Q${i + 1}`,
      conversionRate: Math.round(cr * 1000) / 10,
      leadCount: q.items.length,
      label: q.label,
    };
  });
}

function computeStaircaseFromWeights(leads: Lead[], weights: { factor: string; points: number }[]): StaircaseEntry[] {
  // Build a simple scoring card from weights
  const simpleCard: ScoringCardEntry[] = weights.map(w => ({
    factor: w.factor,
    segment: 'Yes',
    category: 'Behavioral' as const,
    points: w.points,
    lift: 1,
  }));
  return computeStaircase(leads, simpleCard);
}

function computeMqlThreshold(leads: Lead[], scoringCard: ScoringCardEntry[]): number {
  const scored = leads.map(l => ({ lead: l, score: scoreLead(l, scoringCard) }));
  scored.sort((a, b) => b.score - a.score);

  // Find score threshold that captures ~70% of eventual wins while filtering ~50% of non-converters
  const totalWins = scored.filter(s => s.lead.outcome === 'Won').length;
  let cumWins = 0;
  let threshold = 0;

  for (const s of scored) {
    if (s.lead.outcome === 'Won') cumWins++;
    if (cumWins >= totalWins * 0.7) {
      threshold = s.score;
      break;
    }
  }

  return threshold;
}

function generateRecommendations(
  leads: Lead[],
  signals: SignalStrengthEntry[],
  heatmap: HeatmapCell[],
  velocityMap: HeatmapCell[],
  modelComparison: ModelComparisonEntry[],
  params: BusinessParams,
): Recommendations {
  // Push harder: top 3 by revenue potential
  const cellsWithPotential = heatmap
    .filter(c => c.leadCount >= 5)
    .map(c => {
      const velocityCell = velocityMap.find(v => v.row === c.row && v.col === c.col);
      const annualPotential = (c.conversionRate / 100) * c.leadCount * 12 * (c.avgDealSize || params.avgDealSize);
      return {
        ...c,
        revenueVelocity: velocityCell?.revenueVelocity || c.revenueVelocity,
        annualPotential,
      };
    })
    .sort((a, b) => b.annualPotential - a.annualPotential);

  const baselineRate = leads.filter(l => l.outcome === 'Won').length / leads.length;

  const pushHarder: RecommendationCard[] = cellsWithPotential.slice(0, 3).map(c => ({
    segment: c.row,
    channel: c.col,
    conversionRate: c.conversionRate,
    lift: Math.round((c.conversionRate / 100 / baselineRate) * 100) / 100,
    avgDealSize: c.avgDealSize,
    revenueVelocity: c.revenueVelocity,
    annualRevenuePotential: Math.round(c.annualPotential),
    description: `${c.row} leads from ${c.col} convert at ${c.conversionRate}% with $${c.avgDealSize.toLocaleString()} avg deal size. Increasing volume here by 20% would add ~$${Math.round(c.annualPotential * 0.2).toLocaleString()} in annual pipeline.`,
  }));

  const pullBack: RecommendationCard[] = cellsWithPotential
    .filter(c => c.conversionRate < baselineRate * 100 * 0.6)
    .slice(-3)
    .reverse()
    .map(c => ({
      segment: c.row,
      channel: c.col,
      conversionRate: c.conversionRate,
      lift: Math.round((c.conversionRate / 100 / baselineRate) * 100) / 100,
      avgDealSize: c.avgDealSize,
      revenueVelocity: c.revenueVelocity,
      annualRevenuePotential: Math.round(c.annualPotential),
      description: `${c.row} leads from ${c.col} convert at only ${c.conversionRate}% with below-average deal sizes. Budget spent here yields minimal return.`,
    }));

  // Actions
  const actions: string[] = [];

  // Find high-lift underweighted/missing signals
  const highLift = signals.filter(s => s.lift >= 2.0 && s.confidence !== 'Low').slice(0, 3);
  highLift.forEach(s => {
    actions.push(`Add ${s.factor} (${s.segmentValue}) to your scoring model at ${Math.round(s.lift * 10)} points — this signal has a ${s.lift}x lift and is a strong conversion predictor.`);
  });

  // Webinar noise
  const webinarSignal = signals.find(s => s.factor === 'Webinar Attended' && s.segmentValue === 'Yes');
  if (webinarSignal && webinarSignal.lift < 1.3) {
    actions.push(`Reduce scoring weight on webinar attendance — data shows it converts near baseline (${webinarSignal.lift}x lift). These points are noise in your model.`);
  }

  // Overweighted signals from model comparison
  modelComparison.filter(m => m.status === 'overweighted').slice(0, 2).forEach(m => {
    actions.push(`Reduce scoring weight on "${m.factor}" from ${m.currentPoints} to ${m.evidencePoints} — evidence shows ${m.lift}x lift vs your current ${m.currentPoints}-point allocation.`);
  });

  // Sales cycle insight
  const homeServicesCycle = leads.filter(l => l.segment === 'Home Services' && l.outcome === 'Won');
  const legalCycle = leads.filter(l => l.segment === 'Legal' && l.outcome === 'Won');
  if (homeServicesCycle.length > 0 && legalCycle.length > 0) {
    const hsAvg = homeServicesCycle.reduce((s, l) => s + daysBetween(l.leadCreatedDate, l.outcomeDate), 0) / homeServicesCycle.length;
    const legAvg = legalCycle.reduce((s, l) => s + daysBetween(l.leadCreatedDate, l.outcomeDate), 0) / legalCycle.length;
    const ratio = Math.round(legAvg / hsAvg * 10) / 10;
    if (ratio > 2) {
      actions.push(`Your sales cycle for legal leads is ${ratio}x longer than home services — consider separate pipeline management and adjusted SLA expectations.`);
    }
  }

  // Partner referral insight
  const partnerLegal = signals.find(s => s.factor === 'Lead Source' && s.segmentValue === 'Partner Referral');
  if (partnerLegal && partnerLegal.lift >= 2.5) {
    actions.push(`Investigate why partner referrals have a ${partnerLegal.lift}x lift — consider increasing co-marketing partnerships.`);
  }

  // Ensure at least 3 actions
  if (actions.length < 3) {
    actions.push('Review your lead routing rules to ensure high-scoring leads get faster follow-up from your best closers.');
  }
  if (actions.length < 4) {
    actions.push('Set up automated alerts for leads scoring above your MQL threshold to reduce response time.');
  }

  return { pushHarder, pullBack, actions: actions.slice(0, 5) };
}
