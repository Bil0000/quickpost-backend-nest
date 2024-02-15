import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(1500)
  caption: string;

  @IsOptional()
  gifUrl?: string;
}
