import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ImportTmdbDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsIn(['movie', 'tv', 'all'])
  mediaType?: 'movie' | 'tv' | 'all';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
