import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ImportHarDto {
  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;
}
