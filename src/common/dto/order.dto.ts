import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CustomerDTO - Customer information
 */
export class CustomerDTO {
  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'Company name', example: '' })
  company: string;

  @ApiProperty({ description: 'Phone number', example: '+1234567890' })
  phone: string;

  @ApiProperty({ description: 'Email address', example: 'customer@example.com' })
  email: string;

  @ApiProperty({ description: 'Tax number', example: '' })
  tax_number: string;

  @ApiProperty({ description: 'Country code (ISO Alpha-2)', example: 'US' })
  country_code: string;

  @ApiProperty({ description: 'Zip/Postal code', example: '10001' })
  zip_code: string;

  @ApiProperty({ description: 'State code', example: 'NY' })
  state_code: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  city: string;

  @ApiProperty({ description: 'Street address lines', example: ['123 Main St', 'Apt 4B'] })
  street: string[];

  @ApiProperty({ description: 'Is residential address', example: true })
  residential: boolean;
}

/**
 * DimensionDTO - Product dimensions
 */
export class DimensionDTO {
  @ApiProperty({ description: 'Width', example: 10.0 })
  width: number;

  @ApiProperty({ description: 'Height', example: 5.0 })
  height: number;

  @ApiProperty({ description: 'Length', example: 15.0 })
  length: number;

  @ApiProperty({ description: 'Unit (in, cm)', example: 'cm' })
  unit: string;

  constructor(width?: number, height?: number, length?: number, unit?: string) {
    this.width = width ?? 0;
    this.height = height ?? 0;
    this.length = length ?? 0;
    this.unit = unit ?? 'cm';
  }
}

/**
 * WeightDTO - Product weight
 */
export class WeightDTO {
  @ApiProperty({ description: 'Weight value', example: 1.5 })
  value: number;

  @ApiProperty({ description: 'Unit (lb, kg)', example: 'lb' })
  unit: string;

  constructor(value?: number, unit?: string) {
    this.value = value ?? 0;
    this.unit = unit ?? 'lb';
  }
}

/**
 * OrderLineDTO - Order line information
 */
export class OrderLineDTO {
  @ApiProperty({ description: 'Line number/ID', example: '1' })
  number: string;

  @ApiProperty({ description: 'Product code (SKU)', example: 'SKU-12345' })
  code: string;

  @ApiProperty({ description: 'Product description', example: 'Blue T-Shirt XL' })
  description: string;

  @ApiProperty({ description: 'Product image URL', example: 'https://example.com/image.jpg' })
  image_url: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency_code: string;

  @ApiProperty({ description: 'Unit selling price', example: 29.99 })
  unit_selling_price: number;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Total selling price', example: 59.98 })
  total_selling_price: number;

  @ApiProperty({ description: 'Product dimensions', type: DimensionDTO })
  dimensions: DimensionDTO;

  @ApiProperty({ description: 'Product weight', type: WeightDTO })
  weight: WeightDTO;
}

/**
 * OrderDTO - Order information (API response model)
 * 
 * Fully compatible with the C# DTOs/OrderDTO.cs.
 */
export class OrderDTO {
  @ApiProperty({ description: 'Order ID', example: '123' })
  id: string;

  @ApiProperty({ description: 'Order creation date (Unix timestamp ms)', example: 1704067200000 })
  created_at: number;

  @ApiProperty({ description: 'Last update date (Unix timestamp ms)', example: 1704153600000 })
  updated_at: number;

  @ApiProperty({ description: 'Order number (purchaseOrderId-customerOrderId)', example: 'PO123-CO456' })
  number: string;

  @ApiPropertyOptional({ description: 'Dispatch ID (purchaseOrderId)', example: 'PO123' })
  dispatch_id?: string;

  @ApiProperty({ 
    description: 'Order status', 
    example: 'awaiting',
    enum: ['awaiting', 'shipped', 'cancelled']
  })
  status: string;

  @ApiProperty({ description: 'Order tags', example: [], type: [String] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Has insurance', example: null })
  insurance: boolean | null;

  @ApiProperty({ description: 'Buyer note', example: '' })
  buyer_note: string;

  @ApiProperty({ description: 'Customer information', type: CustomerDTO })
  customer: CustomerDTO;

  @ApiProperty({ description: 'Order items', type: [OrderLineDTO] })
  items: OrderLineDTO[];
}
