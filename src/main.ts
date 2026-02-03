import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Strip /mp-walmart prefix from ALB requests
  app.use((req, res, next) => {
    if (req.url.startsWith('/mp-walmart')) {
      req.url = req.url.replace('/mp-walmart', '') || '/';
    }
    next();
  });

  // Enable CORS
  app.enableCors();

  // Swagger Configuration
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  const port = configService.get<number>('PORT') || 8082;
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Walmart Marketplace API Service')
    .setDescription(`
## Walmart Marketplace API Integration Service

This service is a NestJS application that integrates with the Walmart Marketplace API.

### Key Features

- **Authentication**: OAuth2 token management for Walmart API access
- **Order Management: Order synchronization and management
- **Order Dispatch: Shipment information submission
- **Scheduled Jobs: Automatic order synchronization

### API Endpoints

- \`/api/Auth - User account management
- \`/api/Order - Order operations
- \`/health-check - Service health check

### Authentication

Credentials required for Walmart API access:
- **Client ID: Obtained from Walmart Partner account
- **Client Secret: Obtained from Walmart Partner account

### Rate Limiting

Walmart API enforces rate limiting. Refer to the Walmart Developer Portal for details.
    `)
      .setVersion('1.0.0')
      .addTag('Auth', 'User account management operations')
      .addTag('Order', 'Order management operations')
      .addTag('Health', 'Service health check')
      .addServer('/mp-walmart', 'Current Server')
      .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Walmart Service API Documentation',
  });

  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/swagger`);
  logger.log(`🏥 Health check: http://localhost:${port}/health-check`);
  logger.log(`🌍 Environment: ${configService.get<string>('NODE_ENV') || 'development'}`);
}

bootstrap();
