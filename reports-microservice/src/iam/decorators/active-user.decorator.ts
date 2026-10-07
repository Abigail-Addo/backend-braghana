import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST_USER_KEY } from '../iam.constants';
import { ActiveUserData } from '../interfaces/active-user-data.interfaces';

export const ActiveUser = () =>
  createParamDecorator(
    (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      const user: ActiveUserData = request[REQUEST_USER_KEY];
      if (!user) {
        throw new UnauthorizedException();
      }
      return field ? user?.[field] : user;

      // Switch to RPC context for NATS messages
      //  const rpcContext = ctx.switchToRpc();
      //  const data = rpcContext.getData();

      // Extract the `user` from the message payload
      //  const user = data?.user;

      //  if (!user) {
      //    throw new UnauthorizedException('User not found in payload');
      //  }

      // Return the specific field or the whole user object
      //  return field ? user?.[field] : user;
    },
  );
