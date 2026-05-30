import { IsOptional, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  maturityRating?: string;
}
