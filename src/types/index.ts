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
  punchInTime: string | null;
  punchInPhotoUrl: string | null;
  punchOutTime: string | null;
  queuedJob?: Job | null;
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
