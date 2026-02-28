import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../interfaces/request-context';

export const OwnerId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (request.requestContext as RequestContext).ownerId;
  },
);
