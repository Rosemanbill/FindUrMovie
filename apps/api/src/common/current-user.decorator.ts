import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export type JwtUser = {
  sub: string;
  email: string;
  role: Role;
};

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ user: JwtUser }>();
  return request.user;
});
