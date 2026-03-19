export type DatabaseStatus = "up" | "down";
export type ServiceStatus = "ok" | "degraded";
export type ApplicationTicketStatus = "processing" | "completed" | "failed";

export interface ApiStatusResponse {
  service: string;
  environment: string;
  database: DatabaseStatus;
  status: ServiceStatus;
  timestamp: string;
  version: string;
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
