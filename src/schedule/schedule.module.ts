import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FetchOrderScheduleService } from './fetch-order-schedule.service';
import { User } from '../database/entities/user.entity';
import { OrderModule } from '../order/order.module';

/**
 * ScheduleModule - Periodic tasks module
 * 
 * This module contains background tasks:
 * - FetchOrderScheduleService: Order sync every 10 minutes
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    OrderModule,
  ],
  providers: [FetchOrderScheduleService],
  exports: [FetchOrderScheduleService],
})
export class ScheduleTaskModule {}
