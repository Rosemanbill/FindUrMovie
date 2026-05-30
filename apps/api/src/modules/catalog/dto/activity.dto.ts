import { RatingValue } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class ProfileScopedDto {
  @IsString()
  profileId!: string;
}

export class WatchlistDto extends ProfileScopedDto {
  @IsString()
  titleId!: string;
}

export class ProgressDto extends WatchlistDto {
  @IsOptional()
  @IsString()
  episodeId?: string;

  @IsInt()
  @Min(0)
  positionSeconds!: number;

  @IsInt()
  @Min(0)
  durationSeconds!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class RatingDto extends WatchlistDto {
  @IsEnum(RatingValue)
  value!: RatingValue;
}

export class EventDto extends ProfileScopedDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  titleId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
