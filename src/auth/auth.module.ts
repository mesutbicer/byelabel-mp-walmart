import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController, HealthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEndpointService } from './auth-endpoint.service';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController, HealthController],
  providers: [AuthService, AuthEndpointService],
  exports: [AuthService, AuthEndpointService],
})
export class AuthModule {}
