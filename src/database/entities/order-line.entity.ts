import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';
import { Charge } from './charge.entity';
import { OrderLineStatus } from './order-line-status.entity';

/**
 * OrderLine entity - Stores order line items
 * 
 * NOTE: Item and Fulfillment owned entities are stored as flattened columns.
 * OrderLineQuantity is also stored as underscore-joined column names.
 */
@Entity('OrderLine')
export class OrderLine {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: 'Line number', example: '1' })
  @Column({ name: 'lineNumber', type: 'text', nullable: true })
  lineNumber: string;

  // Item - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Product name', example: 'Blue T-Shirt' })
  @Column({ name: 'item_productName', type: 'text', nullable: true })
  item_productName: string;

  @ApiProperty({ description: 'SKU', example: 'SKU-12345' })
  @Column({ name: 'item_sku', type: 'text', nullable: true })
  item_sku: string;

  @ApiProperty({ description: 'Item condition', example: 'New' })
  @Column({ name: 'item_condition', type: 'text', nullable: true })
  item_condition: string;

  @ApiProperty({ description: 'Image URL', example: 'https://example.com/image.jpg' })
  @Column({ name: 'item_imageUrl', type: 'text', nullable: true })
  item_imageUrl: string;

  // Item Weight - Nested Owned Entity
  @ApiProperty({ description: 'Weight value', example: '1.5' })
  @Column({ name: 'item_weight_value', type: 'text', nullable: true })
  item_weight_value: string;

  @ApiProperty({ description: 'Weight unit', example: 'lb' })
  @Column({ name: 'item_weight_unit', type: 'text', nullable: true })
  item_weight_unit: string;

  // OrderLineQuantity - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Unit of measurement', example: 'EACH' })
  @Column({ name: 'orderLineQuantity_unitOfMeasurement', type: 'text', nullable: true })
  orderLineQuantity_unitOfMeasurement: string;

  @ApiProperty({ description: 'Quantity amount', example: '2' })
  @Column({ name: 'orderLineQuantity_amount', type: 'text', nullable: true })
  orderLineQuantity_amount: string;

  @ApiProperty({ description: 'Status date (Unix timestamp)', example: 1704067200000 })
  @Column({ name: 'statusDate', type: 'bigint', nullable: true })
  statusDate: number;

  // Fulfillment - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Fulfillment option', example: 'S2H' })
  @Column({ name: 'fulfillment_fulfillmentOption', type: 'text', nullable: true })
  fulfillment_fulfillmentOption: string;

  @ApiProperty({ description: 'Ship method', example: 'STANDARD' })
  @Column({ name: 'fulfillment_shipMethod', type: 'text', nullable: true })
  fulfillment_shipMethod: string;

  @ApiProperty({ description: 'Pickup date time', example: 1704067200000 })
  @Column({ name: 'fulfillment_pickUpDateTime', type: 'bigint', nullable: true })
  fulfillment_pickUpDateTime: number;

  // Foreign Key - Order
  @Column({ name: 'Orderid', type: 'integer', nullable: true })
  Orderid: number;

  @ManyToOne(() => Order, (order) => order.orderLine)
  @JoinColumn({ name: 'Orderid' })
  order: Order;

  // One-to-Many - Charges
  @OneToMany(() => Charge, (charge) => charge.orderLine, { cascade: true })
  charge: Charge[];

  // One-to-Many - OrderLineStatus
  @OneToMany(() => OrderLineStatus, (status) => status.orderLine, { cascade: true })
  orderLineStatus: OrderLineStatus[];
}
