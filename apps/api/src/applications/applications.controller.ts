import type {
  ApplicationTicketResultResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ExportApplicationArchiveRequest,
  ExportApplicationPdfRequest,
  GetApplicationsResponse,
  GetApplicationTicketResponse,
  GetBaseCvResponse,
  GetFullNameResponse,
  GetWorkTasksResponse,
  SaveApplicationResultRequest,
  UpdateApplicationResultRequest,
  UpdateBaseCvRequest,
  UpdateFullNameRequest,
  UpdateWorkTasksRequest,
} from "@repo/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  StreamableFile,
} from "@nestjs/common";

import { PdfService } from "../pdf/pdf.service";
import { ApplicationsService } from "./applications.service";

@Controller("api/v1/applications")
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly pdfService: PdfService
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createApplication(
    @Body() body: CreateApplicationRequest
  ): Promise<CreateApplicationResponse> {
    return this.applicationsService.createApplication(body);
  }

  @Get()
  async listApplications(): Promise<GetApplicationsResponse> {
    return this.applicationsService.listApplications();
  }

  @Get("baseCv")
  async getBaseCv(): Promise<GetBaseCvResponse> {
    return this.applicationsService.getBaseCv();
  }

  @Get("fullName")
  async getFullName(): Promise<GetFullNameResponse> {
    return this.applicationsService.getFullName();
  }

  @Get("workTasks")
  async getWorkTasks(): Promise<GetWorkTasksResponse> {
    return this.applicationsService.getWorkTasks();
  }

  @Put("baseCv")
  async updateBaseCv(
    @Body() body: UpdateBaseCvRequest
  ): Promise<GetBaseCvResponse> {
    return this.applicationsService.updateBaseCv(body);
  }

  @Put("fullName")
  async updateFullName(
    @Body() body: UpdateFullNameRequest
  ): Promise<GetFullNameResponse> {
    return this.applicationsService.updateFullName(body);
  }

  @Put("workTasks")
  async updateWorkTasks(
    @Body() body: UpdateWorkTasksRequest
  ): Promise<GetWorkTasksResponse> {
    return this.applicationsService.updateWorkTasks(body);
  }

  @Get(":ticketId")
  async getApplicationTicket(
    @Param("ticketId") ticketId: string
  ): Promise<GetApplicationTicketResponse> {
    return this.applicationsService.getApplicationTicket(ticketId);
  }

  @Post(":ticketId/result")
  @HttpCode(HttpStatus.NO_CONTENT)
  async uploadResult(
    @Param("ticketId") ticketId: string,
    @Headers("x-app-secret") appSecret: string | undefined,
    @Body() body: SaveApplicationResultRequest
  ): Promise<void> {
    await this.applicationsService.saveApplicationResult({
      ticketId,
      appSecret,
      request: body,
    });
  }

  @Put(":ticketId/result")
  async updateResult(
    @Param("ticketId") ticketId: string,
    @Body() body: UpdateApplicationResultRequest
  ): Promise<ApplicationTicketResultResponse> {
    return this.applicationsService.updateApplicationResult(ticketId, body);
  }

  @Post(":ticketId/pdf")
  @HttpCode(HttpStatus.OK)
  async exportPdf(
    @Param("ticketId") ticketId: string,
    @Body() body: ExportApplicationPdfRequest
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.pdfService.renderApplicationPdf({
      ticketId,
      html: body.html,
      fileName: body.fileName,
    });

    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }

  @Post(":ticketId/archive")
  @HttpCode(HttpStatus.OK)
  async exportArchive(
    @Param("ticketId") ticketId: string,
    @Body() body: ExportApplicationArchiveRequest
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.pdfService.renderApplicationArchive({
        ticketId,
        archiveName: body.archiveName,
        documents: body.documents,
      });

    return new StreamableFile(buffer, {
      type: "application/zip",
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }

  @Delete(":ticketId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApplication(@Param("ticketId") ticketId: string): Promise<void> {
    await this.applicationsService.deleteApplication(ticketId);
  }
}
