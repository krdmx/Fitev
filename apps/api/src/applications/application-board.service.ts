import type {
  ApplicationBoardCompensationResponse,
  ApplicationBoardQuestionResponse,
  ApplicationBoardStage,
  ApplicationBoardStageRecordResponse,
  ApplicationBoardTicketResponse,
  ApplicationCompensationCurrency,
  ApplicationCompensationPeriod,
  ApplicationJobSitePreset,
  ApplicationTicketStatus,
  GetApplicationBoardResponse,
  TransitionApplicationBoardStageRequest,
  UpdateApplicationBoardStageRequest,
} from "@repo/contracts";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type { Prisma } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";

const APPLICATION_BOARD_STAGE_ORDER: ApplicationBoardStage[] = [
  "resume_sent",
  "hr_screening",
  "technical_interview",
  "system_design",
  "algorithm_session",
  "custom_status",
  "passed",
  "failed",
  "ignored",
];
const APPLICATION_JOB_SITE_OPTIONS: ApplicationJobSitePreset[] = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Wellfound",
  "Greenhouse",
  "Lever",
  "Company Site",
  "Other",
];
const APPLICATION_COMPENSATION_CURRENCIES: ApplicationCompensationCurrency[] = [
  "USD",
  "EUR",
  "GBP",
  "ILS",
  "PLN",
  "CAD",
  "AUD",
];
const APPLICATION_COMPENSATION_PERIODS: ApplicationCompensationPeriod[] = [
  "yearly",
  "monthly",
  "hourly",
];
const APPLICATION_NORMALIZED_CURRENCY = "USD";
const DEFAULT_STAGE: ApplicationBoardStage = "resume_sent";
const CURRENT_STAGE_SHELL_FIELDS: Record<ApplicationBoardStage, true> =
  APPLICATION_BOARD_STAGE_ORDER.reduce(
    (accumulator, stage) => {
      accumulator[stage] = true;
      return accumulator;
    },
    {} as Record<ApplicationBoardStage, true>
  );
const STAGE_INDEX_MAP = APPLICATION_BOARD_STAGE_ORDER.reduce(
  (accumulator, stage, index) => {
    accumulator[stage] = index;
    return accumulator;
  },
  {} as Record<ApplicationBoardStage, number>
);
const JOB_SITE_OPTION_SET = new Set<ApplicationJobSitePreset>(
  APPLICATION_JOB_SITE_OPTIONS
);
const COMPENSATION_CURRENCY_SET = new Set<ApplicationCompensationCurrency>(
  APPLICATION_COMPENSATION_CURRENCIES
);
const COMPENSATION_PERIOD_SET = new Set<ApplicationCompensationPeriod>(
  APPLICATION_COMPENSATION_PERIODS
);
const ROUND_STAGE_SET = new Set<ApplicationBoardStage>([
  "technical_interview",
  "system_design",
  "algorithm_session",
]);
const STATIC_USD_CONVERSION_RATES: Record<
  ApplicationCompensationCurrency,
  number
> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  ILS: 0.27,
  PLN: 0.26,
  CAD: 0.74,
  AUD: 0.66,
};

type PrismaDbClient = PrismaService | Prisma.TransactionClient;

type BoardQuestionRecord = {
  id: string;
  prompt: string;
  answer: string | null;
  sortOrder: number;
};

type BoardStageRecord = {
  id: string;
  stageKey: ApplicationBoardStage;
  submittedAt: Date | null;
  jobSite: string | null;
  jobSiteOther: string | null;
  notes: string | null;
  roundNumber: number | null;
  customStatusLabel: string | null;
  failureReason: string | null;
  salaryMinAmount: number | null;
  salaryMaxAmount: number | null;
  salaryCurrency: ApplicationCompensationCurrency | null;
  salaryPeriod: ApplicationCompensationPeriod | null;
  salaryNormalizedMinAmount: number | null;
  salaryNormalizedMaxAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  questions: BoardQuestionRecord[];
};

type BoardTrackerRecord = {
  ticketId: string;
  currentStage: ApplicationBoardStage;
  lastTransitionAt: Date;
  stageRecords: BoardStageRecord[];
};

