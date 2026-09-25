import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRoleEnum, UserStatusEnum } from '@/common/constants/enum';
import { JwtAccessPayload } from '@/common/interfaces/jwt-payload.interface';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import { JwtStrategy } from './jwt.strategy';

const payload: JwtAccessPayload = {
  sub: 'u1',
  email: 'user@example.com',
  role: UserRoleEnum.OPERATOR,
  type: 'access',
  iat: 0,
  exp: 900,
  iss: 'test-issuer',
  aud: 'test-audience',
};

describe('JwtStrategy.validate', () => {
  let strategy: JwtStrategy;

  const usersService = { findOne: jest.fn<Promise<User | null>, [string]>() };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      new ConfigService({
        jwt: {
          accessSecret: 'a'.repeat(32),
          issuer: 'test-issuer',
          audience: 'test-audience',
        },
      }),
      usersService as unknown as UsersService,
    );
  });

  it('returns the role from the database, not from the token', async () => {
    usersService.findOne.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      role: UserRoleEnum.ADMIN,
      status: UserStatusEnum.ACTIVE,
    } as User);

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'u1',
      email: 'user@example.com',
      role: UserRoleEnum.ADMIN,
    });
  });

  it('rejects a refresh token', async () => {
    await expect(
      strategy.validate({
        ...payload,
        type: 'refresh',
      } as unknown as JwtAccessPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token without exp', async () => {
    await expect(
      strategy.validate({
        ...payload,
        exp: undefined,
      } as unknown as JwtAccessPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a deleted account', async () => {
    usersService.findOne.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an inactive account', async () => {
    usersService.findOne.mockResolvedValue({
      id: 'u1',
      status: UserStatusEnum.INACTIVE,
    } as User);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
