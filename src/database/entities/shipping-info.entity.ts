import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ShippingInfo entity - Stores order shipping information
 * 
 * NOTE: The C# Owned Entity structure is modeled as a separate table in NestJS.
 * PostalAddress fields are stored with underscore-joined column names.
 */
@Entity('ShippingInfo')
export class ShippingInfo {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: 'Contact phone number', example: '+1234567890' })
  @Column({ name: 'phone', type: 'text', nullable: true })
  phone: string;

  @ApiProperty({ description: 'Estimated delivery date (Unix timestamp)', example: 1704067200000 })
  @Column({ name: 'estimatedDeliveryDate', type: 'bigint', nullable: true })
  estimatedDeliveryDate: number;

  @ApiProperty({ description: 'Estimated ship date (Unix timestamp)', example: 1704067200000 })
  @Column({ name: 'estimatedShipDate', type: 'bigint', nullable: true })
  estimatedShipDate: number;

  @ApiProperty({ description: 'Shipping method code', example: 'Standard' })
  @Column({ name: 'methodCode', type: 'text', nullable: true })
  methodCode: string;

  // PostalAddress - Owned Entity (flattened columns)
  @ApiProperty({ description: 'Recipient name', example: 'John Doe' })
  @Column({ name: 'postalAddress_name', type: 'text', nullable: true })
  postalAddress_name: string;

  @ApiProperty({ description: 'Address line 1', example: '123 Main St' })
  @Column({ name: 'postalAddress_address1', type: 'text', nullable: true })
  postalAddress_address1: string;

  @ApiProperty({ description: 'Address line 2', example: 'Apt 4B' })
  @Column({ name: 'postalAddress_address2', type: 'text', nullable: true })
  postalAddress_address2: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  @Column({ name: 'postalAddress_city', type: 'text', nullable: true })
  postalAddress_city: string;

  @ApiProperty({ description: 'State code', example: 'NY' })
  @Column({ name: 'postalAddress_state', type: 'text', nullable: true })
  postalAddress_state: string;

  @ApiProperty({ description: 'Postal code', example: '10001' })
  @Column({ name: 'postalAddress_postalCode', type: 'text', nullable: true })
  postalAddress_postalCode: string;

  @ApiProperty({ description: 'Country code (ISO Alpha-3)', example: 'USA' })
  @Column({ name: 'postalAddress_country', type: 'text', nullable: true })
  postalAddress_country: string;

  @ApiProperty({ description: 'Address type', example: 'RESIDENTIAL' })
  @Column({ name: 'postalAddress_addressType', type: 'text', nullable: true })
  postalAddress_addressType: string;
}
