import { create } from 'zustand';

export type UserRole = 'consultant' | 'admin' | 'support';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type CaseStatus = 'open' | 'closed' | 'pending';
export type CommunicationType = 'email' | 'phone' | 'meeting' | 'other';
export type ClaimType = 'insured' | 'self-insured';
export type JurisdictionType = 'VIC' | 'NSW' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT';

export interface SupervisorNote {
  id: string;
  content: string;
  author: string;
  authorRole: 'admin' | 'consultant';
  createdAt: string;
  type: 'instruction' | 'question' | 'reply' | 'general';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'acknowledged' | 'resolved';
  parentId?: string; // For replies
  requiresResponse?: boolean;
  readBy: string[]; // Array of user IDs who have read this note
}

export interface CaseNote {
  id: string;
  content: string;
  createdAt: string;
  author: string;
}

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
}

export interface Employer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export interface CaseManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
  size: number;
  category?: 'medical' | 'legal' | 'correspondence' | 'form' | 'other';
  metadata?: {
    jurisdiction?: JurisdictionType;
    formType?: string;
    expiryDate?: string;
    issuedBy?: string;
  };
}

export interface Communication {
  id: string;
  type: CommunicationType;
  date: string;
  content: string;
  author: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  assignedTo?: string;
}

export interface RtwPlan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  goals: string[];
  tasks: Task[];
  reviewDate: string;
  status: 'draft' | 'active' | 'completed';

  // --- PDF Mapping Fields ---
  claimNumber?: string;
  preInjuryJobTitle?: string;
  preInjuryWorkHours?: string;
  preInjuryLocation?: string;
  employerName?: string;
  dutiesToBeUndertaken?: string;
  supportsOrModifications?: string;
  dutiesToBeAvoided?: string;
  medicalRestrictions?: string;
  hoursOfWork?: {
    week1?: { monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string; sunday?: string; total?: string };
    week2?: { monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string; sunday?: string; total?: string };
    week3?: { monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string; sunday?: string; total?: string };
    week4?: { monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string; sunday?: string; total?: string };
  };
  workLocation?: string;
  supervisorDetails?: string;
  preparedBy?: string;
  preparedOn?: string;
  workerDetails?: {
    name?: string;
    phone?: string;
    date?: string;
  };
  coordinatorDetails?: {
    name?: string;
    phone?: string;
    date?: string;
  };
  supervisorDetailsObj?: {
    name?: string;
    phone?: string;
    date?: string;
  };
  healthPractitioner?: {
    name?: string;
    phone?: string;
    date?: string;
  };
  additionalNotes?: string;
}

export interface Compensation {
  weeklyAmount: number;
  startDate: string;
  endDate?: string;
  type: 'weekly' | 'medical' | 'legal' | 'other';
  status: 'claimed' | 'approved' | 'paid' | 'rejected';
  payments: Payment[];
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: 'medical' | 'legal' | 'weekly' | 'other';
  provider?: string;
  description?: string;
  status: 'pending' | 'processed' | 'rejected';
}

export interface MedicalCertificate {
  id: string;
  startDate: string;
  endDate: string;
  doctorName: string;
  restrictions: string[];
  recommendations: string[];
  documentId: string;
  status: 'active' | 'expired';
}

// Stakeholder Types
export type StakeholderType = 'gp' | 'specialist' | 'physiotherapist' | 'psychologist' | 'occupational_therapist' | 'rehabilitation_provider' | 'legal_representative' | 'union_representative' | 'employer_contact' | 'insurance_contact' | 'other';

export interface Stakeholder {
  id: string;
  type: StakeholderType;
  name: string;
  organization?: string;
  title?: string;
  phone: string;
  email?: string;
  address?: string;
  fax?: string;
  specialization?: string;
  notes?: string;
  isPrimary: boolean;
  isActive: boolean;
  addedDate: string;
  lastContactDate?: string;
}

// PIAWE Calculator Types
export type EmploymentType = 'full-time' | 'part-time' | 'casual';
export type PayPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'annual';

export interface PayslipEntry {
  id: string;
  weekEnding: string;
  ordinaryHours: number;
  ordinaryRate: number;
  overtimeHours: number;
  overtimeRate: number;
  allowances: number;
  bonuses: number;
  commissions: number;
  otherIncome: number;
  totalGross: number;
  unpaidLeave: boolean;
  notes?: string;
}

