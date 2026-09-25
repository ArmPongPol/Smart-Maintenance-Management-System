import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    return isPublic ? true : super.canActivate(context);
  }

  // `info` is passport-jwt's reason when the token itself is rejected, e.g.
  // TokenExpiredError "jwt expired" or "No auth token".
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info?: Error,
  ): TUser {
    if (err) throw err instanceof Error ? err : new UnauthorizedException();
    if (!user) {
      throw new UnauthorizedException(
        info?.message ?? 'Invalid or expired access token',
      );
    }

    return user;
  }
}
