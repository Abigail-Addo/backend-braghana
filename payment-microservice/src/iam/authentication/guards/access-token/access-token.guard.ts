import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  JsonWebTokenError,
  JwtService,
  NotBeforeError,
  TokenExpiredError,
} from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from 'src/iam/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/iam/iam.constants';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const decoded = await this.jwtService.verifyAsync(
        token,
        this.jwtConfiguration,
      );

      request[REQUEST_USER_KEY] = decoded;
    } catch (error) {
      console.log({ error });
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof NotBeforeError) {
        throw new UnauthorizedException('Token not active');
      }
      throw new UnauthorizedException(error);
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization || authorization === undefined) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authorization.split(' ') ?? [];

    if (!type || !token) {
      return 'Invalid token format';
      // throw new UnauthorizedException('Invalid token format');
    }

    return type === 'Bearer' ? token : undefined;
  }
}
