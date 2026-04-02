import type {
  ApplicationTicketResultResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ExportApplicationArchiveRequest,
  ExportApplicationPdfRequest,
  GetApplicationBoardResponse,
  GetApplicationsResponse,
  GetApplicationTicketResponse,
  GetBaseCvResponse,
  GetFullNameResponse,
  GetWorkTasksResponse,
  SaveApplicationResultRequest,
  TransitionApplicationBoardStageRequest,
  UpdateApplicationBoardStageRequest,
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
  UseGuards,
} from "@nestjs/common";

import { CurrentUser, type InternalRequestUser } from "../internal-auth/current-user.decorator";
import { InternalUserGuard } from "../internal-auth/internal-user.guard";
import { PdfService } from "../pdf/pdf.service";
import { ApplicationBoardService } from "./application-board.service";
import { ApplicationsService } from "./applications.service";

@Controller("api/v1/applications")
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly applicationBoardService: ApplicationBoardService,
    private readonly pdfService: PdfService
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(InternalUserGuard)
  async createApplication(
    @CurrentUser() user: InternalRequestUser,
    @Body() body: CreateApplicationRequest
  ): Promise<CreateApplicationResponse> {
    return this.applicationsService.createApplication(user.userId, body);
  }

  @Get()
  @UseGuards(InternalUserGuard)
  async listApplications(
    @CurrentUser() user: InternalRequestUser
  ): Promise<GetApplicationsResponse> {
    return this.applicationsService.listApplications(user.userId);
  }

  @Get("board")
  @UseGuards(InternalUserGuard)
  async getApplicationBoard(
    @CurrentUser() user: InternalRequestUser
  ): Promise<GetApplicationBoardResponse> {
    return this.applicationBoardService.listApplicationBoard(user.userId);
  }

  @Get("baseCv")
  @UseGuards(InternalUserGuard)
  async getBaseCv(
    @CurrentUser() user: InternalRequestUser
  ): Promise<GetBaseCvResponse> {
    return this.applicationsService.getBaseCv(user.userId);
  }

  @Get("fullName")
  @UseGuards(InternalUserGuard)
  async getFullName(
    @CurrentUser() user: InternalRequestUser
  ): Promise<GetFullNameResponse> {
    return this.applicationsService.getFullName(user.userId);
  }

  @Get("workTasks")
  @UseGuards(InternalUserGuard)
  async getWorkTasks(
    @CurrentUser() user: InternalRequestUser
  ): Promise<GetWorkTasksResponse> {
    return this.applicationsService.getWorkTasks(user.userId);
  }

  @Put("baseCv")
  @UseGuards(InternalUserGuard)
  async updateBaseCv(
    @CurrentUser() user: InternalRequestUser,
    @Body() body: UpdateBaseCvRequest
  ): Promise<GetBaseCvResponse> {
    return this.applicationsService.updateBaseCv(user.userId, body);
  }

  @Put("fullName")
  @UseGuards(InternalUserGuard)
  async updateFullName(
    @CurrentUser() user: InternalRequestUser,
    @Body() body: UpdateFullNameRequest
  ): Promise<GetFullNameResponse> {
    return this.applicationsService.updateFullName(user.userId, body);
  }

  @Put("workTasks")
  @UseGuards(InternalUserGuard)
  async updateWorkTasks(
    @CurrentUser() user: InternalRequestUser,
    @Body() body: UpdateWorkTasksRequest
  ): Promise<GetWorkTasksResponse> {
    return this.applicationsService.updateWorkTasks(user.userId, body);
  }

  @Get(":ticketId")
  @UseGuards(InternalUserGuard)
  async getApplicationTicket(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string
  ): Promise<GetApplicationTicketResponse> {
    return this.applicationsService.getApplicationTicket(user.userId, ticketId);
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
  @UseGuards(InternalUserGuard)
  async updateResult(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string,
    @Body() body: UpdateApplicationResultRequest
  ): Promise<ApplicationTicketResultResponse> {
    return this.applicationsService.updateApplicationResult(
      user.userId,
      ticketId,
      body
    );
  }

  @Put(":ticketId/tracker/stages/:stageKey")
  @UseGuards(InternalUserGuard)
  async updateTrackerStage(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string,
    @Param("stageKey") stageKey: string,
    @Body() body: UpdateApplicationBoardStageRequest
  ) {
    return this.applicationBoardService.updateApplicationTrackerStage(
      user.userId,
      ticketId,
      stageKey,
      body
    );
  }

  @Post(":ticketId/tracker/transitions")
  @UseGuards(InternalUserGuard)
  async transitionTrackerStage(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string,
    @Body() body: TransitionApplicationBoardStageRequest
  ) {
    return this.applicationBoardService.transitionApplicationTrackerStage(
      user.userId,
      ticketId,
      body
    );
  }

  @Post(":ticketId/pdf")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalUserGuard)
  async exportPdf(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string,
    @Body() body: ExportApplicationPdfRequest
  ): Promise<StreamableFile> {
    await this.applicationsService.assertTicketAccess(user.userId, ticketId);

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
  @UseGuards(InternalUserGuard)
  async exportArchive(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string,
    @Body() body: ExportApplicationArchiveRequest
  ): Promise<StreamableFile> {
    await this.applicationsService.assertTicketAccess(user.userId, ticketId);

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
  @UseGuards(InternalUserGuard)
  async deleteApplication(
    @CurrentUser() user: InternalRequestUser,
    @Param("ticketId") ticketId: string
  ): Promise<void> {
    await this.applicationsService.deleteApplication(user.userId, ticketId);
  }
}