type BoardTicketRecord = {
  id: string;
  status: ApplicationTicketStatus;
  companyName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  result: {
    cvMarkdown: string;
    coverLetterMarkdown: string;
  } | null;
  tracker: BoardTrackerRecord | null;
};

type NormalizedBoardQuestion = {
  prompt: string;
  answer: string | null;
  sortOrder: number;
};

type NormalizedBoardCompensation = {
  minAmount: number | null;
  maxAmount: number | null;
  currency: ApplicationCompensationCurrency | null;
  period: ApplicationCompensationPeriod | null;
  normalizedMinAmount: number | null;
  normalizedMaxAmount: number | null;
};

type NormalizedBoardStageUpdate = {
  submittedAt: Date | null;
  jobSite: string | null;
  jobSiteOther: string | null;
  notes: string | null;
  roundNumber: number | null;
  customStatusLabel: string | null;
  failureReason: string | null;
  compensation: NormalizedBoardCompensation;
  questions: NormalizedBoardQuestion[];
};

@Injectable()
export class ApplicationBoardService {
  constructor(private readonly prisma: PrismaService) {}

  async listApplicationBoard(userId: string): Promise<GetApplicationBoardResponse> {
    await this.ensureApplicationTrackers(userId);

    const tickets = await this.prisma.applicationTicket.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        result: {
          select: {
            cvMarkdown: true,
            coverLetterMarkdown: true,
          },
        },
        tracker: {
          include: {
            stageRecords: {
              include: {
                questions: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      applications: tickets.map((ticket) =>
        this.toApplicationBoardTicketResponse(ticket as BoardTicketRecord)
      ),
      stageOrder: [...APPLICATION_BOARD_STAGE_ORDER],
      jobSiteOptions: [...APPLICATION_JOB_SITE_OPTIONS],
      normalizedCurrency: APPLICATION_NORMALIZED_CURRENCY,
    };
  }

  async updateApplicationTrackerStage(
    userId: string,
    ticketId: string,
    rawStageKey: string,
    request: UpdateApplicationBoardStageRequest
  ): Promise<ApplicationBoardTicketResponse> {
    const stageKey = this.requireBoardStage(rawStageKey);
    const normalizedStage = this.normalizeBoardStageUpdate(stageKey, request);

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const currentTicket = await this.getOrCreateBoardTicketRecord(
        userId,
        ticketId,
        tx
      );
      const tracker = currentTicket.tracker;

      if (!tracker) {
        throw new NotFoundException("Application tracker was not found.");
      }

      if (tracker.currentStage !== stageKey) {
        throw new BadRequestException(
          "Only the current board stage can be edited."
        );
      }

      const stageRecord = await tx.applicationTrackerStageRecord.upsert({
        where: {
          trackerId_stageKey: {
            trackerId: ticketId,
            stageKey,
          },
        },
        create: {
          trackerId: ticketId,
          stageKey,
          submittedAt: normalizedStage.submittedAt,
          jobSite: normalizedStage.jobSite,
          jobSiteOther: normalizedStage.jobSiteOther,
          notes: normalizedStage.notes,
          roundNumber: normalizedStage.roundNumber,
          customStatusLabel: normalizedStage.customStatusLabel,
          failureReason: normalizedStage.failureReason,
          salaryMinAmount: normalizedStage.compensation.minAmount,
          salaryMaxAmount: normalizedStage.compensation.maxAmount,
          salaryCurrency: normalizedStage.compensation.currency,
          salaryPeriod: normalizedStage.compensation.period,
          salaryNormalizedMinAmount:
            normalizedStage.compensation.normalizedMinAmount,
          salaryNormalizedMaxAmount:
            normalizedStage.compensation.normalizedMaxAmount,
        },
        update: {
          submittedAt: normalizedStage.submittedAt,
          jobSite: normalizedStage.jobSite,
          jobSiteOther: normalizedStage.jobSiteOther,
          notes: normalizedStage.notes,
          roundNumber: normalizedStage.roundNumber,
          customStatusLabel: normalizedStage.customStatusLabel,
          failureReason: normalizedStage.failureReason,
          salaryMinAmount: normalizedStage.compensation.minAmount,
          salaryMaxAmount: normalizedStage.compensation.maxAmount,
          salaryCurrency: normalizedStage.compensation.currency,
          salaryPeriod: normalizedStage.compensation.period,
          salaryNormalizedMinAmount:
            normalizedStage.compensation.normalizedMinAmount,
          salaryNormalizedMaxAmount:
            normalizedStage.compensation.normalizedMaxAmount,
        },
      });

      await tx.applicationTrackerStageQuestion.deleteMany({
        where: {
          stageRecordId: stageRecord.id,
        },
      });

      if (normalizedStage.questions.length > 0) {
        await tx.applicationTrackerStageQuestion.createMany({
          data: normalizedStage.questions.map((question) => ({
            stageRecordId: stageRecord.id,
            prompt: question.prompt,
            answer: question.answer,
            sortOrder: question.sortOrder,
          })),
        });
      }

      return this.getBoardTicketRecord(userId, ticketId, tx);
    });

    return this.toApplicationBoardTicketResponse(updatedTicket);
  }

  async transitionApplicationTrackerStage(
    userId: string,
    ticketId: string,
    request: TransitionApplicationBoardStageRequest
  ): Promise<ApplicationBoardTicketResponse> {
    const toStage = this.requireBoardStage(request?.toStage);

    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const currentTicket = await this.getOrCreateBoardTicketRecord(
        userId,
        ticketId,
        tx
      );
      const tracker = currentTicket.tracker;

      if (!tracker) {
        throw new NotFoundException("Application tracker was not found.");
      }

      const fromStage = tracker.currentStage;

      if (fromStage === toStage) {
        return currentTicket;
      }

      await tx.applicationTrackerStageRecord.createMany({
        data: [
          {
            trackerId: ticketId,
            stageKey: toStage,
          },
        ],
        skipDuplicates: true,
      });

      await tx.applicationTracker.update({
        where: {
          ticketId,
        },
        data: {
          currentStage: toStage,
          lastTransitionAt: new Date(),
        },
      });

      await tx.applicationTrackerTransitionLog.create({
        data: {
          trackerId: ticketId,
          fromStage,
          toStage,
        },
      });

      return this.getBoardTicketRecord(userId, ticketId, tx);
    });

