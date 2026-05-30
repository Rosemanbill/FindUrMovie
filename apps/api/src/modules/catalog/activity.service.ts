import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventDto, ProgressDto, RatingDto, WatchlistDto } from './dto/activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService
  ) {}

  async addToWatchlist(userId: string, dto: WatchlistDto) {
    await this.profiles.ensureOwned(dto.profileId, userId);
    await this.ensureTitle(dto.titleId);

    return this.prisma.watchlistItem.upsert({
      where: { profileId_titleId: { profileId: dto.profileId, titleId: dto.titleId } },
      update: {},
      create: { profileId: dto.profileId, titleId: dto.titleId }
    });
  }

  async removeFromWatchlist(userId: string, profileId: string, titleId: string) {
    await this.profiles.ensureOwned(profileId, userId);

    await this.prisma.watchlistItem.deleteMany({
      where: { profileId, titleId }
    });

    return { ok: true };
  }

  async listWatchlist(userId: string, profileId: string) {
    await this.profiles.ensureOwned(profileId, userId);
    const items = await this.prisma.watchlistItem.findMany({
      where: { profileId },
      include: {
        title: {
          include: {
            genres: true,
            assets: true,
            episodes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return items.map((item) => item.title);
  }

  async saveProgress(userId: string, dto: ProgressDto) {
    await this.profiles.ensureOwned(dto.profileId, userId);
    await this.ensureTitle(dto.titleId);

    const where: Prisma.WatchProgressWhereUniqueInput = {
      profileId_titleId: {
        profileId: dto.profileId,
        titleId: dto.titleId
      }
    };

    return this.prisma.watchProgress.upsert({
      where,
      update: {
        positionSeconds: dto.positionSeconds,
        durationSeconds: dto.durationSeconds,
        completed: dto.completed ?? false
      },
      create: {
        profileId: dto.profileId,
        titleId: dto.titleId,
        episodeId: dto.episodeId,
        positionSeconds: dto.positionSeconds,
        durationSeconds: dto.durationSeconds,
        completed: dto.completed ?? false
      }
    });
  }

  async getProgress(userId: string, profileId: string, titleId: string) {
    await this.profiles.ensureOwned(profileId, userId);
    return this.prisma.watchProgress.findFirst({
      where: { profileId, titleId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async rate(userId: string, dto: RatingDto) {
    await this.profiles.ensureOwned(dto.profileId, userId);
    await this.ensureTitle(dto.titleId);

    return this.prisma.rating.upsert({
      where: { profileId_titleId: { profileId: dto.profileId, titleId: dto.titleId } },
      update: { value: dto.value },
      create: { profileId: dto.profileId, titleId: dto.titleId, value: dto.value }
    });
  }

  async event(userId: string, dto: EventDto) {
    await this.profiles.ensureOwned(dto.profileId, userId);

    return this.prisma.event.create({
      data: {
        profileId: dto.profileId,
        titleId: dto.titleId,
        type: dto.type,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  private async ensureTitle(titleId: string) {
    const title = await this.prisma.title.findUnique({ where: { id: titleId } });
    if (!title) {
      throw new NotFoundException('Title not found.');
    }
  }
}
