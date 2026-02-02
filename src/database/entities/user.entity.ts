import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * User entity - Stores Walmart API user credentials
 * 
 * NOTE: Table and column names must be fully compatible with the C# Entity Framework structure.
 * PascalCase column names are used to maintain compatibility with the existing database.
 */
@Entity('User')
export class User {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn({ name: 'Id' })
  Id: number;

  @ApiProperty({ description: 'ByeLabel User ID', example: 'user123' })
  @Column({ name: 'UserId', type: 'text', nullable: true })
  UserId: string;

  @ApiProperty({ description: 'ByeLabel Store ID', example: 'store456' })
  @Column({ name: 'StoreId', type: 'text', nullable: true })
  StoreId: string;

  @ApiProperty({ description: 'Walmart Client ID', example: 'walmart-client-id' })
  @Column({ name: 'ClientId', type: 'text', nullable: true })
  ClientId: string;

  @ApiProperty({ description: 'Walmart Client Secret (encrypted)', example: 'walmart-client-secret' })
  @Column({ name: 'ClientSecret', type: 'text', nullable: true })
  ClientSecret: string;

  @ApiProperty({ description: 'Soft delete flag', example: false })
  @Column({ name: 'IsDeleted', type: 'boolean', default: false })
  IsDeleted: boolean;
}
