import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        profiles: {
          create: {
            name: dto.profileName ?? dto.name ?? 'Viewer',
            avatarUrl: `https://picsum.photos/seed/streamverse-${encodeURIComponent(dto.email)}/240/240`
          }
        }
      },
      include: { profiles: true }
    });

    return this.sessionFor(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { profiles: true }
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.sessionFor(user);
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profiles: true }
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return this.sessionFor(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profiles: true }
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return { user: this.safeUser(user), profiles: user.profiles };
  }

  private sessionFor(user: User & { profiles?: unknown[] }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    return {
      token: this.jwt.sign(payload),
      user: this.safeUser(user),
      profiles: user.profiles ?? []
    };
  }

  private safeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      createdAt: user.createdAt
    };
  }
}
