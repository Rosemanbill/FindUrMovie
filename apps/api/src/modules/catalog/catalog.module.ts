import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { AiService } from './ai.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { HdtodayCasaService } from './hdtoday-casa.service';
import { MovieclubHdService } from './movieclub-hd.service';

@Module({
  imports: [ProfilesModule],
  controllers: [CatalogController, ActivityController],
  providers: [CatalogService, ActivityService, AiService, HdtodayCasaService, MovieclubHdService],
  exports: [CatalogService, ActivityService, AiService, HdtodayCasaService]
})
export class CatalogModule {}
