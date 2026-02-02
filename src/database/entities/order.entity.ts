import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingInfo } from './shipping-info.entity';
import { OrderLine } from './order-line.entity';

/**
 * Order entity - Stores Walmart orders
 * 
 * NOTE: Column names are fully compatible with the C# project structure.
 * Foreign key relationships are configured according to Entity Framework conventions.
 */
@Entity('Orders')
export class Order {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: 'Walmart Client ID', example: 'walmart-client-id' })
  @Column({ name: 'clientId', type: 'text', nullable: true })
  clientId: string;

  @ApiProperty({ description: 'ByeLabel Store ID', example: 'store456' })
  @Column({ name: 'storeId', type: 'text', nullable: true })
  storeId: string;

  @ApiProperty({ description: 'Walmart Purchase Order ID', example: '1234567890123' })
  @Column({ name: 'purchaseOrderId', type: 'text', nullable: true })
  purchaseOrderId: string;

  @ApiProperty({ description: 'Customer Order ID', example: 'CUST-ORDER-123' })
  @Column({ name: 'customerOrderId', type: 'text', nullable: true })
  customerOrderId: string;

  @ApiProperty({ description: 'Customer Email', example: 'customer@example.com' })
  @Column({ name: 'customerEmailId', type: 'text', nullable: true })
  customerEmailId: string;

  @ApiProperty({ description: 'Order Type', example: 'REGULAR' })
  @Column({ name: 'orderType', type: 'text', nullable: true })
  orderType: string;

  @ApiProperty({ description: 'Original Customer Order ID', example: 'ORIG-ORDER-123' })
  @Column({ name: 'originalCustomerOrderID', type: 'text', nullable: true })
  originalCustomerOrderID: string;

  @ApiProperty({ description: 'Order date (Unix timestamp ms)', example: 1704067200000 })
  @Column({ name: 'orderDate', type: 'bigint', nullable: true })
  orderDate: number;

  @ApiProperty({ description: 'Local update date (Unix timestamp ms)', example: 1704067200000 })
  @Column({ name: 'orderLocalUpdateDate', type: 'bigint', nullable: true })
  orderLocalUpdateDate: number;

  // Foreign Key - ShippingInfo
  @Column({ name: 'shippingInfoid', type: 'integer', nullable: true })
  shippingInfoid: number;

  @ManyToOne(() => ShippingInfo, { cascade: true, eager: true })
  @JoinColumn({ name: 'shippingInfoid' })
  shippingInfo: ShippingInfo;

  // One-to-Many - OrderLines
  @OneToMany(() => OrderLine, (orderLine) => orderLine.order, { cascade: true })
  orderLine: OrderLine[];
}
