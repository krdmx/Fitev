CREATE TABLE "WhitelistEntry" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhitelistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhitelistEntry_email_key" ON "WhitelistEntry"("email");
