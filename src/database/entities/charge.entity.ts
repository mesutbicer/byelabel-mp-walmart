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
 * Charge entity - Stores order line charge information
 * 
 * NOTE: ChargeAmount and Tax owned entities are stored as flattened columns.
 */
@Entity('Charge')
export class Charge {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: 'Charge type', example: 'PRODUCT' })
  @Column({ name: 'chargeType', type: 'text', nullable: true })
  chargeType: string;

  @ApiProperty({ description: 'Charge name', example: 'ItemPrice' })
  @Column({ name: 'chargeName', type: 'text', nullable: true })
  chargeName: string;

  // ChargeAmount - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @Column({ name: 'chargeAmount_currency', type: 'text', nullable: true })
  chargeAmount_currency: string;

  @ApiProperty({ description: 'Charge amount', example: 29.99 })
  @Column({ name: 'chargeAmount_amount', type: 'double precision', nullable: true })
  chargeAmount_amount: number;

  // Tax - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Tax name', example: 'Sales Tax' })
  @Column({ name: 'tax_taxName', type: 'text', nullable: true })
  tax_taxName: string;

  // TaxAmount - Nested Owned Entity
  @ApiProperty({ description: 'Tax currency', example: 'USD' })
  @Column({ name: 'tax_taxAmount_currency', type: 'text', nullable: true })
  tax_taxAmount_currency: string;

  @ApiProperty({ description: 'Tax amount', example: 2.50 })
  @Column({ name: 'tax_taxAmount_amount', type: 'double precision', nullable: true })
  tax_taxAmount_amount: number;

  // Foreign Key - OrderLine
  @Column({ name: 'OrderLineid', type: 'integer', nullable: true })
  OrderLineid: number;

  @ManyToOne(() => OrderLine, (orderLine) => orderLine.charge)
  @JoinColumn({ name: 'OrderLineid' })
  orderLine: OrderLine;
}
