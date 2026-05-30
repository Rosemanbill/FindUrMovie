import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ActivityService } from './activity.service';
import { EventDto, ProgressDto, RatingDto, WatchlistDto } from './dto/activity.dto';
import { mapTitle } from './title.mapper';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('watchlist')
  async listWatchlist(@CurrentUser() user: JwtUser, @Query('profileId') profileId: string) {
    const titles = await this.activity.listWatchlist(user.sub, profileId);
    return titles.map(mapTitle);
  }

  @Post('watchlist')
  addToWatchlist(@CurrentUser() user: JwtUser, @Body() dto: WatchlistDto) {
    return this.activity.addToWatchlist(user.sub, dto);
  }

  @Delete('watchlist/:titleId')
  removeFromWatchlist(
    @CurrentUser() user: JwtUser,
    @Param('titleId') titleId: string,
    @Query('profileId') profileId: string
  ) {
    return this.activity.removeFromWatchlist(user.sub, profileId, titleId);
  }

  @Post('progress')
  saveProgress(@CurrentUser() user: JwtUser, @Body() dto: ProgressDto) {
    return this.activity.saveProgress(user.sub, dto);
  }

  @Get('progress/:titleId')
  getProgress(
    @CurrentUser() user: JwtUser,
    @Param('titleId') titleId: string,
    @Query('profileId') profileId: string
  ) {
    return this.activity.getProgress(user.sub, profileId, titleId);
  }

  @Post('ratings')
  rate(@CurrentUser() user: JwtUser, @Body() dto: RatingDto) {
    return this.activity.rate(user.sub, dto);
  }

  @Post('events')
  event(@CurrentUser() user: JwtUser, @Body() dto: EventDto) {
    return this.activity.event(user.sub, dto);
  }
}
