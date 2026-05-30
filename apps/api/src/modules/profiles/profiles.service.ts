import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.profile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
  }

  create(userId: string, dto: CreateProfileDto) {
    return this.prisma.profile.create({
      data: {
        userId,
        name: dto.name,
        avatarUrl:
          dto.avatarUrl ?? `https://picsum.photos/seed/streamverse-profile-${Date.now()}/240/240`,
        maturityRating: dto.maturityRating ?? 'PG-13'
      }
    });
  }

  async update(userId: string, profileId: string, dto: UpdateProfileDto) {
    await this.ensureOwned(profileId, userId);

    return this.prisma.profile.update({
      where: { id: profileId },
      data: dto
    });
  }

  async ensureOwned(profileId: string, userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundException('Profile not found.');
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException('Profile does not belong to this user.');
    }

    return profile;
  }
}
