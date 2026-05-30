import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ImportProviderTemplateDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
