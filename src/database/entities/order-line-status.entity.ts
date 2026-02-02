import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OrderLine } from './order-line.entity';

/**
 * OrderLineStatus entity - Stores order line status information
 * 
 * NOTE: StatusQuantity, TrackingInfo and CarrierName owned entities
 * are stored as flattened columns.
 */
@Entity('OrderLineStatus')
export class OrderLineStatus {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: 'Status', example: 'Shipped' })
  @Column({ name: 'status', type: 'text', nullable: true })
  status: string;

  // StatusQuantity - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Unit of measurement', example: 'EACH' })
  @Column({ name: 'statusQuantity_unitOfMeasurement', type: 'text', nullable: true })
  statusQuantity_unitOfMeasurement: string;

  @ApiProperty({ description: 'Status quantity amount', example: '1' })
  @Column({ name: 'statusQuantity_amount', type: 'text', nullable: true })
  statusQuantity_amount: string;

  // TrackingInfo - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Ship date time (Unix timestamp)', example: 1704067200000 })
  @Column({ name: 'trackingInfo_shipDateTime', type: 'bigint', nullable: true })
  trackingInfo_shipDateTime: number;

  // CarrierName - Nested Owned Entity
  @ApiProperty({ description: 'Other carrier name (for non-standard carriers)', example: 'Local Courier' })
  @Column({ name: 'trackingInfo_carrierName_otherCarrier', type: 'text', nullable: true })
  trackingInfo_carrierName_otherCarrier: string;

  @ApiProperty({ description: 'Standard carrier name', example: 'UPS' })
  @Column({ name: 'trackingInfo_carrierName_carrier', type: 'text', nullable: true })
  trackingInfo_carrierName_carrier: string;

  @ApiProperty({ description: 'Shipping method code', example: 'Standard' })
  @Column({ name: 'trackingInfo_methodCode', type: 'text', nullable: true })
  trackingInfo_methodCode: string;

  @ApiProperty({ description: 'Tracking number', example: '1Z999AA10123456784' })
  @Column({ name: 'trackingInfo_trackingNumber', type: 'text', nullable: true })
  trackingInfo_trackingNumber: string;

  @ApiProperty({ description: 'Tracking URL', example: 'https://tracking.example.com/123' })
  @Column({ name: 'trackingInfo_trackingURL', type: 'text', nullable: true })
  trackingInfo_trackingURL: string;

  // Foreign Key - OrderLine
  @Column({ name: 'OrderLineid', type: 'integer', nullable: true })
  OrderLineid: number;

  @ManyToOne(() => OrderLine, (orderLine) => orderLine.orderLineStatus)
  @JoinColumn({ name: 'OrderLineid' })
  orderLine: OrderLine;

  /**
   * Generates a string representation for comparison
   * Matches C# implementation's ToString() method
   */
  toString(): string {
    return `${this.status}_${this.statusQuantity_unitOfMeasurement}_${this.statusQuantity_amount}_${this.trackingInfo_shipDateTime}_${this.trackingInfo_carrierName_otherCarrier}_${this.trackingInfo_carrierName_carrier}_${this.trackingInfo_methodCode}_${this.trackingInfo_trackingNumber}_${this.trackingInfo_trackingURL}`;
  }

  /**
   * Checks equality based on string representation
   * Matches C# implementation's Equals() method
   */
  equals(other: OrderLineStatus): boolean {
    if (!other) return false;
    return this.toString() === other.toString();
  }
}
