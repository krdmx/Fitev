import type {
  JoinWhitelistRequest,
  JoinWhitelistResponse,
} from "@repo/contracts";
import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WhitelistEntryRecord = {
  email: string;
  createdAt: Date;
};

@Injectable()
export class WhitelistService {
  constructor(private readonly prisma: PrismaService) {}

  async joinWhitelist(
    request: JoinWhitelistRequest
  ): Promise<JoinWhitelistResponse> {
    const email = this.normalizeEmail(request?.email);
    const existingEntry = await this.prisma.whitelistEntry.findUnique({
      where: { email },
      select: {
        email: true,
        createdAt: true,
      },
    });

    if (existingEntry) {
      return this.toResponse(existingEntry, true);
    }

    try {
      const createdEntry = await this.prisma.whitelistEntry.create({
        data: { email },
        select: {
          email: true,
          createdAt: true,
        },
      });

      return this.toResponse(createdEntry, false);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const duplicateEntry = await this.prisma.whitelistEntry.findUnique({
        where: { email },
        select: {
          email: true,
          createdAt: true,
        },
      });

      if (!duplicateEntry) {
        throw error;
      }

      return this.toResponse(duplicateEntry, true);
    }
  }

  private normalizeEmail(value: unknown) {
    if (typeof value !== "string") {
      throw new BadRequestException("Email is required.");
    }

    const normalizedEmail = value.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new BadRequestException("Email is required.");
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw new BadRequestException("A valid email address is required.");
    }

    return normalizedEmail;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }

  private toResponse(
    entry: WhitelistEntryRecord,
    alreadyListed: boolean
  ): JoinWhitelistResponse {
    return {
      email: entry.email,
      alreadyListed,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
