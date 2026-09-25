import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserRoleEnum, UserStatusEnum } from '@/common/constants/enum';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from '@/common/interfaces/jwt-payload.interface';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

const jwtConfig = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'r'.repeat(32),
  accessTtl: '15m',
  refreshTtl: '7d',
  issuer: 'test-issuer',
  audience: 'test-audience',
};
const PASSWORD = 'Str0ng!Passw0rd';

describe('AuthService', () => {
  let service: AuthService;
  let passwordHash: string;

  const jwtService = new JwtService({
    secret: jwtConfig.accessSecret,
    signOptions: {
      algorithm: 'HS256',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      expiresIn: '15m',
    },
  });
  const verifyOptions = (secret: string) => ({
    secret,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });

  const usersService = {
    create: jest.fn(),
    findByEmailWithPassword: jest.fn<Promise<User | null>, [string]>(),
    findOne: jest.fn<Promise<User | null>, [string]>(),
    findOneOrFail: jest.fn(),
  };

  const makeUser = (overrides: Partial<User> = {}) =>
    ({
      id: 'u1',
      email: 'user@example.com',
      role: UserRoleEnum.OPERATOR,
      status: UserStatusEnum.ACTIVE,
      password: passwordHash,
      ...overrides,
    }) as User;

  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
      new ConfigService({ jwt: jwtConfig }),
    );
  });

  describe('register', () => {
    it('always creates an OPERATOR, whatever the body says', async () => {
      const dto = {
        email: 'user@example.com',
        password: PASSWORD,
        firstName: 'Test',
        lastName: 'User',
        role: UserRoleEnum.ADMIN,
      } as RegisterDto;

      await service.register(dto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRoleEnum.OPERATOR }),
      );
    });
  });

  describe('login', () => {
    it('issues an access token carrying the user id and role', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        makeUser({ role: UserRoleEnum.LEADER }),
      );

      const { accessToken } = await service.login({
        email: 'user@example.com',
        password: PASSWORD,
      });

      const payload = await jwtService.verifyAsync<JwtAccessPayload>(
        accessToken,
        verifyOptions(jwtConfig.accessSecret),
      );
      expect(payload).toMatchObject({
        sub: 'u1',
        role: UserRoleEnum.LEADER,
        type: 'access',
      });
      expect(payload.exp - payload.iat).toBe(15 * 60);
    });

    it('rejects a wrong password', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(makeUser());

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('gives an unknown email the same error as a wrong password', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: PASSWORD }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('rejects an inactive account', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        makeUser({ status: UserStatusEnum.INACTIVE }),
      );

      await expect(
        service.login({ email: 'user@example.com', password: PASSWORD }),
      ).rejects.toThrow(new UnauthorizedException('Account is inactive'));
    });
  });

  describe('refresh', () => {
    const loginTokens = async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(makeUser());
      return service.login({ email: 'user@example.com', password: PASSWORD });
    };

    it('issues a new token pair for a valid refresh token', async () => {
      const { refreshToken } = await loginTokens();
      usersService.findOne.mockResolvedValue(makeUser());

      const tokens = await service.refresh({ refreshToken });

      expect(tokens.accessToken).toEqual(expect.any(String));
      const payload = await jwtService.verifyAsync<JwtRefreshPayload>(
        tokens.refreshToken,
        verifyOptions(jwtConfig.refreshSecret),
      );
      expect(payload.type).toBe('refresh');
    });

    it('rejects an access token', async () => {
      const { accessToken } = await loginTokens();

      await expect(
        service.refresh({ refreshToken: accessToken }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a token signed with the refresh secret but typed access', async () => {
      const forged = await jwtService.signAsync(
        { sub: 'u1', type: 'access' },
        { secret: jwtConfig.refreshSecret },
      );

      await expect(
        service.refresh({ refreshToken: forged }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the account was deactivated after login', async () => {
      const { refreshToken } = await loginTokens();
      usersService.findOne.mockResolvedValue(
        makeUser({ status: UserStatusEnum.INACTIVE }),
      );

      await expect(service.refresh({ refreshToken })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
