import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    // Defaults are for access tokens; AuthService overrides secret and
    // expiresIn when signing a refresh token. JwtStrategy verifies with the
    // same secret, issuer, audience and algorithm.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: {
          algorithm: 'HS256',
          issuer: config.getOrThrow<string>('jwt.issuer'),
          audience: config.getOrThrow<string>('jwt.audience'),
          expiresIn: config.getOrThrow<string>(
            'jwt.accessTtl',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
