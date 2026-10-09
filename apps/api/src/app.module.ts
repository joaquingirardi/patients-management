import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter';
import { loggerConfig } from './common/logging/logger.config';
import { APP_CONFIG, type AppConfig } from './config/app-config';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({ inject: [APP_CONFIG], useFactory: loggerConfig }),
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: ({ throttle }: AppConfig) => ({
        throttlers: [
          { name: 'default', ttl: throttle.ttlMs, limit: throttle.limit },
          // Login is limited per client IP *and* per target account: even an attacker rotating
          // IPs cannot guess one account's password faster than `loginLimit` per window.
          { name: 'login', ttl: throttle.ttlMs, limit: throttle.loginLimit },
          {
            name: 'loginAccount',
            ttl: throttle.ttlMs,
            limit: throttle.loginLimit,
            getTracker: (req: { ip?: string; body?: { email?: unknown } }) =>
              typeof req.body?.email === 'string'
                ? `account:${req.body.email.trim().toLowerCase()}`
                : `ip:${req.ip ?? 'unknown'}`,
          },
        ],
      }),
    }),
    DatabaseModule,
    AuthModule,
    PatientsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    // Rate limiting runs before authentication so credential stuffing is throttled too.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
