import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * NewAccountDTO - Used for creating a new Walmart account
 * 
 * Fully compatible with the C# Models/DTO/NewAccountDTO.cs.
 */
export class NewAccountDTO {
  @ApiProperty({
    description: 'ByeLabel Account ID',
    example: 'account-123',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'ByeLabel Store ID',
    example: 'store-456',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Walmart Client ID - Obtained from Walmart Partner Portal',
    example: 'your-walmart-client-id',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    description: 'Walmart Client Secret - Obtained from Walmart Partner Portal',
    example: 'your-walmart-client-secret',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  clientSecret: string;
}
