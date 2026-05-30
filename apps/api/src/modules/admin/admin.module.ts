import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { HarImportService } from './har-import.service';
import { ProviderTemplateService } from './provider-template.service';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [CatalogModule],
  controllers: [AdminController],
  providers: [AdminService, TmdbService, HarImportService, ProviderTemplateService]
})
export class AdminModule {}
