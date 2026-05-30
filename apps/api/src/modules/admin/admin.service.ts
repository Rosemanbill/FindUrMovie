import { Injectable } from '@nestjs/common';
import { TitleType } from '@prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImportHarDto } from './dto/import-har.dto';
import { ImportProviderTemplateDto } from './dto/import-provider-template.dto';
import { ImportTmdbDto } from './dto/import-tmdb.dto';
import { HarImportService } from './har-import.service';
import { ProviderTemplateService } from './provider-template.service';
import { TmdbService } from './tmdb.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly tmdb: TmdbService,
    private readonly harImport: HarImportService,
    private readonly providerTemplate: ProviderTemplateService
  ) {}

  async seedDemo() {
    const existing = await this.prisma.title.count();
    if (existing > 0) {
      return {
        ok: true,
        message: 'Demo catalog already has titles.',
        titles: existing
      };
    }

    const title = await this.catalog.createTitle({
      slug: 'sample-night-drive',
      name: 'Sample Night Drive',
      description: 'A short cinematic demo title for validating the streaming experience.',
      type: TitleType.MOVIE,
      releaseYear: 2026,
      runtimeMinutes: 12,
      maturityRating: 'PG',
      language: 'English',
      genres: ['Drama'],
      cast: ['Demo Cast'],
      moods: ['calming'],
      tags: ['sample', 'demo'],
      posterUrl: 'https://picsum.photos/seed/streamverse-sample-poster/720/1080',
      backdropUrl: 'https://picsum.photos/seed/streamverse-sample-backdrop/1600/900',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    });

    return { ok: true, message: 'Demo catalog seeded.', title };
  }

  async importFromTmdb(dto: ImportTmdbDto) {
    const imports = await this.tmdb.importTitles(dto);
    const created = [];

    for (const item of imports) {
      const existing = await this.prisma.title.findUnique({ where: { slug: item.slug } });
      if (existing) {
        continue;
      }

      created.push(await this.catalog.createTitle(item));
    }

    return {
      ok: true,
      imported: created.length,
      titles: created
    };
  }

  async importFromHar(dto: ImportHarDto) {
    const filePath =
      dto.filePath?.trim() ||
      'C:\\Users\\ritik\\Documents\\New project\\apps\\api\\data\\hdtoday.casa.har';
    const imports = await this.harImport.importFromHar(filePath, dto.limit ?? 80);
    const created = [];
    let skipped = 0;

    for (const item of imports) {
      const existing = await this.prisma.title.findUnique({ where: { slug: item.slug } });
      if (existing) {
        skipped += 1;
        continue;
      }

      created.push(await this.catalog.createTitle(item));
    }

    return {
      ok: true,
      imported: created.length,
      skipped,
      source: filePath,
      titles: created
    };
  }

  async importFromProviderTemplate(dto: ImportProviderTemplateDto) {
    const imports = await this.providerTemplate.importTitles(dto);
    const created = [];
    let skipped = 0;

    for (const item of imports) {
      const existing = await this.prisma.title.findUnique({ where: { slug: item.slug } });
      if (existing) {
        skipped += 1;
        continue;
      }

      created.push(await this.catalog.createTitle(item));
    }

    return {
      ok: true,
      imported: created.length,
      skipped,
      titles: created
    };
  }
}
