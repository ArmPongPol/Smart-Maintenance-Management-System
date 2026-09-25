import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { UserRoleEnum, UserStatusEnum } from '@/common/constants/enum';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from '@/common/interfaces/jwt-payload.interface';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthTokens } from './interfaces/auth-tokens.interface';

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_REFRESH_TOKEN = 'Invalid or expired refresh token';

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so a miss costs the same
  // argon2 work as a wrong password and response time doesn't reveal which
  // emails have accounts.
  private readonly dummyHash = argon2.hash(randomBytes(32).toString('hex'));

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Self-registered accounts always start as OPERATOR; only an admin can
  // assign another role, through POST /users.
  register(dto: RegisterDto): Promise<User> {
    return this.usersService.create({ ...dto, role: UserRoleEnum.OPERATOR });
  }

  async login({ email, password }: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(email);
    const passwordMatches = await argon2.verify(
      user?.password ?? (await this.dummyHash),
      password,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Safe to be specific here: the caller has proven they know the password.
    if (user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.issueTokens(user);
  }

  async refresh({ refreshToken }: RefreshTokenDto): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
          issuer: this.config.getOrThrow<string>('jwt.issuer'),
          audience: this.config.getOrThrow<string>('jwt.audience'),
          algorithms: ['HS256'],
        },
      );
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // An access token already fails verification (different secret); the type
    // check guards against the secrets ever being set to the same value.
    if (payload.type !== 'refresh' || typeof payload.exp !== 'number') {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // Re-read so a deactivated account can't keep refreshing for up to 7 days.
    const user = await this.usersService.findOne(payload.sub);
    if (!user || user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    return this.issueTokens(user);
  }

  me(userId: string): Promise<User> {
    return this.usersService.findOneOrFail(userId);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessPayload: Pick<
      JwtAccessPayload,
      'sub' | 'email' | 'role' | 'type'
    > = { sub: user.id, email: user.email, role: user.role, type: 'access' };
    const refreshPayload: Pick<JwtRefreshPayload, 'sub' | 'type'> = {
      sub: user.id,
      type: 'refresh',
    };

    // Access tokens use the module's signOptions (see AuthModule); the refresh
    // token overrides only the secret and lifetime.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.getOrThrow<string>(
          'jwt.refreshTtl',
        ) as JwtSignOptions['expiresIn'],
      }),
    ]);

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }
}
