import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ShippingLineDTO - Shipping line information
 * 
 * Fully compatible with the C# DTOs/ShippingLineDTO.cs.
 */
export class ShippingLineDTO {
  @ApiPropertyOptional({
    description: 'Order item ID',
    example: '1',
  })
  @IsString()
  @IsOptional()
  orderItemId?: string;

  @ApiPropertyOptional({
    description: 'Order item quantity',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  orderItemQuantity?: number;

  @ApiProperty({
    description: 'Ship date time (Unix timestamp ms)',
    example: 1704067200000,
  })
  @IsNumber()
  shipDateTime: number;

  @ApiProperty({
    description: 'Carrier name. Valid carriers: UPS, USPS, FedEx, DHL, Asendia. For unknown carriers, trackingURL is required.',
    example: 'UPS',
  })
  @IsString()
  @IsNotEmpty()
  carrierName: string;

  @ApiProperty({
    description: 'Shipping method code',
    example: 'Standard',
    enum: ['Standard', 'Express', 'OneDay', 'Freight', 'WhiteGlove', 'Value'],
  })
  @IsString()
  @IsNotEmpty()
  methodCode: string;

  @ApiPropertyOptional({
    description: 'Tracking number (required for known carriers)',
    example: '1Z999AA10123456784',
  })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Tracking URL (required for unknown carriers)',
    example: 'https://tracking.example.com/123',
  })
  @IsString()
  @IsOptional()
  trackingURL?: string;
}

/**
 * ShippingDTO - Shipping dispatch request model
 * 
 * Fully compatible with the C# DTOs/ShippingDTO.cs.
 */
export class ShippingDTO {
  @ApiProperty({
    description: 'Order ID (purchaseOrderId or customerOrderId)',
    example: '1234567890123',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'ByeLabel User ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'ByeLabel Store ID',
    example: 'store-456',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Shipping lines with tracking information',
    type: [ShippingLineDTO],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingLineDTO)
  shippingLines: ShippingLineDTO[];
}
