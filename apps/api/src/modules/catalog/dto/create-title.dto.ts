import { TitleType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min
} from 'class-validator';

export class CreateTitleDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsEnum(TitleType)
  type!: TitleType;

  @IsInt()
  @Min(1900)
  releaseYear!: number;

  @IsOptional()
  @IsInt()
  runtimeMinutes?: number;

  @IsString()
  maturityRating!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsArray()
  @IsString({ each: true })
  genres!: string[];

  @IsArray()
  @IsString({ each: true })
  cast!: string[];

  @IsArray()
  @IsString({ each: true })
  moods!: string[];

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsUrl()
  posterUrl!: string;

  @IsUrl()
  backdropUrl!: string;

  @IsOptional()
  @IsUrl()
  trailerUrl?: string;

  @IsUrl()
  videoUrl!: string;
}
