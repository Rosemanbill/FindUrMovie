import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetKind, Prisma, TitleStatus } from '@prisma/client';
import { mapCasaItemToTitle, parseProviderRef as parseCasaProviderRef } from '../admin/hdtoday-casa.parser';
import { parseMovieclubProviderRef } from '../admin/movieclub-hd.parser';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { CreateTitleDto } from './dto/create-title.dto';
import { UpdateTitleDto } from './dto/update-title.dto';
import { HdtodayCasaService } from './hdtoday-casa.service';
import { isAllowedByMaturity } from './maturity';
import { MovieclubHdService } from './movieclub-hd.service';
import { mapTitle, titleInclude } from './title.mapper';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly ai: AiService,
    private readonly hdtoday: HdtodayCasaService,
    private readonly movieclub: MovieclubHdService
  ) {}

  async list(params: { query?: string; genre?: string; profileId?: string; userId?: string }) {
    const profile = params.profileId && params.userId
      ? await this.profiles.ensureOwned(params.profileId, params.userId)
      : null;

    const where: Prisma.TitleWhereInput = {
      status: TitleStatus.PUBLISHED,
      ...(params.genre
        ? { genres: { some: { slug: params.genre } } }
        : {}),
      ...(params.query
        ? {
            OR: [
              { name: { contains: params.query, mode: 'insensitive' } },
              { description: { contains: params.query, mode: 'insensitive' } },
              { tags: { has: params.query.toLowerCase() } },
              { moods: { has: params.query.toLowerCase() } }
            ]
          }
        : {})
    };

    const titles = await this.prisma.title.findMany({
      where,
      include: titleInclude,
      orderBy: [{ popularity: 'desc' }, { releaseYear: 'desc' }],
      take: 48
    });

    return titles
      .filter((title) => !profile || isAllowedByMaturity(title.maturityRating, profile.maturityRating))
      .map(mapTitle);
  }

  async findBySlug(slug: string) {
    const title = await this.prisma.title.findUnique({
      where: { slug },
      include: titleInclude
    });

    if (!title || title.status !== TitleStatus.PUBLISHED) {
      throw new NotFoundException('Title not found.');
    }

    return mapTitle(title);
  }

  async resolveStream(slug: string) {
    const title = await this.prisma.title.findUnique({
      where: { slug },
      include: titleInclude
    });

    if (!title || title.status !== TitleStatus.PUBLISHED) {
      throw new NotFoundException('Title not found.');
    }

    const mapped = mapTitle(title);
    const casaRef = parseCasaProviderRef(title.slug, title.tags);

    if (casaRef) {
      const streamUrl = await this.hdtoday.resolveStream(
        casaRef.type,
        casaRef.tmdbId,
        casaRef.season,
        casaRef.episode
      );
      await this.updateVideoAsset(title.id, streamUrl, title.name);

      return {
        streamUrl,
        posterUrl: mapped.posterUrl,
        source: 'provider' as const,
        streamType: 'embed' as const
      };
    }

    const movieclubRef = parseMovieclubProviderRef(title.slug, title.tags);
    if (movieclubRef) {
      const streamUrl = await this.movieclub.resolveStream(movieclubRef.type, movieclubRef.slug);
      await this.updateVideoAsset(title.id, streamUrl, title.name);

      return {
        streamUrl,
        posterUrl: mapped.posterUrl,
        source: 'provider' as const,
        streamType: 'video' as const
      };
    }

    const fallback = mapped.videoUrl ?? mapped.trailerUrl;
    if (!fallback) {
      throw new NotFoundException('No stream source is available for this title.');
    }

    return {
      streamUrl: fallback,
      posterUrl: mapped.posterUrl,
      source: 'catalog' as const,
      streamType: inferStreamType(fallback)
    };
  }

  private async updateVideoAsset(titleId: string, streamUrl: string, titleName: string) {
    const existing = await this.prisma.mediaAsset.findFirst({
      where: { titleId, kind: AssetKind.VIDEO }
    });

    if (existing) {
      await this.prisma.mediaAsset.update({
        where: { id: existing.id },
        data: { url: streamUrl }
      });
      return;
    }

    await this.prisma.mediaAsset.create({
      data: {
        titleId,
        kind: AssetKind.VIDEO,
        url: streamUrl,
        altText: `${titleName} video`
      }
    });
  }

  async similar(titleId: string, profileId?: string, userId?: string) {
    const title = await this.prisma.title.findUnique({
      where: { id: titleId },
      include: { genres: true }
    });
    if (!title) {
      throw new NotFoundException('Title not found.');
    }

    const profile = profileId && userId ? await this.profiles.ensureOwned(profileId, userId) : null;
    const genreIds = title.genres.map((genre) => genre.id);
    const candidates = await this.prisma.title.findMany({
      where: {
        id: { not: titleId },
        status: TitleStatus.PUBLISHED,
        OR: [
          { genres: { some: { id: { in: genreIds } } } },
          { moods: { hasSome: title.moods } },
          { tags: { hasSome: title.tags } }
        ]
      },
      include: titleInclude,
      orderBy: { popularity: 'desc' },
      take: 12
    });

    return candidates
      .filter((candidate) => !profile || isAllowedByMaturity(candidate.maturityRating, profile.maturityRating))
      .map(mapTitle);
  }

  async search(query: string, profileId: string, userId: string) {
    const profile = await this.profiles.ensureOwned(profileId, userId);
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const remoteItems = await this.hdtoday.search(trimmed, 24);
      if (remoteItems.length > 0) {
        const titles = [];
        for (const item of remoteItems) {
          const dto = mapCasaItemToTitle(item);
          if (!dto) {
            continue;
          }

          const title = await this.ensureTitle(dto);
          if (isAllowedByMaturity(title.maturityRating, profile.maturityRating)) {
            titles.push(mapTitle(title));
          }
        }

        return titles;
      }
    } catch {
      // Fall back to local catalog search if the provider is unavailable.
    }

    const titles = await this.prisma.title.findMany({
      where: { status: TitleStatus.PUBLISHED },
      include: titleInclude
    });

    return titles
      .filter((title) => isAllowedByMaturity(title.maturityRating, profile.maturityRating))
      .map((title) => ({
        title,
        score:
          this.ai.score(trimmed, title) +
          (title.name.toLowerCase().includes(trimmed.toLowerCase()) ? 5 : 0)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.title.popularity - a.title.popularity)
      .slice(0, 24)
      .map((item) => mapTitle(item.title));
  }

  private async ensureTitle(dto: CreateTitleDto) {
    const existing = await this.prisma.title.findUnique({
      where: { slug: dto.slug },
      include: titleInclude
    });

    if (existing) {
      return existing;
    }

    return this.createTitleRecord(dto);
  }

  async homeRows(profileId: string, userId: string) {
    const profile = await this.profiles.ensureOwned(profileId, userId);
    const latestImports = await this.prisma.title.findMany({
      where: { status: TitleStatus.PUBLISHED },
      include: titleInclude,
      orderBy: [{ createdAt: 'desc' }, { releaseYear: 'desc' }],
      take: 12
    });

    const featured =
      latestImports.find((title) => isAllowedByMaturity(title.maturityRating, profile.maturityRating)) ??
      (await this.prisma.title.findFirst({
        where: { status: TitleStatus.PUBLISHED },
        include: titleInclude,
        orderBy: { popularity: 'desc' }
      }));

    const continueWatching = await this.prisma.watchProgress.findMany({
      where: { profileId, completed: false },
      include: { title: { include: titleInclude } },
      orderBy: { updatedAt: 'desc' },
      take: 12
    });

    const manualRows = await this.prisma.featuredRow.findMany({
      where: { active: true },
      include: {
        items: {
          include: { title: { include: titleInclude } },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { position: 'asc' }
    });

    const rated = await this.prisma.rating.findMany({
      where: { profileId, value: 'LIKE' },
      include: { title: { include: { genres: true } } }
    });
    const likedGenreIds = rated.flatMap((rating) => rating.title.genres.map((genre) => genre.id));
    const topPicks = await this.prisma.title.findMany({
      where: likedGenreIds.length
        ? { status: TitleStatus.PUBLISHED, genres: { some: { id: { in: likedGenreIds } } } }
        : { status: TitleStatus.PUBLISHED },
      include: titleInclude,
      orderBy: [{ popularity: 'desc' }, { releaseYear: 'desc' }],
      take: 12
    });

    const rows = [
      {
        key: 'latest-imports',
        label: 'Latest Imports',
        titles: latestImports
          .filter((title) => isAllowedByMaturity(title.maturityRating, profile.maturityRating))
          .map(mapTitle)
      },
      {
        key: 'continue-watching',
        label: 'Continue Watching',
        titles: continueWatching.map((item) => ({
          ...mapTitle(item.title),
          progress: item.durationSeconds
            ? Math.round((item.positionSeconds / item.durationSeconds) * 100)
            : 0
        }))
      },
      {
        key: 'top-picks',
        label: 'Top Picks for You',
        titles: topPicks
          .filter((title) => isAllowedByMaturity(title.maturityRating, profile.maturityRating))
          .map(mapTitle)
      },
      ...manualRows.map((row) => ({
        key: row.key,
        label: row.label,
        titles: row.items
          .map((item) => item.title)
          .filter((title) => isAllowedByMaturity(title.maturityRating, profile.maturityRating))
          .map(mapTitle)
      }))
    ].filter((row) => row.titles.length > 0);

    return {
      featured: featured ? mapTitle(featured) : null,
      rows
    };
  }

  async createTitle(dto: CreateTitleDto) {
    return mapTitle(await this.createTitleRecord(dto));
  }

  private async createTitleRecord(dto: CreateTitleDto) {
    const genres = await Promise.all(
      dto.genres.map((name) =>
        this.prisma.genre.upsert({
          where: { slug: this.slugify(name) },
          update: {},
          create: { name, slug: this.slugify(name) }
        })
      )
    );

    const summary = this.ai.generateSummary({
      name: dto.name,
      description: dto.description,
      aiSummary: null,
      cast: dto.cast,
      moods: dto.moods,
      tags: dto.tags,
      genres: genres.map((genre) => ({ name: genre.name }))
    });

    return this.prisma.title.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        aiSummary: summary,
        type: dto.type,
        releaseYear: dto.releaseYear,
        runtimeMinutes: dto.runtimeMinutes,
        maturityRating: dto.maturityRating,
        language: dto.language ?? 'English',
        cast: dto.cast,
        moods: dto.moods,
        tags: dto.tags,
        genres: { connect: genres.map((genre) => ({ id: genre.id })) },
        assets: {
          create: [
            { kind: AssetKind.POSTER, url: dto.posterUrl, altText: `${dto.name} poster` },
            { kind: AssetKind.BACKDROP, url: dto.backdropUrl, altText: `${dto.name} backdrop` },
            ...(dto.trailerUrl
              ? [{ kind: AssetKind.TRAILER, url: dto.trailerUrl, altText: `${dto.name} trailer` as string }]
              : []),
            { kind: AssetKind.VIDEO, url: dto.videoUrl, altText: `${dto.name} video` }
          ]
        },
        embeddings: {
          create: {
            source: 'admin',
            text: `${dto.name} ${dto.description} ${dto.genres.join(' ')}`,
            vector: this.ai.vectorFor(`${dto.name} ${dto.description} ${dto.tags.join(' ')}`)
          }
        }
      },
      include: titleInclude
    });
  }

  async archiveTitle(titleId: string) {
    return this.prisma.title.update({
      where: { id: titleId },
      data: { status: TitleStatus.ARCHIVED }
    });
  }

  async updateTitle(titleId: string, dto: UpdateTitleDto) {
    const genreUpdate = dto.genres
      ? {
          genres: {
            set: await Promise.all(
              dto.genres.map(async (name) => ({
                id: (
                  await this.prisma.genre.upsert({
                    where: { slug: this.slugify(name) },
                    update: {},
                    create: { name, slug: this.slugify(name) }
                  })
                ).id
              }))
            )
          }
        }
      : {};

    const updated = await this.prisma.title.update({
      where: { id: titleId },
      data: {
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.releaseYear ? { releaseYear: dto.releaseYear } : {}),
        ...(dto.runtimeMinutes ? { runtimeMinutes: dto.runtimeMinutes } : {}),
        ...(dto.maturityRating ? { maturityRating: dto.maturityRating } : {}),
        ...(dto.language ? { language: dto.language } : {}),
        ...(dto.cast ? { cast: dto.cast } : {}),
        ...(dto.moods ? { moods: dto.moods } : {}),
        ...(dto.tags ? { tags: dto.tags } : {}),
        ...genreUpdate
      },
      include: titleInclude
    });

    return mapTitle(updated);
  }

  private slugify(input: string) {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}

function inferStreamType(url: string): 'embed' | 'video' {
  if (url.includes('youtube.com/embed/') || /vsembed\.ru|cloudnestra|\/embed\//i.test(url)) {
    return 'embed';
  }

  return 'video';
}
