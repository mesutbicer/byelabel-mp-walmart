import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * App E2E Tests
 * 
 * General application tests - endpoint accessibility and configuration checks.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // HEALTH CHECK ENDPOINTS
  // ==========================================
  describe('Health Check Endpoints', () => {
    it('GET /health-check should return 200', () => {
      return request(app.getHttpServer())
        .get('/health-check')
        .expect(200);
    });

    it('GET /api/Auth/health-check should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/Auth/health-check')
        .expect(200);
    });

    it('GET /log-test should return 200', () => {
      return request(app.getHttpServer())
        .get('/log-test')
        .expect(200);
    });

    it('GET /api/Auth/log-test should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/Auth/log-test')
        .expect(200);
    });
  });

  // ==========================================
  // SWAGGER/OPENAPI ENDPOINTS
  // ==========================================
  describe('Swagger Documentation', () => {
    it('GET /api should return Swagger UI', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Content-Type', /html/);
    });

    it('GET /api-json should return OpenAPI JSON', () => {
      return request(app.getHttpServer())
        .get('/api-json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then(response => {
          expect(response.body).toHaveProperty('openapi');
          expect(response.body).toHaveProperty('info');
          expect(response.body).toHaveProperty('paths');
        });
    });
  });

  // ==========================================
  // AUTH ENDPOINTS AVAILABILITY
  // ==========================================
  describe('Auth Endpoints Availability', () => {
    it('POST /api/Auth should be available', () => {
      return request(app.getHttpServer())
        .post('/api/Auth')
        .send({})
        .then(response => {
          // 400 veya 401 beklenebilir (validation error)
          expect([400, 401]).toContain(response.status);
        });
    });

    it('DELETE /api/Auth/:accountId/:storeId should be available', () => {
      return request(app.getHttpServer())
        .delete('/api/Auth/test/test')
        .expect(200); // Delete always returns 200
    });
  });

  // ==========================================
  // ORDER ENDPOINTS AVAILABILITY
  // ==========================================
  describe('Order Endpoints Availability', () => {
    it('GET /api/Order/:accountId/:storeId/:lastUpdateDate should be available', () => {
      return request(app.getHttpServer())
        .get('/api/Order/test/test/0')
        .expect(400); // User not found = 400
    });

    it('GET /api/Order/GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate should be available', () => {
      return request(app.getHttpServer())
        .get('/api/Order/GetOrdersAfterDate/test/test/0')
        .expect(400);
    });

    it('GET /api/Order/GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId should be available', () => {
      return request(app.getHttpServer())
        .get('/api/Order/GetOrderFromApiByPurchaseOrderId/test/test/123')
        .expect(400);
    });

    it('POST /api/Order/DispatchOrder should be available', () => {
      return request(app.getHttpServer())
        .post('/api/Order/DispatchOrder')
        .send({})
        .then(response => {
          expect([400, 401]).toContain(response.status);
        });
    });
  });

  // ==========================================
  // 404 NOT FOUND TESTS
  // ==========================================
  describe('404 Not Found', () => {
    it('GET /non-existent should return 404', () => {
      return request(app.getHttpServer())
        .get('/non-existent')
        .expect(404);
    });

    it('GET /api/NonExistent should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/NonExistent')
        .expect(404);
    });
  });

  // ==========================================
  // CORS AND HEADERS
  // ==========================================
  describe('CORS and Headers', () => {
    it('should handle OPTIONS request', () => {
      return request(app.getHttpServer())
        .options('/api/Auth')
        .expect(204);
    });

    it('should accept JSON content type', () => {
      return request(app.getHttpServer())
        .post('/api/Auth')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' })
        .then(response => {
          expect([400, 401]).toContain(response.status);
        });
    });
  });

  // ==========================================
  // ROUTE CASE SENSITIVITY
  // ==========================================
  describe('Route Case Sensitivity', () => {
    it('/api/Auth should work (original case)', () => {
      return request(app.getHttpServer())
        .delete('/api/Auth/test/test')
        .expect(200);
    });

    // NestJS is not case-insensitive, compatible with C#
    it('/api/auth should return 404 (lowercase)', () => {
      return request(app.getHttpServer())
        .delete('/api/auth/test/test')
        .expect(404);
    });

    it('/api/Order should work (original case)', () => {
      return request(app.getHttpServer())
        .get('/api/Order/test/test/0')
        .expect(400); // User not found
    });

    it('/api/order should return 404 (lowercase)', () => {
      return request(app.getHttpServer())
        .get('/api/order/test/test/0')
        .expect(404);
    });
  });
});
