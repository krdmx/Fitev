DELETE FROM "ApplicationTicketResult";

DELETE FROM "ApplicationTicket";

ALTER TABLE "ApplicationTicket"
DROP COLUMN "fullName",
ADD COLUMN "companyName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ApplicationTicket"
ALTER COLUMN "companyName" DROP DEFAULT;
