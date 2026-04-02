CREATE TYPE "ApplicationBoardStage" AS ENUM (
  'resume_sent',
  'hr_screening',
  'technical_interview',
  'system_design',
  'algorithm_session',
  'custom_status',
  'passed',
  'failed',
  'ignored'
);

CREATE TYPE "ApplicationCompensationCurrency" AS ENUM (
  'USD',
  'EUR',
  'GBP',
  'ILS',
  'PLN',
  'CAD',
  'AUD'
);

CREATE TYPE "ApplicationCompensationPeriod" AS ENUM (
  'yearly',
  'monthly',
  'hourly'
);

CREATE TABLE "ApplicationTracker" (
  "ticketId" TEXT NOT NULL,
  "currentStage" "ApplicationBoardStage" NOT NULL DEFAULT 'resume_sent',
  "lastTransitionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTracker_pkey" PRIMARY KEY ("ticketId")
);

CREATE TABLE "ApplicationTrackerStageRecord" (
  "id" TEXT NOT NULL,
  "trackerId" TEXT NOT NULL,
  "stageKey" "ApplicationBoardStage" NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "jobSite" TEXT,
  "jobSiteOther" TEXT,
  "notes" TEXT,
  "roundNumber" INTEGER,
  "customStatusLabel" TEXT,
  "failureReason" TEXT,
  "salaryMinAmount" DOUBLE PRECISION,
  "salaryMaxAmount" DOUBLE PRECISION,
  "salaryCurrency" "ApplicationCompensationCurrency",
  "salaryPeriod" "ApplicationCompensationPeriod",
  "salaryNormalizedMinAmount" DOUBLE PRECISION,
  "salaryNormalizedMaxAmount" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTrackerStageRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationTrackerStageQuestion" (
  "id" TEXT NOT NULL,
  "stageRecordId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "prompt" TEXT NOT NULL,
  "answer" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTrackerStageQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationTrackerTransitionLog" (
  "id" TEXT NOT NULL,
  "trackerId" TEXT NOT NULL,
  "fromStage" "ApplicationBoardStage",
  "toStage" "ApplicationBoardStage" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApplicationTrackerTransitionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationTrackerStageRecord_trackerId_stageKey_key"
ON "ApplicationTrackerStageRecord"("trackerId", "stageKey");

CREATE INDEX "ApplicationTrackerStageRecord_stageKey_idx"
ON "ApplicationTrackerStageRecord"("stageKey");

CREATE INDEX "ApplicationTrackerStageRecord_salaryNormalizedMinAmount_idx"
ON "ApplicationTrackerStageRecord"("salaryNormalizedMinAmount");

CREATE INDEX "ApplicationTrackerStageRecord_salaryNormalizedMaxAmount_idx"
ON "ApplicationTrackerStageRecord"("salaryNormalizedMaxAmount");

CREATE INDEX "ApplicationTrackerStageQuestion_stageRecordId_sortOrder_idx"
ON "ApplicationTrackerStageQuestion"("stageRecordId", "sortOrder");

CREATE INDEX "ApplicationTrackerTransitionLog_trackerId_createdAt_idx"
ON "ApplicationTrackerTransitionLog"("trackerId", "createdAt");

ALTER TABLE "ApplicationTracker"
ADD CONSTRAINT "ApplicationTracker_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "ApplicationTicket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationTrackerStageRecord"
ADD CONSTRAINT "ApplicationTrackerStageRecord_trackerId_fkey"
FOREIGN KEY ("trackerId") REFERENCES "ApplicationTracker"("ticketId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationTrackerStageQuestion"
ADD CONSTRAINT "ApplicationTrackerStageQuestion_stageRecordId_fkey"
FOREIGN KEY ("stageRecordId") REFERENCES "ApplicationTrackerStageRecord"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationTrackerTransitionLog"
ADD CONSTRAINT "ApplicationTrackerTransitionLog_trackerId_fkey"
FOREIGN KEY ("trackerId") REFERENCES "ApplicationTracker"("ticketId")
ON DELETE CASCADE ON UPDATE CASCADE;