export interface PIAWECalculation {
  id: string;
  caseId: string;
  workerId: string;
  jurisdiction: JurisdictionType;
  employmentType: EmploymentType;
  injuryDate: string;
  calculationDate: string;
  referencePeriodsUsed: string[];
  payslips: PayslipEntry[];
  calculations: {
    period52Week: PIAWEResult;
    period13Week: PIAWEResult;
    periodCustom?: PIAWEResult;
  };
  finalPIAWE: number;
  methodUsed: string;
  adjustments: PIAWEAdjustment[];
  validationIssues: ValidationIssue[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PIAWEResult {
  totalEarnings: number;
  totalWeeks: number;
  averageWeekly: number;
  ordinaryEarnings: number;
  overtimeEarnings: number;
  allowancesTotal: number;
  bonusesTotal: number;
  commissionsTotal: number;
  otherIncomeTotal: number;
  excludedWeeks: number;
  includedWeeks: number;
}

export interface PIAWEAdjustment {
  id: string;
  type: 'base-rate-increase' | 'industrial-agreement' | 'manual-override' | 'jurisdiction-rule';
  description: string;
  amount: number;
  percentage?: number;
  appliedDate: string;
  reason: string;
}

export interface ValidationIssue {
  id: string;
  type: 'missing-weeks' | 'extreme-fluctuation' | 'insufficient-data' | 'inconsistent-rates';
  severity: 'warning' | 'error';
  message: string;
  weekEnding?: string;
  suggestedAction?: string;
}

export interface JurisdictionRules {
  jurisdiction: JurisdictionType;
  defaultReferencePeriod: number; // weeks
  alternativeReferencePeriods: number[];
  minimumWeeksRequired: number;
  maxOvertimeInclusion: number; // percentage
  allowanceInclusions: string[];
  bonusInclusions: {
    regularBonus: boolean;
    performanceBonus: boolean;
    annualBonus: boolean;
  };
  adjustmentRules: {
    baseRateIncrease: boolean;
    industrialAgreement: boolean;
    inflationAdjustment: boolean;
  };
  cappingRules?: {
    maxWeeklyAmount?: number;
    maxAnnualAmount?: number;
  };
}

// Wages and Salary Information
export interface WagesSalaryInfo {
  employmentType: EmploymentType;
  payPeriod: PayPeriod;
  currentSalary: number;
  ordinaryHourlyRate: number;
  overtimeRate: number;
  averageWeeklyHours: number;
  averageOvertimeHours: number;
  allowances: {
    shift: number;
    travel: number;
    meal: number;
    uniform: number;
    other: number;
  };
  bonuses: {
    regular: number;
    performance: number;
    annual: number;
  };
  commissions: number;
  superannuation: number;
  startDate: string;
  lastPayIncrease?: {
    date: string;
    amount: number;
    reason: string;
  };
  notes?: string;
}

// Case Outcome Interface
export interface CaseOutcome {
  id: string;
  status: CaseStatus;
  outcome: string;
  reason: string;
  details: string;
  effectiveDate: string;
  rtwDate?: string;
  finalPIAWE?: number;
  totalCosts?: number;
  durationWeeks?: number;
  successfulRTW: boolean;
  followUpRequired: boolean;
  followUpDate?: string;
  notes: string;
  completedBy: string;
  completedAt: string;
}

export interface Case {
  id: string;
  worker: Worker;
  employer: Employer;
  caseManager: CaseManager;
  claimNumber: string;
  injuryDate: string;
  injuryDescription: string;
  firstCertificateDate: string;
  plannedRtwDate: string;
  reviewDates: string[];
  documents: Document[];
  communications: Communication[];
  notes: CaseNote[];
  supervisorNotes?: SupervisorNote[];
  stakeholders?: Stakeholder[];
  rtwPlan: RtwPlan;
  consultant: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  claimType?: ClaimType;
  jurisdiction?: JurisdictionType;
  agent?: string; // Insurance agent for insured claims
  compensation?: Compensation;
  medicalCertificates?: MedicalCertificate[];
  payments?: Payment[];
  iCareSyncStatus?: 'pending' | 'synced' | 'failed';
  medicalExcess?: {
    threshold: number;
    current: number;
    remaining: number;
  };
  piaweCalculation?: PIAWECalculation;
  wagesSalary?: WagesSalaryInfo;
  outcome?: CaseOutcome; // Case outcome when closed or pending
  workcoverType?: 'workcover' | 'non-workcover';
}