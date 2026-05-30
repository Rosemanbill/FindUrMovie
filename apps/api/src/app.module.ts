import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthController } from './modules/health/health.controller';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProfilesModule,
    CatalogModule,
    AdminModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
