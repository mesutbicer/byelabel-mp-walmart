import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderEndpointService } from './order-endpoint.service';
import { Order } from '../database/entities/order.entity';
import { OrderLine } from '../database/entities/order-line.entity';
import { OrderLineStatus } from '../database/entities/order-line-status.entity';
import { Charge } from '../database/entities/charge.entity';
import { ShippingInfo } from '../database/entities/shipping-info.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * OrderModule - Order module
 * 
 * This module contains all components related to order management:
 * - OrderController: HTTP endpoint'leri
 * - OrderService: Business logic
 * - OrderEndpointService: Walmart API communication
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderLine,
      OrderLineStatus,
      Charge,
      ShippingInfo,
      User,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderEndpointService],
  exports: [OrderService, OrderEndpointService],
})
export class OrderModule {}
