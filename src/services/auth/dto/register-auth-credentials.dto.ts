import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterAuthCredentialsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  fullname: string;

  @IsString()
  @Matches(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, {
    message: 'Please enter a vild email address',
  })
  email: string;

  @IsString()
  @IsOptional()
  bio: string;

  @IsString()
  @MinLength(4)
  @MaxLength(16)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password too weak',
  })
  password: string;
}
