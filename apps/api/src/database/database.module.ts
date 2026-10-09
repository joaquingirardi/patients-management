import { Global, Module } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { CHAOS, createDatabase, DATABASE } from './database';
import { PrismaService } from './prisma.service';
import { Chaos } from './resilience/chaos';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: CHAOS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new Chaos(config.chaos),
    },
    {
      provide: DATABASE,
      inject: [PrismaService, CHAOS, APP_CONFIG],
      useFactory: (prisma: PrismaService, chaos: Chaos, config: AppConfig) =>
        createDatabase(prisma, { chaos, retry: config.retry }),
    },
  ],
  exports: [PrismaService, DATABASE],
})
export class DatabaseModule {}
