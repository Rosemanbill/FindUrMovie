import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('titles')
  list(
    @CurrentUser() user: JwtUser,
    @Query('q') query?: string,
    @Query('genre') genre?: string,
    @Query('profileId') profileId?: string
  ) {
    return this.catalog.list({ query, genre, profileId, userId: user.sub });
  }

  @Get('titles/:slug/stream')
  stream(@Param('slug') slug: string) {
    return this.catalog.resolveStream(slug);
  }

  @Get('titles/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.catalog.findBySlug(slug);
  }

  @Get('titles/:id/similar')
  similar(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('profileId') profileId?: string
  ) {
    return this.catalog.similar(id, profileId, user.sub);
  }

  @Get('home/rows')
  homeRows(@CurrentUser() user: JwtUser, @Query('profileId') profileId?: string) {
    if (!profileId) {
      throw new BadRequestException('profileId is required.');
    }

    return this.catalog.homeRows(profileId, user.sub);
  }

  @Get('search')
  search(
    @CurrentUser() user: JwtUser,
    @Query('q') query?: string,
    @Query('profileId') profileId?: string
  ) {
    if (!query || !profileId) {
      throw new BadRequestException('q and profileId are required.');
    }

    return this.catalog.search(query, profileId, user.sub);
  }
}
