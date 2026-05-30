import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateTitleDto } from '../catalog/dto/create-title.dto';
import { HdtodayCasaService } from '../catalog/hdtoday-casa.service';
import { mapCasaDetailsToTitle, mapCasaItemToTitle } from './hdtoday-casa.parser';

@Injectable()
export class ProviderTemplateService {
  constructor(
    private readonly config: ConfigService,
    private readonly hdtoday: HdtodayCasaService
  ) {}

  async importTitles(input: { query?: string; limit?: number }) {
    this.assertConfigured();

    const items = input.query?.trim()
      ? await this.hdtoday.search(input.query, input.limit ?? 20)
      : await this.hdtoday.listPopular(input.limit ?? 20);

    const titles = await Promise.all(
      items.map(async (item) => {
        const type = item.media_type === 'tv' ? 'tv' : 'movie';
        try {
          const details = await this.hdtoday.getDetails(type, item.id);
          return mapCasaDetailsToTitle(details, type) ?? mapCasaItemToTitle(item);
        } catch {
          return mapCasaItemToTitle(item);
        }
      })
    );

    return titles.filter((title): title is CreateTitleDto => Boolean(title));
  }

  private assertConfigured() {
    const apiBase = this.config.get<string>('PROVIDER_API_BASE_URL');
    if (!apiBase || apiBase === '__REPLACE_ME__') {
      throw new ServiceUnavailableException(
        'Provider template is not configured. Set PROVIDER_API_BASE_URL in apps/api/.env first.'
      );
    }
  }
}
