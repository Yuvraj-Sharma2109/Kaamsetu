export type Language = 'hi' | 'en' | 'bn' | 'te' | 'mr';

export type TradeCategory = 
  | 'mason'
  | 'helper'
  | 'painter'
  | 'electrician'
  | 'plumber'
  | 'carpenter'
  | 'welder'
  | 'loader';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface TradeInfo {
  id: TradeCategory;
  nameEn: string;
  nameHi: string;
  icon: string;
}

export interface Job {
  id: string;
  title: string;
  titleHi: string;
  trade: TradeCategory;
  categoryName: string;
  categoryNameHi: string;
  contractorName: string;
  contractorCompany: string;
  contractorRating: number;
  contractorVerified: boolean;
  contractorPhone: string;
  siteName: string;
  locationAddress: string;
  locationCoordinates?: GeoPoint;
  isDemo?: boolean;
  demoSourceId?: string;
  landmark: string;
  distanceKm: number;
  travelTimeMin: number;
  agreedAmount: number;
  wageType: 'daily' | 'hourly' | 'task';
  overtimeRatePerHour: number;
  durationDays: number;
  hoursPerDay: number;
  startTime: string;
  endTime: string;
  paymentMode: 'escrow_upi' | 'cash_on_punchout' | 'instant_bank';
  escrowLocked: boolean;
  perks: {
    lunchProvided: boolean;
    travelBonusAmount?: number;
    toolsProvided: boolean;
    teaSnacks: boolean;
  };
  requirements: string[];
  requirementsHi: string[];
  spokenNarration: string;
  spokenNarrationHi: string;
  urgency: 'immediate' | 'tomorrow' | 'scheduled';
  spotsAvailable: number;
  workplaceType?: 'construction_site' | 'home' | 'office';
  postedByType?: 'contractor' | 'homeowner' | 'office';
}

export interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  authEmail?: string;
  authPhotoURL?: string;
  primaryTrade: TradeCategory;
  secondaryTrades: TradeCategory[];
  experienceYears: number;
  rating: number;
  totalJobsCompleted: number;
  isKycVerified: boolean;
  currentLocation: string;
  toolsOwned: string[];
  preferredRadiusKm: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface ShiftState {
  isActive: boolean;
  job: Job | null;
  status: 'assigned' | 'traveling' | 'arrived' | 'punched_in' | 'completed';
  otpEntryStarted?: boolean;
  startedFromQueue?: boolean;
  punchInTime: string | null;
  punchInPhotoUrl: string | null;
  punchOutTime: string | null;
  queuedJob?: Job | null;
  additionalWorkRequests?: AdditionalWorkRequest[];
}

export type PaymentCollectionMethod = 'cash' | 'upi' | 'wallet';

export interface AdditionalWorkEvidence {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface AdditionalWorkEstimateSource {
  title: string;
  url: string;
}

export interface AdditionalWorkEstimate {
  status: 'estimated' | 'further_inspection_required';
  detectedWork: string;
  complexity: 'basic' | 'moderate' | 'complex' | 'unknown';
  process: string[];
  estimatedTimeMinMinutes: number | null;
  estimatedTimeMaxMinutes: number | null;
  requiredSkills: string[];
  requiredTools: string[];
  requiredMaterials: string[];
  marketLabourMin: number | null;
  marketLabourMax: number | null;
  marketRateBasis: string;
  suggestedLabourMin: number | null;
  suggestedLabourMax: number | null;
  materialCostMin: number | null;
  materialCostMax: number | null;
  estimatedTotalMin: number | null;
  estimatedTotalMax: number | null;
  priceReasoning: string;
  inspectionReason: string;
  hiddenDamageNote: string;
  researchDate: string;
  sources: AdditionalWorkEstimateSource[];
}

export interface AdditionalWorkRequest {
  id: string;
  description: string;
  evidence: AdditionalWorkEvidence[];
  suggestedLabourMin: number;
  suggestedLabourMax: number;
  proposedLabour: number;
  materialEstimate: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  confirmedAt?: string;
  estimate?: AdditionalWorkEstimate;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  type: 'credit' | 'debit';
  amount: number;
  title: string;
  titleHi: string;
  referenceId: string;
  status: 'settled' | 'processing';
  paymentMode: string;
}
