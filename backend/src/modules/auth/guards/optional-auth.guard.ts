import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { RequestContext } from '../interfaces/request-context';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();

    // Try Bearer token first
    const authHeader = request.headers['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await this.authService.verifyToken(token);
        const user = await this.authService.findByFirebaseUid(decoded.uid);
        if (!user) {
          throw new UnauthorizedException(
            'User not found — call POST /auth/verify first',
          );
        }
        request.requestContext = {
          ownerId: decoded.uid,
          isAuthenticated: true,
          userId: user.id,
        } satisfies RequestContext;
        return true;
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        throw new UnauthorizedException('Invalid Firebase token');
      }
    }

    // Fall back to X-Session-Id
    const sessionId = request.headers['x-session-id'] as string | undefined;
    if (sessionId) {
      request.requestContext = {
        ownerId: sessionId,
        isAuthenticated: false,
      } satisfies RequestContext;
      return true;
    }

    throw new UnauthorizedException(
      'Provide either Authorization: Bearer <token> or X-Session-Id header',
    );
  }
}
