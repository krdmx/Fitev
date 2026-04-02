import { Module } from "@nestjs/common";

import { AccountModule } from "../account/account.module";
import { InternalAuthModule } from "../internal-auth/internal-auth.module";
import { PdfModule } from "../pdf/pdf.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ApplicationBoardService } from "./application-board.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [PrismaModule, PdfModule, AccountModule, InternalAuthModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationBoardService],
})
export class ApplicationsModule {}
