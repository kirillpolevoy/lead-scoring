export interface Lead {
  id: string;
  leadCreatedDate: string;
  outcomeDate: string;
  outcome: 'Won' | 'Lost' | 'Disqualified';
  segment: string;
  subVertical: string;
  leadSource: string;
  geography: string;
  dealSize: number;
  companyRevenue: string;
  employeeCount: string;
  locations: string;
  pricingPageViews: number;
  caseStudyPageViews: number;
  demoRequest: boolean;
  chatEngaged: boolean;
  contentDownloads: number;
  webinarAttended: boolean;
  emailClicks: number;
  returnVisits: number;
  [key: string]: string | number | boolean;
}

export interface ColumnMapping {
  outcome: string;
  leadCreatedDate: string;
  outcomeDate: string;
  dealSize: string;
  segment: string;
  subVertical: string;
  leadSource: string;
  geography: string;
  companySize: string;
}

export interface ScoringWeight {
  factor: string;
  points: number;
}

export interface BusinessParams {
  avgDealSize: number;
  monthlyLeadVolume: number;
  currentWeights: ScoringWeight[];
  hasCurrentWeights: boolean;
}

export interface AnalysisResult {
  currentConversionRate: number;
  possibleConversionRate: number;
  currentAnnualRevenue: number;
  possibleAnnualRevenue: number;
  revenueGap: number;
  totalLeads: number;
  dateRange: { start: string; end: string };
  avgDealSize: number;
  avgSalesCycle: number;
  monthlyTrends: MonthlyTrend[];
  channelMixTrend: ChannelMixEntry[];
  signalStrength: SignalStrengthEntry[];
  segmentChannelHeatmap: HeatmapCell[];
  revenueVelocityHeatmap: HeatmapCell[];
  modelComparison: ModelComparisonEntry[];
  scoringCard: ScoringCardEntry[];
  staircaseData: StaircaseEntry[];
  oldStaircaseData: StaircaseEntry[];
  mqlThreshold: number;
  recommendations: Recommendations;
}

export interface MonthlyTrend {
  month: string;
  conversionRate: number;
  leadVolume: number;
  avgDealSize: number;
  avgDaysToClose: number;
  revenueVelocity: number;
}

export interface ChannelMixEntry {
  month: string;
  [channel: string]: string | number;
}

export interface SignalStrengthEntry {
  factor: string;
  segmentValue: string;
  totalLeads: number;
  wins: number;
  conversionRate: number;
  lift: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface HeatmapCell {
  row: string;
  col: string;
  conversionRate: number;
  leadCount: number;
  avgDealSize: number;
  avgSalesCycle: number;
  revenueVelocity: number;
}

export interface ModelComparisonEntry {
  factor: string;
  currentPoints: number;
  evidencePoints: number;
  lift: number;
  status: 'overweighted' | 'underweighted' | 'missing' | 'aligned';
}

export interface ScoringCardEntry {
  factor: string;
  segment: string;
  category: 'Firmographic' | 'Behavioral' | 'Channel';
  points: number;
  lift: number;
  editable?: boolean;
}

export interface StaircaseEntry {
  quartile: string;
  conversionRate: number;
  leadCount: number;
  label: string;
}

export interface Recommendations {
  pushHarder: RecommendationCard[];
  pullBack: RecommendationCard[];
  actions: string[];
}

export interface RecommendationCard {
  segment: string;
  channel: string;
  conversionRate: number;
  lift: number;
  avgDealSize: number;
  revenueVelocity: number;
  annualRevenuePotential: number;
  description: string;
}

export type AppScreen = 'setup' | 'headline' | 'trends' | 'diagnostic' | 'model-broken' | 'scoring' | 'recommendations';
