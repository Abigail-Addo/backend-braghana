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
  JwtVerifyOptions,
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
        this.jwtConfiguration as JwtVerifyOptions,
      );

      request[REQUEST_USER_KEY] = decoded;
    } catch (error) {
      // throw new UnauthorizedException(error);
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Your session has expired. Please log in again.',
        });
      } else if (error instanceof JsonWebTokenError) {
        console.log({ error });
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid token. Please log in again.',
        });
      }

      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authentication failed.',
      });
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