    return this.toApplicationBoardTicketResponse(updatedTicket);
  }

  private async ensureApplicationTrackers(userId: string): Promise<void> {
    const tickets = await this.prisma.applicationTicket.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        tracker: {
          select: {
            currentStage: true,
            stageRecords: {
              select: {
                stageKey: true,
              },
            },
          },
        },
      },
    });

    const missingTrackerIds = tickets
      .filter((ticket) => !ticket.tracker)
      .map((ticket) => ticket.id);

    if (missingTrackerIds.length > 0) {
      await this.prisma.applicationTracker.createMany({
        data: missingTrackerIds.map((ticketId) => ({
          ticketId,
          currentStage: DEFAULT_STAGE,
          lastTransitionAt: new Date(),
        })),
        skipDuplicates: true,
      });

      await this.prisma.applicationTrackerStageRecord.createMany({
        data: missingTrackerIds.map((trackerId) => ({
          trackerId,
          stageKey: DEFAULT_STAGE,
        })),
        skipDuplicates: true,
      });
    }

    const missingCurrentStageRecords = tickets.flatMap((ticket) => {
      if (!ticket.tracker) {
        return [];
      }

      if (
        ticket.tracker.stageRecords.some(
          (stageRecord) => stageRecord.stageKey === ticket.tracker?.currentStage
        )
      ) {
        return [];
      }

      return [
        {
          trackerId: ticket.id,
          stageKey: ticket.tracker.currentStage,
        },
      ];
    });

    if (missingCurrentStageRecords.length > 0) {
      await this.prisma.applicationTrackerStageRecord.createMany({
        data: missingCurrentStageRecords,
        skipDuplicates: true,
      });
    }
  }

  private async getOrCreateBoardTicketRecord(
    userId: string,
    ticketId: string,
    db: PrismaDbClient
  ): Promise<BoardTicketRecord> {
    const ticket = await db.applicationTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException("Application ticket was not found.");
    }

    const tracker = await db.applicationTracker.upsert({
      where: {
        ticketId,
      },
      create: {
        ticketId,
        currentStage: DEFAULT_STAGE,
        lastTransitionAt: new Date(),
        stageRecords: {
          create: {
            stageKey: DEFAULT_STAGE,
          },
        },
      },
      update: {},
      select: {
        currentStage: true,
      },
    });

    if (CURRENT_STAGE_SHELL_FIELDS[tracker.currentStage]) {
      await db.applicationTrackerStageRecord.createMany({
        data: [
          {
            trackerId: ticketId,
            stageKey: tracker.currentStage,
          },
        ],
        skipDuplicates: true,
      });
    }

    return this.getBoardTicketRecord(userId, ticketId, db);
  }

  private async getBoardTicketRecord(
    userId: string,
    ticketId: string,
    db: PrismaDbClient
  ): Promise<BoardTicketRecord> {
    const ticket = await db.applicationTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: {
        result: {
          select: {
            cvMarkdown: true,
            coverLetterMarkdown: true,
          },
        },
        tracker: {
          include: {
            stageRecords: {
              include: {
                questions: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Application ticket was not found.");
    }

    return ticket as BoardTicketRecord;
  }

  private toApplicationBoardTicketResponse(
    ticket: BoardTicketRecord
  ): ApplicationBoardTicketResponse {
    const tracker = ticket.tracker;
    const currentStage = tracker?.currentStage ?? DEFAULT_STAGE;
    const stages = [...(tracker?.stageRecords ?? [])]
      .sort(
        (left, right) =>
          STAGE_INDEX_MAP[left.stageKey] - STAGE_INDEX_MAP[right.stageKey]
      )
      .map((stageRecord) => this.toApplicationBoardStageRecordResponse(stageRecord));
    const hrStage = stages.find((stage) => stage.stage === "hr_screening");

    return {
      ticketId: ticket.id,
      pipelineStatus: ticket.status,
      companyName: ticket.companyName,
      vacancyDescription: ticket.vacancyDescription,
      lastError: ticket.lastError,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      currentStage,
      lastTransitionAt:
        tracker?.lastTransitionAt.toISOString() ?? ticket.updatedAt.toISOString(),
      stages,
      assets: {
        hasGeneratedCv: Boolean(ticket.result?.cvMarkdown.trim()),
        hasCoverLetter: Boolean(ticket.result?.coverLetterMarkdown.trim()),
        hasCompanySummary: false,
      },
      offerCompensation: hrStage?.compensation ?? null,
    };
  }

  private toApplicationBoardStageRecordResponse(
    stageRecord: BoardStageRecord
  ): ApplicationBoardStageRecordResponse {
    return {
      stage: stageRecord.stageKey,
      createdAt: stageRecord.createdAt.toISOString(),
      updatedAt: stageRecord.updatedAt.toISOString(),
      submittedAt: stageRecord.submittedAt?.toISOString() ?? null,
      jobSite: stageRecord.jobSite,
      jobSiteOther: stageRecord.jobSiteOther,
      notes: stageRecord.notes,
      roundNumber: stageRecord.roundNumber,
      customStatusLabel: stageRecord.customStatusLabel,
      failureReason: stageRecord.failureReason,
      compensation: this.toApplicationBoardCompensationResponse(stageRecord),
      questions: stageRecord.questions.map((question) =>
        this.toApplicationBoardQuestionResponse(question)
      ),
    };
  }

  private toApplicationBoardQuestionResponse(
    question: BoardQuestionRecord
  ): ApplicationBoardQuestionResponse {
    return {
      id: question.id,
      prompt: question.prompt,
      answer: question.answer,
      sortOrder: question.sortOrder,
    };
  }

  private toApplicationBoardCompensationResponse(
    stageRecord: Pick<
      BoardStageRecord,
      | "salaryMinAmount"
      | "salaryMaxAmount"
      | "salaryCurrency"
      | "salaryPeriod"
      | "salaryNormalizedMinAmount"
      | "salaryNormalizedMaxAmount"
    >
  ): ApplicationBoardCompensationResponse | null {
    if (
      stageRecord.salaryMinAmount == null &&
      stageRecord.salaryMaxAmount == null &&
      stageRecord.salaryCurrency == null &&
      stageRecord.salaryPeriod == null &&
      stageRecord.salaryNormalizedMinAmount == null &&
      stageRecord.salaryNormalizedMaxAmount == null
    ) {
      return null;
    }

    return {
      minAmount: stageRecord.salaryMinAmount,
      maxAmount: stageRecord.salaryMaxAmount,
      currency: stageRecord.salaryCurrency,
      period: stageRecord.salaryPeriod,
      normalizedMinAmount: stageRecord.salaryNormalizedMinAmount,
      normalizedMaxAmount: stageRecord.salaryNormalizedMaxAmount,
      normalizedCurrency:
        stageRecord.salaryNormalizedMinAmount != null ||
        stageRecord.salaryNormalizedMaxAmount != null
          ? APPLICATION_NORMALIZED_CURRENCY
          : null,
    };
  }

  private normalizeBoardStageUpdate(
    stageKey: ApplicationBoardStage,
    request: UpdateApplicationBoardStageRequest
  ): NormalizedBoardStageUpdate {
    if (request != null && !this.isRecord(request)) {
      throw new BadRequestException("Stage payload must be an object.");
    }

    const payload = request ?? {};
    const emptyCompensation = this.createEmptyCompensation();

    if (stageKey === "resume_sent") {
      const jobSite = this.normalizeJobSite(payload.jobSite);

      return {
        submittedAt: this.normalizeDateOnlyValue(payload.submittedAt, "submittedAt"),
        jobSite,
        jobSiteOther:
          jobSite === "Other"
            ? this.normalizeOptionalText(payload.jobSiteOther, "jobSiteOther")
            : null,
        notes: null,
        roundNumber: null,
        customStatusLabel: null,
        failureReason: null,
        compensation: emptyCompensation,
        questions: [],
      };
    }

    if (stageKey === "hr_screening") {
      return {
        submittedAt: null,
        jobSite: null,
        jobSiteOther: null,
        notes: this.normalizeOptionalText(payload.notes, "notes"),
        roundNumber: null,
        customStatusLabel: null,
        failureReason: null,
        compensation: this.normalizeCompensation(payload.compensation),
        questions: [],
      };
    }

    if (ROUND_STAGE_SET.has(stageKey)) {
      return {
        submittedAt: null,
        jobSite: null,
        jobSiteOther: null,
        notes: null,
        roundNumber: this.normalizeOptionalInteger(payload.roundNumber, "roundNumber"),
        customStatusLabel: null,
        failureReason: null,
        compensation: emptyCompensation,
        questions: this.normalizeQuestions(payload.questions),
      };
    }

    if (stageKey === "custom_status") {
      return {
        submittedAt: null,
        jobSite: null,
        jobSiteOther: null,
        notes: null,
        roundNumber: null,
        customStatusLabel: this.normalizeOptionalText(
          payload.customStatusLabel,
          "customStatusLabel"
        ),
        failureReason: null,
        compensation: emptyCompensation,
        questions: this.normalizeQuestions(payload.questions),
      };
    }

    if (stageKey === "failed") {
      return {
        submittedAt: null,
        jobSite: null,
        jobSiteOther: null,
        notes: null,
        roundNumber: null,
        customStatusLabel: null,
        failureReason: this.normalizeOptionalText(
          payload.failureReason,
          "failureReason"
        ),
        compensation: emptyCompensation,
        questions: [],
      };
    }

    return {
      submittedAt: null,
      jobSite: null,
      jobSiteOther: null,
      notes: null,
      roundNumber: null,
      customStatusLabel: null,
      failureReason: null,
      compensation: emptyCompensation,
      questions: [],
    };
  }

  private normalizeJobSite(value: unknown): ApplicationJobSitePreset | null {
    const normalized = this.normalizeOptionalText(value, "jobSite");

    if (!normalized) {
      return null;
    }

    if (!JOB_SITE_OPTION_SET.has(normalized as ApplicationJobSitePreset)) {
      throw new BadRequestException("jobSite must be one of the configured presets.");
    }

    return normalized as ApplicationJobSitePreset;
  }

  private normalizeQuestions(value: unknown): NormalizedBoardQuestion[] {
    if (value == null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException("questions must be an array.");
    }

    return value
      .flatMap((item, index) => {
        if (!this.isRecord(item)) {
          throw new BadRequestException("Each question entry must be an object.");
        }

        const prompt = this.normalizeOptionalText(
          item.prompt,
          `questions[${index}].prompt`
        );

        if (!prompt) {
          return [];
        }

        return [
          {
            prompt,
            answer: this.normalizeOptionalText(
              item.answer,
              `questions[${index}].answer`
            ),
            sortOrder:
              this.normalizeOptionalInteger(
                item.sortOrder,
                `questions[${index}].sortOrder`
              ) ?? index,
          },
        ];
      })
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((question, index) => ({
        ...question,
        sortOrder: index,
      }));
  }

  private normalizeCompensation(value: unknown): NormalizedBoardCompensation {
    if (value == null) {
      return this.createEmptyCompensation();
    }

    if (!this.isRecord(value)) {
      throw new BadRequestException("compensation must be an object.");
    }

    const minAmount = this.normalizeOptionalNumber(
      value.minAmount,
      "compensation.minAmount"
    );
    const maxAmount = this.normalizeOptionalNumber(
      value.maxAmount,
      "compensation.maxAmount"
    );
    const currency = this.normalizeCompensationCurrency(value.currency);
    const period = this.normalizeCompensationPeriod(value.period);

    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      throw new BadRequestException(
        "compensation.minAmount cannot be greater than compensation.maxAmount."
      );
    }

    const normalizedMinAmount =
      minAmount != null && currency
        ? this.normalizeCurrencyAmount(minAmount, currency)
        : null;
    const normalizedMaxAmount =
      maxAmount != null && currency
        ? this.normalizeCurrencyAmount(maxAmount, currency)
        : null;

    return {
      minAmount,
      maxAmount,
      currency,
      period,
      normalizedMinAmount,
      normalizedMaxAmount,
    };
  }

  private createEmptyCompensation(): NormalizedBoardCompensation {
    return {
      minAmount: null,
      maxAmount: null,
      currency: null,
      period: null,
      normalizedMinAmount: null,
      normalizedMaxAmount: null,
    };
  }

  private normalizeCurrencyAmount(
    amount: number,
    currency: ApplicationCompensationCurrency
  ) {
    return Number(
      (amount * STATIC_USD_CONVERSION_RATES[currency]).toFixed(2)
    );
  }

  private normalizeCompensationCurrency(
    value: unknown
  ): ApplicationCompensationCurrency | null {
    const normalized = this.normalizeOptionalText(
      value,
      "compensation.currency"
    );

    if (!normalized) {
      return null;
    }

    if (
      !COMPENSATION_CURRENCY_SET.has(
        normalized as ApplicationCompensationCurrency
      )
    ) {
      throw new BadRequestException(
        "compensation.currency must be one of the configured currencies."
      );
    }

    return normalized as ApplicationCompensationCurrency;
  }

  private normalizeCompensationPeriod(
    value: unknown
  ): ApplicationCompensationPeriod | null {
    const normalized = this.normalizeOptionalText(value, "compensation.period");

    if (!normalized) {
      return null;
    }

    if (
      !COMPENSATION_PERIOD_SET.has(normalized as ApplicationCompensationPeriod)
    ) {
      throw new BadRequestException(
        "compensation.period must be one of the configured periods."
      );
    }

    return normalized as ApplicationCompensationPeriod;
  }

  private normalizeDateOnlyValue(value: unknown, fieldName: string): Date | null {
    const normalized = this.normalizeOptionalText(value, fieldName);

    if (!normalized) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(`${fieldName} must use YYYY-MM-DD format.`);
    }

    const parsed = new Date(`${normalized}T12:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }

    return parsed;
  }

  private normalizeOptionalInteger(
    value: unknown,
    fieldName: string
  ): number | null {
    if (value == null || value === "") {
      return null;
    }

    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value.trim(), 10);

      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }

    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  private normalizeOptionalNumber(
    value: unknown,
    fieldName: string
  ): number | null {
    if (value == null || value === "") {
      return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.trim());

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    throw new BadRequestException(`${fieldName} must be a number.`);
  }

  private normalizeOptionalText(
    value: unknown,
    fieldName: string
  ): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private requireBoardStage(value: unknown): ApplicationBoardStage {
    if (typeof value !== "string") {
      throw new BadRequestException("Board stage must be a string.");
    }

    if (
      !APPLICATION_BOARD_STAGE_ORDER.includes(value as ApplicationBoardStage)
    ) {
      throw new BadRequestException("Unknown board stage.");
    }

    return value as ApplicationBoardStage;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
