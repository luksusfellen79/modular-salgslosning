export interface NBARecommendation {
  product: string;
  campaign: string;
  extras: string[];
  headline: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface NBAOutcome {
  unitId: string;
  buildingId: string;
  recommendedProduct: string;
  recommendedCampaign: string;
  actualOutcome: 'sold' | 'rejected' | 'no_answer' | 'followup' | 'marketing';
  actualProducts: string[];
  hitRecommendation: boolean; // did they sell what was recommended?
  loggedAt: string;
}
