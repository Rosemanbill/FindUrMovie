import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtUser } from './current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    if (request.user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin access is required.');
    }

    return true;
  }
}
