import { ApiProperty } from '@nestjs/swagger';

/**
 * UserResponseDTO - camelCase response format
 *
 * C# ASP.NET Core JSON serializer PascalCase property'leri
 * otomatik camelCase'e çevirir. Bu DTO aynı davranışı sağlar.
 */
export class UserResponseDTO {
    @ApiProperty({ description: 'Unique identifier', example: 1 })
    id: number;

    @ApiProperty({ description: 'ByeLabel User ID', example: 'user123' })
    userId: string;

    @ApiProperty({ description: 'ByeLabel Store ID', example: 'store456' })
    storeId: string;

    @ApiProperty({ description: 'Walmart Client ID', example: 'walmart-client-id' })
    clientId: string;

    @ApiProperty({ description: 'Walmart Client Secret (encrypted)', example: 'walmart-client-secret' })
    clientSecret: string;

    @ApiProperty({ description: 'Soft delete flag', example: false })
    isDeleted: boolean;
}