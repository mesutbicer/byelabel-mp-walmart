import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { ScheduleTaskModule } from './schedule/schedule.module';
import { User } from './database/entities/user.entity';
import { Order } from './database/entities/order.entity';
import { OrderLine } from './database/entities/order-line.entity';
import { OrderLineStatus } from './database/entities/order-line-status.entity';
import { Charge } from './database/entities/charge.entity';
import { ShippingInfo } from './database/entities/shipping-info.entity';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // TypeORM Module - PostgreSQL Connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'walmart_db'),
        entities: [User, Order, OrderLine, OrderLineStatus, Charge, ShippingInfo],
        // IMPORTANT: Set to false in production to prevent schema auto-sync
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        logging: configService.get<string>('DB_LOGGING') === 'true',
        // Connection pool settings
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // Schedule Module for Cron Jobs
    ScheduleModule.forRoot(),

    // Feature Modules
    AuthModule,
    OrderModule,
    ScheduleTaskModule,
  ],
  providers: [
    // Global Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Add middleware if needed
  }
}
