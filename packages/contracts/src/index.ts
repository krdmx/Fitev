export type DatabaseStatus = "up" | "down";
export type ServiceStatus = "ok" | "degraded";
export type ApplicationTicketStatus = "processing" | "completed" | "failed";
export type AccountPlan = "free" | "paid" | "exclusive";
export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";
export const APPLICATION_BOARD_STAGE_ORDER = [
  "resume_sent",
  "hr_screening",
  "technical_interview",
  "system_design",
  "algorithm_session",
  "custom_status",
  "passed",
  "failed",
  "ignored",
] as const;
export type ApplicationBoardStage =
  (typeof APPLICATION_BOARD_STAGE_ORDER)[number];
export const APPLICATION_JOB_SITE_OPTIONS = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Wellfound",
  "Greenhouse",
  "Lever",
  "Company Site",
  "Other",
] as const;
export type ApplicationJobSitePreset =
  (typeof APPLICATION_JOB_SITE_OPTIONS)[number];
export const APPLICATION_COMPENSATION_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "ILS",
  "PLN",
  "CAD",
  "AUD",
] as const;
export type ApplicationCompensationCurrency =
  (typeof APPLICATION_COMPENSATION_CURRENCIES)[number];
export const APPLICATION_COMPENSATION_PERIODS = [
  "yearly",
  "monthly",
  "hourly",
] as const;
export type ApplicationCompensationPeriod =
  (typeof APPLICATION_COMPENSATION_PERIODS)[number];
export const APPLICATION_NORMALIZED_CURRENCY = "USD" as const;
export type ApplicationNormalizedCurrency =
  typeof APPLICATION_NORMALIZED_CURRENCY;

export interface ApiStatusResponse {
  service: string;
  environment: string;
  database: DatabaseStatus;
  status: ServiceStatus;
  timestamp: string;
  version: string;
}

export interface AccountUserResponse {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface GetAccountResponse {
  user: AccountUserResponse;
  plan: AccountPlan;
  subscriptionStatus: SubscriptionStatus;
  usedThisMonth: number;
  monthlyLimit: number;
  remainingThisMonth: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canCreateApplications: boolean;
  quotaBypassed: boolean;
  hasCustomerPortal: boolean;
}

export interface CreateBillingSessionResponse {
  url: string;
}

export interface QuotaExceededErrorResponse {
  code: "quota_exceeded";
  message: string;
  plan: AccountPlan;
  subscriptionStatus: SubscriptionStatus;
  usedThisMonth: number;
  monthlyLimit: number;
  remainingThisMonth: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface CreateApplicationRequest {
  vacancyDescription: string;
  companyName: string;
}

export interface CreateApplicationResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  createdAt: string;
}

export interface ApplicationTicketListItemResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  companyName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetApplicationsResponse {
  applications: ApplicationTicketListItemResponse[];
}

export interface ApplicationBoardQuestionResponse {
  id: string;
  prompt: string;
  answer: string | null;
  sortOrder: number;
}

export interface ApplicationBoardCompensationResponse {
  minAmount: number | null;
  maxAmount: number | null;
  currency: ApplicationCompensationCurrency | null;
  period: ApplicationCompensationPeriod | null;
  normalizedMinAmount: number | null;
  normalizedMaxAmount: number | null;
  normalizedCurrency: ApplicationNormalizedCurrency | null;
}

export interface ApplicationBoardStageRecordResponse {
  stage: ApplicationBoardStage;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  jobSite: string | null;
  jobSiteOther: string | null;
  notes: string | null;
  roundNumber: number | null;
  customStatusLabel: string | null;
  failureReason: string | null;
  compensation: ApplicationBoardCompensationResponse | null;
  questions: ApplicationBoardQuestionResponse[];
}

export interface ApplicationBoardAssetsResponse {
  hasGeneratedCv: boolean;
  hasCoverLetter: boolean;
  hasCompanySummary: boolean;
}

export interface ApplicationBoardTicketResponse {
  ticketId: string;
  pipelineStatus: ApplicationTicketStatus;
  companyName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  currentStage: ApplicationBoardStage;
  lastTransitionAt: string;
  stages: ApplicationBoardStageRecordResponse[];
  assets: ApplicationBoardAssetsResponse;
  offerCompensation: ApplicationBoardCompensationResponse | null;
}

export interface GetApplicationBoardResponse {
  applications: ApplicationBoardTicketResponse[];
  stageOrder: ApplicationBoardStage[];
  jobSiteOptions: ApplicationJobSitePreset[];
  normalizedCurrency: ApplicationNormalizedCurrency;
}

export interface ApplicationTicketResultResponse {
  personalNote: string;
  createdAt: string;
  updatedAt: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
}

export interface GetApplicationTicketResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  companyName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  result: ApplicationTicketResultResponse | null;
}

export interface SaveApplicationResultRequest {
  personalNote: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
}

export interface UpdateApplicationResultRequest {
  cvMarkdown: string;
  coverLetterMarkdown: string;
}

export interface UpdateApplicationBoardStageQuestionRequest {
  prompt: string;
  answer?: string | null;
  sortOrder?: number | null;
}

export interface UpdateApplicationBoardCompensationRequest {
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: ApplicationCompensationCurrency | null;
  period?: ApplicationCompensationPeriod | null;
}

export interface UpdateApplicationBoardStageRequest {
  submittedAt?: string | null;
  jobSite?: string | null;
  jobSiteOther?: string | null;
  notes?: string | null;
  roundNumber?: number | null;
  customStatusLabel?: string | null;
  failureReason?: string | null;
  compensation?: UpdateApplicationBoardCompensationRequest | null;
  questions?: UpdateApplicationBoardStageQuestionRequest[];
}

export interface TransitionApplicationBoardStageRequest {
  toStage: ApplicationBoardStage;
  confirmBackward?: boolean;
}

export interface ExportApplicationPdfRequest {
  html: string;
  fileName: string;
}

export interface ExportApplicationArchiveDocumentRequest {
  html: string;
  fileName: string;
}

export interface ExportApplicationArchiveRequest {
  archiveName: string;
  documents: ExportApplicationArchiveDocumentRequest[];
}

export interface GetFullNameResponse {
  fullName: string;
}

export interface UpdateFullNameRequest {
  fullName: string;
}

export interface GetBaseCvResponse {
  baseCv: string;
}

export interface UpdateBaseCvRequest {
  baseCv: string;
}

export interface GetWorkTasksResponse {
  workTasks: string;
}

export interface UpdateWorkTasksRequest {
  workTasks: string;
}

export interface SyncGoogleUserRequest {
  googleSub: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface SyncGoogleUserResponse {
  user: AccountUserResponse;
}

export interface JoinWhitelistRequest {
  email: string;
}

export interface JoinWhitelistResponse {
  email: string;
  alreadyListed: boolean;
  createdAt: string;
}
