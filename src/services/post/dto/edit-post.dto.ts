import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EditPostDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1500)
  caption: string;
}
