import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { UsersModule } from '../users/users.module';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PasswordHasher } from './password-hasher';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: ({ auth }: AppConfig) => ({
        secret: auth.jwtSecret,
        // The algorithm is pinned on both sides: no "alg: none", no algorithm confusion.
        signOptions: {
          algorithm: 'HS256',
          expiresIn: auth.ttlSeconds,
          issuer: auth.issuer,
          audience: auth.audience,
        },
        verifyOptions: { algorithms: ['HS256'], issuer: auth.issuer, audience: auth.audience },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenService,
    PasswordHasher,
    // Order matters: authenticate (401) before authorizing (403).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [PasswordHasher],
})
export class AuthModule {}
