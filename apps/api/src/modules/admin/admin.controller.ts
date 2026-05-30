import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/admin.guard';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CatalogService } from '../catalog/catalog.service';
import { CreateTitleDto } from '../catalog/dto/create-title.dto';
import { UpdateTitleDto } from '../catalog/dto/update-title.dto';
import { AdminService } from './admin.service';
import { ImportHarDto } from './dto/import-har.dto';
import { ImportProviderTemplateDto } from './dto/import-provider-template.dto';
import { ImportTmdbDto } from './dto/import-tmdb.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly catalog: CatalogService
  ) {}

  @Post('titles')
  createTitle(@Body() dto: CreateTitleDto) {
    return this.catalog.createTitle(dto);
  }

  @Patch('titles/:id')
  updateTitle(@Param('id') id: string, @Body() dto: UpdateTitleDto) {
    return this.catalog.updateTitle(id, dto);
  }

  @Delete('titles/:id')
  archiveTitle(@Param('id') id: string) {
    return this.catalog.archiveTitle(id);
  }

  @Post('seed')
  seedDemo() {
    return this.admin.seedDemo();
  }

  @Post('import/tmdb')
  importTmdb(@Body() dto: ImportTmdbDto) {
    return this.admin.importFromTmdb(dto);
  }

  @Post('import/har')
  importHar(@Body() dto: ImportHarDto) {
    return this.admin.importFromHar(dto);
  }

  @Post('import/provider-template')
  importProviderTemplate(@Body() dto: ImportProviderTemplateDto) {
    return this.admin.importFromProviderTemplate(dto);
  }
}
