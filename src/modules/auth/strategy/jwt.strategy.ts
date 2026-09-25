import { UserStatusEnum } from '@/common/constants/enum';
import {
  AuthenticatedUser,
  JwtAccessPayload,
} from '@/common/interfaces/jwt-payload.interface';
import { UsersService } from '@/modules/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
      // getOrThrow: an undefined issuer/audience would silently skip the check.
      issuer: config.getOrThrow<string>('jwt.issuer'),
      audience: config.getOrThrow<string>('jwt.audience'),
      algorithms: ['HS256'],
    });
  }

  // Called only after passport-jwt has verified signature, expiry, issuer and
  // audience. The user is re-read so a role change or deactivation takes effect
  // immediately instead of when the token expires.
  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Expected an access token');
    }

    if (typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Token has no expiry');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('Account no longer exists');

    if (user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
