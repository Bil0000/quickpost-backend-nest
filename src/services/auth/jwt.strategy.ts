import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from './users.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './user.entity';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Users) private usersRepository: UsersRepository,
  ) {
    super({
      secretOrKey: 'topSecret51',
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<Users> {
    const { id, iat } = payload;
    const user: Users = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new UnauthorizedException();
    }

    // If the user has a lastLogoutAt timestamp, convert it to a Unix epoch (seconds)
    const lastLogoutAtEpoch = user.lastLogoutAt
      ? user.lastLogoutAt.getTime() / 1000
      : null;

    // If the token was issued before the last logout time, throw an UnauthorizedException
    if (lastLogoutAtEpoch && iat && iat < lastLogoutAtEpoch) {
      throw new UnauthorizedException(
        'Token has been invalidated due to logout from all devices.',
      );
    }

    return user;
  }
}
