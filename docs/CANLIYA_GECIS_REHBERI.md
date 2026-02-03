# 🚀 Walmart NestJS Servisi - Canlıya Geçiş Rehberi

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** Ocak 2026  
> **Kritiklik:** ⚠️ YÜKSEK - Bu dökümanı dikkatlice takip edin!

---

## 📋 İçindekiler

1. [Genel Bakış ve Strateji](#1-genel-bakış-ve-strateji)
2. [Aşama 1: Lokal Ortam Testleri](#2-aşama-1-lokal-ortam-testleri)
3. [Aşama 2: Test/Staging Ortamı](#3-aşama-2-teststaging-ortamı)
4. [Aşama 3: Paralel Çalıştırma (Shadow Mode)](#4-aşama-3-paralel-çalıştırma-shadow-mode)
5. [Aşama 4: Response Karşılaştırma](#5-aşama-4-response-karşılaştırma)
6. [Aşama 5: Kademeli Geçiş (Canary Deployment)](#6-aşama-5-kademeli-geçiş-canary-deployment)
7. [Aşama 6: Tam Geçiş](#7-aşama-6-tam-geçiş)
8. [Rollback Planı](#8-rollback-planı)
9. [Monitoring ve Alerting](#9-monitoring-ve-alerting)
10. [Kontrol Listeleri](#10-kontrol-listeleri)
11. [Olası Sorunlar ve Çözümleri](#11-olası-sorunlar-ve-çözümleri)
12. [Zaman Çizelgesi](#12-zaman-çizelgesi)

---

## 1. Genel Bakış ve Strateji

### 1.1 Geçiş Stratejisi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GEÇİŞ STRATEJİSİ                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AŞAMA 1        AŞAMA 2        AŞAMA 3        AŞAMA 4        AŞAMA 5   │
│  ────────       ────────       ────────       ────────       ────────  │
│                                                                         │
│  [LOKAL]   →   [STAGING]  →   [PARALEL]  →   [CANARY]   →   [TAM]     │
│   TEST          TEST          ÇALIŞTIR       %10 TRAFFIC    GEÇİŞ     │
│                                                                         │
│  1-2 Gün       3-5 Gün        7-14 Gün       3-5 Gün        1 Gün     │
│                                                                         │
│  ⚠️ Her aşamada sorun yoksa bir sonrakine geçin!                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Temel Prensipler

```
✅ YAPIN:
- Her aşamayı tamamlamadan bir sonrakine geçmeyin
- Tüm testleri her aşamada tekrarlayın
- Logları sürekli izleyin
- Rollback planını her zaman hazır tutun
- Değişiklikleri dokümante edin

❌ YAPMAYIN:
- Cuma günü production deployment yapmayın
- Tek seferde tam geçiş yapmayın
- Testleri atlamayın
- DB_SYNCHRONIZE=true ile çalıştırmayın
- Backup almadan ilerlemeyin
```

### 1.3 Risk Değerlendirmesi

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| TypeORM davranış farkı | Orta | Yüksek | Paralel test, response karşılaştırma |
| Response format uyumsuzluğu | Düşük | Yüksek | E2E testler, snapshot testler |
| Veritabanı bağlantı sorunu | Düşük | Kritik | Connection pooling, health check |
| Walmart API rate limit | Orta | Orta | Retry logic, exponential backoff |
| Memory leak | Düşük | Orta | Load testing, monitoring |

---

## 2. Aşama 1: Lokal Ortam Testleri

### 2.1 Ortam Hazırlığı

```bash
# 1. Projeyi çıkarın
unzip walmart-nestjs-complete.zip
cd walmart-nestjs

# 2. Bağımlılıkları yükleyin
npm install

# 3. Derleme kontrolü
npm run build

# ⚠️ HATA VARSA DURMAYIN! Önce hataları düzeltin.
```

### 2.2 Lokal Veritabanı Hazırlığı

```bash
# SEÇENEK A: Yeni veritabanı (Test için)
createdb walmart_test_db
psql -d walmart_test_db -f docs/schema.sql

# SEÇENEK B: Production DB'nin kopyası (Önerilen)
pg_dump -h production-host -U user production_db > backup.sql
createdb walmart_test_db
psql -d walmart_test_db < backup.sql
```

### 2.3 .env Dosyası Ayarlama

```bash
# .env dosyası oluşturun
cat > .env << 'EOF'
# ⚠️ LOKAL TEST İÇİN
NODE_ENV=development
PORT=3001

# Veritabanı - TEST DB KULLANIN!
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_user
DB_PASSWORD=your_password
DB_DATABASE=walmart_test_db
DB_SYNCHRONIZE=false  # ⚠️ KRİTİK: false OLMALI!

# Walmart API
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
WALMART_SERVICE_NAME=ByeLabel Walmart Service

# Zamanlanmış görevler kapalı
ENABLE_SCHEDULED_JOBS=false
EOF
```

### 2.4 Testleri Çalıştırma

```bash
# 1. Unit testler
npm test

# Beklenen çıktı:
# Test Suites: X passed, X total
# Tests:       X passed, X total

# 2. E2E testler
npm run test:e2e

# Beklenen çıktı:
# Test Suites: 5 passed, 5 total
# Tests:       ~90 passed, ~90 total

# 3. Coverage raporu
npm run test:cov

# 4. Lint kontrolü
npm run lint
```

### 2.5 Manuel API Testleri

```bash
# 1. Uygulamayı başlatın
npm run start:dev

# 2. Health check
curl -s http://localhost:3001/health-check
# Beklenen: 200 OK

# 3. Swagger UI kontrol
# Tarayıcıda: http://localhost:3001/api

# 4. Postman collection import
# docs/Walmart-Service.postman_collection.json
```

### 2.6 Lokal Test Kontrol Listesi

```
□ npm install başarılı
□ npm run build hatasız
□ npm test - tüm unit testler geçti
□ npm run test:e2e - tüm E2E testler geçti
□ npm run start:dev çalışıyor
□ /health-check 200 dönüyor
□ Swagger UI erişilebilir
□ Postman testleri başarılı
□ Veritabanı bağlantısı çalışıyor
□ Log dosyaları oluşuyor
```

---

## 3. Aşama 2: Test/Staging Ortamı

### 3.1 Staging Ortamı Kurulumu

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGING MİMARİSİ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     ┌──────────────┐     ┌─────────────────┐   │
│   │  Client  │────▶│   STAGING    │────▶│  STAGING DB     │   │
│   │  (Test)  │     │   NestJS     │     │  (Prod Kopya)   │   │
│   └──────────┘     │   Port:3001  │     └─────────────────┘   │
│                    └──────────────┘              │             │
│                           │                      │             │
│                           ▼                      ▼             │
│                    ┌──────────────┐     ┌─────────────────┐   │
│                    │  Walmart     │     │  Production     │   │
│                    │  Sandbox API │     │  DB (Read Only) │   │
│                    └──────────────┘     └─────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Staging Veritabanı Hazırlığı

```bash
# Production veritabanının güncel kopyasını alın
pg_dump -h prod-db-host \
  -U prod_user \
  -d walmart_production \
  --no-owner \
  --no-privileges \
  > production_backup_$(date +%Y%m%d).sql

# Staging DB'ye yükleyin
psql -h staging-db-host \
  -U staging_user \
  -d walmart_staging \
  < production_backup_$(date +%Y%m%d).sql

# Veri sayılarını doğrulayın
psql -h staging-db-host -U staging_user -d walmart_staging << 'EOF'
SELECT 'User' as tablo, COUNT(*) as kayit FROM "User"
UNION ALL
SELECT 'Orders', COUNT(*) FROM "Orders"
UNION ALL
SELECT 'OrderLine', COUNT(*) FROM "OrderLine"
UNION ALL
SELECT 'ShippingInfo', COUNT(*) FROM "ShippingInfo";
EOF
```

### 3.3 Docker ile Staging Deployment

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  walmart-nestjs-staging:
    build: .
    container_name: walmart-nestjs-staging
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - DB_HOST=staging-db-host
      - DB_PORT=5432
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=walmart_staging
      - DB_SYNCHRONIZE=false
      - ENABLE_SCHEDULED_JOBS=false
      - WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health-check"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
# Staging deploy
docker-compose -f docker-compose.staging.yml up -d

# Logları izleyin
docker-compose -f docker-compose.staging.yml logs -f
```

### 3.4 Staging Test Senaryoları

#### Senaryo 1: Hesap İşlemleri

```bash
# Test kullanıcısı oluşturun
curl -X POST http://staging:3001/api/Auth \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "staging-test-account",
    "storeId": "staging-test-store",
    "clientId": "YOUR_WALMART_CLIENT_ID",
    "clientSecret": "YOUR_WALMART_CLIENT_SECRET"
  }'

# Kullanıcıyı silin
curl -X DELETE http://staging:3001/api/Auth/staging-test-account/staging-test-store
```

#### Senaryo 2: Sipariş İşlemleri

```bash
# Mevcut bir kullanıcının siparişlerini çekin
curl http://staging:3001/api/Order/{accountId}/{storeId}/0

# Belirli bir siparişi getirin
curl http://staging:3001/api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}
```

#### Senaryo 3: Kargo İşlemleri (DİKKAT!)

```bash
# ⚠️ UYARI: Gerçek siparişe kargo bildirimi yapacak!
# Sadece test siparişleriyle deneyin!

curl -X POST http://staging:3001/api/Order/DispatchOrder \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-ORDER-ID",
    "userId": "test-account",
    "storeId": "test-store",
    "shippingLines": [{
      "carrierName": "UPS",
      "methodCode": "Standard",
      "trackingNumber": "TEST123456789",
      "shipDateTime": 1704067200000
    }]
  }'
```

### 3.5 Staging Test Kontrol Listesi

```
□ Staging DB production verisiyle senkron
□ Docker container çalışıyor
□ Health check başarılı
□ Mevcut kullanıcılar sorgulanabiliyor
□ Mevcut siparişler getirilebiliyor
□ Test kullanıcı oluşturulup silinebiliyor
□ Walmart API bağlantısı çalışıyor
□ Hata response formatları C# ile aynı
□ Loglar düzgün yazılıyor
□ Memory kullanımı stabil
```

---

## 4. Aşama 3: Paralel Çalıştırma (Shadow Mode)

### 4.1 Paralel Mimari

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PARALEL ÇALIŞTIRMA MİMARİSİ                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         ┌─────────────────┐                            │
│                         │   Load Balancer │                            │
│                         │   (NGINX/ALB)   │                            │
│                         └────────┬────────┘                            │
│                                  │                                      │
│                    ┌─────────────┴─────────────┐                       │
│                    ▼                           ▼                        │
│           ┌─────────────────┐        ┌─────────────────┐              │
│           │   C# Service    │        │  NestJS Service │              │
│           │   Port: 8082    │        │   Port: 3001    │              │
│           │   (PRODUCTION)  │        │   (SHADOW)      │              │
│           └────────┬────────┘        └────────┬────────┘              │
│                    │                          │                        │
│                    └──────────┬───────────────┘                        │
│                               ▼                                        │
│                    ┌─────────────────────┐                            │
│                    │   PostgreSQL        │                            │
│                    │   (AYNI VERİTABANI) │                            │
│                    └─────────────────────┘                            │
│                                                                         │
│   ⚠️ Tüm trafik C#'a gidiyor, NestJS shadow mode'da çalışıyor         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Shadow Mode Script

NestJS'e gelen istekleri C# ile karşılaştıran bir script:

```javascript
// scripts/shadow-compare.js
const axios = require('axios');
const fs = require('fs');

const CSHARP_URL = 'http://localhost:8082';
const NESTJS_URL = 'http://localhost:3001';
const LOG_FILE = 'shadow-comparison.log';

// Test senaryoları
const testCases = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health-check',
  },
  {
    name: 'Get Orders',
    method: 'GET',
    path: '/api/Order/{accountId}/{storeId}/0',
    params: { accountId: 'YOUR_ACCOUNT', storeId: 'YOUR_STORE' }
  },
  {
    name: 'Create Account (expect error)',
    method: 'POST',
    path: '/api/Auth',
    body: { accountId: 'test', storeId: 'test', clientId: '', clientSecret: '' }
  },
  {
    name: 'Delete Non-Existent User',
    method: 'DELETE',
    path: '/api/Auth/nonexistent/nonexistent',
  },
  {
    name: 'Get Orders - User Not Found',
    method: 'GET',
    path: '/api/Order/invalid/invalid/0',
  }
];

async function compareResponses(testCase) {
  const path = testCase.params 
    ? testCase.path.replace('{accountId}', testCase.params.accountId)
                   .replace('{storeId}', testCase.params.storeId)
    : testCase.path;

  const config = {
    method: testCase.method,
    headers: { 'Content-Type': 'application/json' },
    data: testCase.body,
    validateStatus: () => true, // Tüm status kodlarını kabul et
  };

  try {
    const [csharpRes, nestjsRes] = await Promise.all([
      axios({ ...config, url: `${CSHARP_URL}${path}` }),
      axios({ ...config, url: `${NESTJS_URL}${path}` })
    ]);

    const result = {
      testName: testCase.name,
      timestamp: new Date().toISOString(),
      csharp: {
        status: csharpRes.status,
        body: csharpRes.data,
        headers: csharpRes.headers['content-type']
      },
      nestjs: {
        status: nestjsRes.status,
        body: nestjsRes.data,
        headers: nestjsRes.headers['content-type']
      },
      match: {
        status: csharpRes.status === nestjsRes.status,
        body: JSON.stringify(csharpRes.data) === JSON.stringify(nestjsRes.data)
      }
    };

    // Log sonucu
    const logEntry = `
================================================================================
TEST: ${result.testName}
TIME: ${result.timestamp}
--------------------------------------------------------------------------------
C# Response:
  Status: ${result.csharp.status}
  Body: ${JSON.stringify(result.csharp.body, null, 2)}

NestJS Response:
  Status: ${result.nestjs.status}
  Body: ${JSON.stringify(result.nestjs.body, null, 2)}

MATCH: Status=${result.match.status ? '✅' : '❌'}, Body=${result.match.body ? '✅' : '❌'}
================================================================================
`;

    fs.appendFileSync(LOG_FILE, logEntry);
    
    if (!result.match.status || !result.match.body) {
      console.log(`❌ MISMATCH: ${testCase.name}`);
      console.log(logEntry);
    } else {
      console.log(`✅ MATCH: ${testCase.name}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ ERROR: ${testCase.name} - ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('🔄 Starting shadow comparison...\n');
  
  const results = [];
  for (const testCase of testCases) {
    const result = await compareResponses(testCase);
    if (result) results.push(result);
    await new Promise(r => setTimeout(r, 500)); // Rate limiting
  }

  // Özet
  const passed = results.filter(r => r.match.status && r.match.body).length;
  const failed = results.length - passed;
  
  console.log(`\n📊 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`📁 Details logged to: ${LOG_FILE}`);
}

runAllTests();
```

### 4.3 Paralel Çalıştırma Adımları

```bash
# 1. C# servisi çalıştığından emin olun (port 8082)
curl http://localhost:8082/health-check

# 2. NestJS'i shadow mode'da başlatın (port 3001)
PORT=3001 npm run start:prod

# 3. Her iki servisin de çalıştığını doğrulayın
curl http://localhost:8082/health-check  # C#
curl http://localhost:3001/health-check  # NestJS

# 4. Karşılaştırma script'ini çalıştırın
node scripts/shadow-compare.js

# 5. Sonuçları inceleyin
cat shadow-comparison.log
```

### 4.4 Sürekli Karşılaştırma (7-14 Gün)

```bash
# Cron job olarak ayarlayın (her saat)
crontab -e

# Ekleyin:
0 * * * * cd /path/to/project && node scripts/shadow-compare.js >> /var/log/shadow-compare.log 2>&1
```

### 4.5 İzlenmesi Gereken Metrikler

| Metrik | Hedef | Alarm Eşiği |
|--------|-------|-------------|
| Response Match Rate | %100 | <%99 |
| Status Code Match | %100 | <%100 |
| Response Time Diff | <50ms | >200ms |
| Error Rate | %0 | >%1 |
| Memory Usage | <512MB | >1GB |

### 4.6 Paralel Çalıştırma Kontrol Listesi

```
□ C# servisi production'da çalışıyor
□ NestJS shadow mode'da çalışıyor
□ Her iki servis aynı DB'ye bağlı
□ Karşılaştırma script'i çalışıyor
□ En az 7 gün paralel çalıştırıldı
□ Response match rate %100
□ Hiçbir critical hata yok
□ Memory kullanımı stabil
□ Tüm endpoint'ler test edildi
□ Edge case'ler test edildi
```

---

## 5. Aşama 4: Response Karşılaştırma

### 5.1 Detaylı Karşılaştırma Alanları

```javascript
// scripts/detailed-compare.js

const compareFields = {
  // User entity
  user: ['Id', 'UserId', 'StoreId', 'ClientId', 'IsDeleted'],
  
  // Order DTO
  order: [
    'orderId', 'accountId', 'status', 'purchaseOrderId',
    'customerOrderId', 'orderDate', 'shippingInfo', 'orderLines'
  ],
  
  // ShippingInfo
  shippingInfo: [
    'phone', 'estimatedDeliveryDate', 'estimatedShipDate',
    'methodCode', 'postalAddress'
  ],
  
  // OrderLine
  orderLine: [
    'lineNumber', 'item', 'quantity', 'charges', 'statuses'
  ],
  
  // Error responses
  error: ['Message', 'code']
};

function deepCompare(obj1, obj2, path = '') {
  const differences = [];
  
  if (typeof obj1 !== typeof obj2) {
    differences.push({
      path,
      type: 'type_mismatch',
      csharp: typeof obj1,
      nestjs: typeof obj2
    });
    return differences;
  }
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      differences.push({
        path,
        type: 'array_length',
        csharp: obj1.length,
        nestjs: obj2.length
      });
    }
    
    const minLength = Math.min(obj1.length, obj2.length);
    for (let i = 0; i < minLength; i++) {
      differences.push(...deepCompare(obj1[i], obj2[i], `${path}[${i}]`));
    }
  } else if (typeof obj1 === 'object' && obj1 !== null) {
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    for (const key of allKeys) {
      if (!(key in obj1)) {
        differences.push({
          path: `${path}.${key}`,
          type: 'missing_in_csharp',
          nestjs: obj2[key]
        });
      } else if (!(key in obj2)) {
        differences.push({
          path: `${path}.${key}`,
          type: 'missing_in_nestjs',
          csharp: obj1[key]
        });
      } else {
        differences.push(...deepCompare(obj1[key], obj2[key], `${path}.${key}`));
      }
    }
  } else if (obj1 !== obj2) {
    // Timestamp toleransı (1 saniye)
    if (typeof obj1 === 'number' && typeof obj2 === 'number') {
      if (Math.abs(obj1 - obj2) > 1000) {
        differences.push({
          path,
          type: 'value_mismatch',
          csharp: obj1,
          nestjs: obj2
        });
      }
    } else {
      differences.push({
        path,
        type: 'value_mismatch',
        csharp: obj1,
        nestjs: obj2
      });
    }
  }
  
  return differences;
}
```

### 5.2 Kritik Karşılaştırma Noktaları

| Alan | Beklenen | Kontrol |
|------|----------|---------|
| `Message` vs `message` | `Message` (büyük M) | Case sensitivity |
| `code` | `USER_NOT_FOUND` veya `GENERAL` | Exact match |
| HTTP Status | 400 for exceptions | Status code |
| Timestamp format | Unix ms | Number type |
| null vs undefined | C# null → JS null | Null handling |
| Empty array | `[]` | Not undefined |
| Decimal precision | 2 decimal | Price fields |

### 5.3 Response Snapshot Testleri

```javascript
// test/snapshots/responses.snapshot.ts
import * as fs from 'fs';

// C# response snapshot'larını kaydedin
const snapshots = {
  'create_account_success': {
    status: 200,
    body: {
      Id: expect.any(Number),
      UserId: 'test-account',
      StoreId: 'test-store',
      ClientId: 'test-client',
      ClientSecret: expect.any(String),
      IsDeleted: false
    }
  },
  'create_account_error_null_credentials': {
    status: 400,
    body: 'ClientID/ClientSecret cannot be null'
  },
  'user_not_found': {
    status: 400,
    body: {
      Message: 'User Not Found.',
      code: 'USER_NOT_FOUND'
    }
  },
  'order_not_found': {
    status: 400,
    body: {
      Message: 'Order Not Found',
      code: 'GENERAL'
    }
  },
  'carrier_validation_error': {
    status: 400,
    body: {
      Message: 'Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required.',
      code: 'GENERAL'
    }
  }
};

// Her NestJS response'unu snapshot ile karşılaştırın
function validateAgainstSnapshot(testName: string, actualResponse: any): boolean {
  const expected = snapshots[testName];
  if (!expected) {
    console.warn(`No snapshot found for: ${testName}`);
    return false;
  }
  
  // Status kontrolü
  if (actualResponse.status !== expected.status) {
    console.error(`Status mismatch for ${testName}: expected ${expected.status}, got ${actualResponse.status}`);
    return false;
  }
  
  // Body kontrolü
  if (typeof expected.body === 'string') {
    if (actualResponse.body !== expected.body) {
      console.error(`Body mismatch for ${testName}`);
      return false;
    }
  } else {
    // Object comparison
    for (const key of Object.keys(expected.body)) {
      if (expected.body[key]?.asymmetricMatch) {
        // Jest matcher (expect.any, etc.)
        continue;
      }
      if (actualResponse.body[key] !== expected.body[key]) {
        console.error(`Field mismatch for ${testName}.${key}`);
        return false;
      }
    }
  }
  
  return true;
}
```

---

## 6. Aşama 5: Kademeli Geçiş (Canary Deployment)

### 6.1 Canary Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CANARY DEPLOYMENT MİMARİSİ                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         ┌─────────────────┐                            │
│                         │   Load Balancer │                            │
│                         │   (NGINX/ALB)   │                            │
│                         └────────┬────────┘                            │
│                                  │                                      │
│                    ┌─────────────┴─────────────┐                       │
│                    │                           │                        │
│              %90 Traffic                  %10 Traffic                   │
│                    │                           │                        │
│                    ▼                           ▼                        │
│           ┌─────────────────┐        ┌─────────────────┐              │
│           │   C# Service    │        │  NestJS Service │              │
│           │   (STABLE)      │        │   (CANARY)      │              │
│           └────────┬────────┘        └────────┬────────┘              │
│                    │                          │                        │
│                    └──────────┬───────────────┘                        │
│                               ▼                                        │
│                    ┌─────────────────────┐                            │
│                    │     PostgreSQL      │                            │
│                    └─────────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 NGINX Canary Konfigürasyonu

```nginx
# /etc/nginx/conf.d/walmart-service.conf

upstream csharp_backend {
    server csharp-service:8082;
}

upstream nestjs_backend {
    server nestjs-service:3000;
}

# Canary için split_clients kullanımı
split_clients "${remote_addr}" $backend {
    10%     nestjs_backend;  # %10 NestJS'e
    *       csharp_backend;  # %90 C#'a
}

server {
    listen 80;
    server_name walmart-api.yourdomain.com;

    location / {
        proxy_pass http://$backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Backend $backend;  # Hangi backend'e gittiğini logla
        
        # Timeout ayarları
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check endpoint'i her zaman C#'a
    location /health-check {
        proxy_pass http://csharp_backend;
    }
}
```

### 6.3 AWS ALB Canary (Weighted Target Groups)

```bash
# AWS CLI ile weighted routing

# 1. Target group'ları oluşturun
aws elbv2 create-target-group \
  --name walmart-csharp-tg \
  --protocol HTTP \
  --port 8082 \
  --vpc-id vpc-xxx \
  --health-check-path /health-check

aws elbv2 create-target-group \
  --name walmart-nestjs-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /health-check

# 2. Weighted routing kuralı
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:xxx \
  --priority 10 \
  --conditions Field=path-pattern,Values='/*' \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "arn:aws:elasticloadbalancing:xxx:csharp-tg", "Weight": 90},
          {"TargetGroupArn": "arn:aws:elasticloadbalancing:xxx:nestjs-tg", "Weight": 10}
        ]
      }
    }
  ]'
```

### 6.4 Canary Metrikleri İzleme

```bash
# CloudWatch metrics for canary monitoring

# Error rate by backend
aws cloudwatch put-metric-alarm \
  --alarm-name "NestJS-Canary-Error-Rate" \
  --metric-name "5XXError" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=TargetGroup,Value=walmart-nestjs-tg \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:xxx:alerts
```

### 6.5 Canary İlerleme Planı

| Gün | NestJS Traffic | C# Traffic | Koşul |
|-----|----------------|------------|-------|
| 1-2 | %10 | %90 | Error rate < %1 |
| 3-4 | %25 | %75 | Error rate < %1 |
| 5-6 | %50 | %50 | Error rate < %1 |
| 7 | %75 | %25 | Error rate < %1 |
| 8+ | %100 | %0 | Tam geçiş |

### 6.6 Canary Rollback Koşulları

```
⚠️ HEMEN ROLLBACK YAPIN (NestJS %0'a):

1. Error rate > %5
2. Response time > 2x C# ortalaması
3. Database connection errors
4. Memory usage > 1GB
5. Walmart API rate limit aşıldı
6. Kritik müşteri şikayeti
```

---

## 7. Aşama 6: Tam Geçiş

### 7.1 Tam Geçiş Öncesi Son Kontroller

```bash
# 1. Son backup al
pg_dump -h prod-host -U user prod_db > final_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. C# log'larını arşivle
tar -czf csharp_logs_$(date +%Y%m%d).tar.gz /var/log/csharp-service/

# 3. Rollback script'ini hazırla
cat > rollback.sh << 'EOF'
#!/bin/bash
echo "Rolling back to C# service..."
# NGINX/ALB'yi C#'a yönlendir
# Docker container'ları yeniden başlat
# Monitoring'i kontrol et
EOF
chmod +x rollback.sh
```

### 7.2 Geçiş Adımları

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TAM GEÇİŞ ADIMLARI                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  09:00  □ Final backup alındı                                          │
│  09:15  □ Team hazır, iletişim kanalları açık                          │
│  09:30  □ Monitoring dashboard'ları açık                               │
│  09:45  □ NestJS %100'e çekildi                                        │
│  10:00  □ İlk 15 dakika critical monitoring                            │
│  10:15  □ Tüm endpoint'ler test edildi                                 │
│  10:30  □ Müşteri şikayeti kontrolü                                    │
│  11:00  □ 1 saat sorunsuz - C# durdurulabilir                          │
│  12:00  □ 2 saat sorunsuz - Başarılı geçiş!                            │
│                                                                         │
│  ⚠️ Herhangi bir sorun → Anında rollback.sh çalıştır!                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 NGINX Tam Geçiş Konfigürasyonu

```nginx
# Tam geçiş - Tüm trafik NestJS'e
upstream nestjs_backend {
    server nestjs-service:3000;
}

server {
    listen 80;
    server_name walmart-api.yourdomain.com;

    location / {
        proxy_pass http://nestjs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 7.4 C# Servisi Durdurma

```bash
# C# servisi hemen durdurmayın!
# En az 2 saat sorunsuz çalışma sonrası:

# 1. C# servisini durdur (ama silme)
docker stop csharp-walmart-service

# 2. 24 saat daha bekle

# 3. 24 saat sonra sorun yoksa
docker rm csharp-walmart-service

# 4. 1 hafta sonra container image'ı sil
# (Emergency rollback için bir süre tut)
```

---

## 8. Rollback Planı

### 8.1 Rollback Tetikleyicileri

| Seviye | Koşul | Aksiyon |
|--------|-------|---------|
| 🟡 WARNING | Error rate > %2 | Monitoring'i artır |
| 🟠 ALERT | Error rate > %5 | Canary'yi azalt |
| 🔴 CRITICAL | Error rate > %10 | Hemen rollback |
| 💀 EMERGENCY | Database corruption | Hemen rollback + backup restore |

### 8.2 Rollback Script

```bash
#!/bin/bash
# rollback.sh

set -e

echo "⚠️ ROLLBACK BAŞLIYOR..."
echo "Zaman: $(date)"

# 1. Trafiği C#'a yönlendir
echo "1. Trafiği C#'a yönlendiriyorum..."
if [ -f /etc/nginx/conf.d/walmart-service.conf ]; then
    # NGINX rollback
    cp /etc/nginx/conf.d/walmart-service.conf.backup \
       /etc/nginx/conf.d/walmart-service.conf
    nginx -s reload
else
    # AWS ALB rollback
    aws elbv2 modify-rule \
      --rule-arn "$ALB_RULE_ARN" \
      --actions '[{"Type":"forward","TargetGroupArn":"'"$CSHARP_TG_ARN"'"}]'
fi

# 2. C# servisinin çalıştığını doğrula
echo "2. C# servisini kontrol ediyorum..."
for i in {1..10}; do
    if curl -s http://localhost:8082/health-check > /dev/null; then
        echo "   C# servisi çalışıyor ✓"
        break
    fi
    echo "   Deneme $i/10..."
    sleep 2
done

# 3. NestJS'i durdur (opsiyonel)
echo "3. NestJS servisini durduruyor..."
docker stop walmart-nestjs-production || true

# 4. Bildirim gönder
echo "4. Bildirim gönderiyorum..."
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d '{"text":"⚠️ ROLLBACK TAMAMLANDI - Walmart servisi C#'\''a geri döndü"}'

echo "✅ ROLLBACK TAMAMLANDI"
echo "Zaman: $(date)"
```

### 8.3 Veritabanı Rollback (Gerekirse)

```bash
#!/bin/bash
# db-rollback.sh

# ⚠️ SADECE VERİTABANI BOZULDUYSA KULLANIN!

echo "⚠️ VERİTABANI ROLLBACK BAŞLIYOR..."

# 1. Aktif bağlantıları kes
psql -h $DB_HOST -U $DB_USER -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'walmart_production' AND pid <> pg_backend_pid();
"

# 2. Mevcut DB'yi yeniden adlandır
psql -h $DB_HOST -U $DB_USER -c "
ALTER DATABASE walmart_production RENAME TO walmart_production_corrupted_$(date +%Y%m%d_%H%M%S);
"

# 3. Backup'tan restore et
createdb -h $DB_HOST -U $DB_USER walmart_production
psql -h $DB_HOST -U $DB_USER -d walmart_production < $BACKUP_FILE

echo "✅ VERİTABANI ROLLBACK TAMAMLANDI"
```

---

## 9. Monitoring ve Alerting

### 9.1 Monitoring Dashboard

```yaml
# Grafana dashboard için metrikler
panels:
  - title: "Request Rate"
    query: "rate(http_requests_total[5m])"
    
  - title: "Error Rate"
    query: "rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m])"
    threshold: 0.01
    
  - title: "Response Time (p95)"
    query: "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
    threshold: 1.0
    
  - title: "Database Connections"
    query: "pg_stat_activity_count{datname='walmart_production'}"
    threshold: 100
    
  - title: "Memory Usage"
    query: "process_resident_memory_bytes"
    threshold: 1073741824  # 1GB
```

### 9.2 Alert Kuralları

```yaml
# Prometheus alerting rules
groups:
  - name: walmart-nestjs-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times detected"
          
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1073741824
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage above 1GB"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count{datname="walmart_production"} > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connections above 80%"
```

### 9.3 Log İzleme

```bash
# Logları izlemek için komutlar

# Docker logs
docker logs -f walmart-nestjs-production --tail 100

# Belirli hataları filtreleme
docker logs walmart-nestjs-production 2>&1 | grep -E "ERROR|WARN|Exception"

# CloudWatch Logs (AWS)
aws logs tail /ecs/walmart-nestjs --follow --filter-pattern "ERROR"
```

### 9.4 Health Check Endpoint'leri

```typescript
// Detaylı health check endpoint'i ekleyin
// src/health/health.controller.ts

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
  
  @Get('ready')
  async readiness() {
    // DB bağlantısı kontrolü
    const dbOk = await this.checkDatabase();
    // Walmart API kontrolü
    const walmartOk = await this.checkWalmartApi();
    
    if (dbOk && walmartOk) {
      return { status: 'ready', db: 'ok', walmart: 'ok' };
    }
    
    throw new ServiceUnavailableException({
      status: 'not ready',
      db: dbOk ? 'ok' : 'failed',
      walmart: walmartOk ? 'ok' : 'failed'
    });
  }
  
  @Get('live')
  async liveness() {
    return { status: 'alive', uptime: process.uptime() };
  }
}
```

---

## 10. Kontrol Listeleri

### 10.1 Lokal Test Kontrol Listesi

```
LOKAL TEST KONTROL LİSTESİ
==========================
□ npm install başarılı
□ npm run build hatasız tamamlandı
□ Tüm unit testler geçti (npm test)
□ Tüm E2E testler geçti (npm run test:e2e)
□ /health-check 200 dönüyor
□ Swagger UI erişilebilir (/api)
□ Veritabanı bağlantısı çalışıyor
□ Postman testleri başarılı
□ Log dosyaları oluşuyor
□ Hata response formatları C# ile aynı

İmza: _________________ Tarih: _________
```

### 10.2 Staging Test Kontrol Listesi

```
STAGING TEST KONTROL LİSTESİ
============================
□ Staging DB production verisiyle senkron
□ Docker container başarıyla çalışıyor
□ Health check başarılı
□ Mevcut kullanıcılar sorgulanabiliyor
□ Siparişler doğru getiriliyor
□ Test hesap oluşturulup silinebiliyor
□ Walmart API bağlantısı çalışıyor
□ Response formatları snapshot'larla eşleşiyor
□ Memory kullanımı normal (<512MB)
□ Log'larda kritik hata yok
□ En az 3 gün sorunsuz çalıştı

İmza: _________________ Tarih: _________
```

### 10.3 Paralel Çalıştırma Kontrol Listesi

```
PARALEL ÇALIŞTIRMA KONTROL LİSTESİ
===================================
□ C# ve NestJS aynı anda çalışıyor
□ Her iki servis aynı veritabanına bağlı
□ Response karşılaştırma script'i aktif
□ Response match rate %100
□ Status code match rate %100
□ Response time farkı <50ms
□ Error rate %0
□ En az 7 gün paralel çalıştırıldı
□ Tüm endpoint'ler test edildi
□ Edge case'ler test edildi
□ Walmart API rate limit aşılmadı

İmza: _________________ Tarih: _________
```

### 10.4 Canary Deployment Kontrol Listesi

```
CANARY DEPLOYMENT KONTROL LİSTESİ
==================================
□ %10 trafik NestJS'e yönlendirildi
□ Error rate <%1
□ Response time normal
□ 2 gün sorunsuz çalıştı
□ %25 trafiğe çıkıldı
□ 2 gün daha sorunsuz
□ %50 trafiğe çıkıldı
□ Müşteri şikayeti yok
□ %75 trafiğe çıkıldı
□ Tüm metrikler normal
□ Rollback planı hazır ve test edildi

İmza: _________________ Tarih: _________
```

### 10.5 Tam Geçiş Kontrol Listesi

```
TAM GEÇİŞ KONTROL LİSTESİ
==========================
□ Final backup alındı
□ Rollback script hazır ve test edildi
□ Team hazır ve iletişim kanalları açık
□ Monitoring dashboard'ları açık
□ Geçiş saati uygun (Pazartesi-Perşembe, sabah)
□ NestJS %100'e çekildi
□ İlk 15 dakika kritik monitoring yapıldı
□ Tüm endpoint'ler test edildi
□ Müşteri şikayeti yok
□ 1 saat sorunsuz - C# durdurulabilir
□ 2 saat sorunsuz - Başarılı geçiş!
□ Dokümantasyon güncellendi
□ Team bilgilendirildi

İmza: _________________ Tarih: _________
```

---

## 11. Olası Sorunlar ve Çözümleri

### 11.1 Yaygın Sorunlar

#### Sorun 1: TypeORM Eager Loading Farkı

```
SORUN: Orders sorgusu ilişkili tabloları getirmiyor
NEDEN: TypeORM ve EF eager loading davranışı farklı

ÇÖZÜM:
1. Entity'de eager: true ekleyin
2. veya QueryBuilder'da leftJoinAndSelect kullanın

// Örnek:
@ManyToOne(() => ShippingInfo, { eager: true })
shippingInfo: ShippingInfo;
```

#### Sorun 2: Timestamp Formatı Uyumsuzluğu

```
SORUN: Tarih alanları farklı format dönüyor
NEDEN: C# DateTime vs JavaScript Date

ÇÖZÜM:
1. Tüm tarihleri Unix timestamp (ms) olarak saklayın
2. Response'da number olarak dönün

// Örnek:
orderDate: number; // 1704067200000
```

#### Sorun 3: NULL vs Undefined

```
SORUN: C# null dönüyor, NestJS undefined dönüyor
NEDEN: JavaScript undefined C# null'dan farklı serialize ediliyor

ÇÖZÜM:
JSON.stringify replacer kullanın:

JSON.stringify(obj, (key, value) => 
  value === undefined ? null : value
);
```

#### Sorun 4: Connection Pool Tükenmesi

```
SORUN: "too many connections" hatası
NEDEN: Connection pool yetersiz veya leak var

ÇÖZÜM:
1. TypeORM pool ayarlarını yapılandırın:

TypeOrmModule.forRoot({
  extra: {
    max: 20,           // Max connections
    idleTimeoutMillis: 30000,
  }
})

2. Query'lerde release'i kontrol edin
```

#### Sorun 5: Memory Leak

```
SORUN: Memory kullanımı sürekli artıyor
NEDEN: Event listener leak veya cache problemi

ÇÖZÜM:
1. Node.js heap dump alın:
   node --inspect app.js
   
2. Memory profiling yapın

3. Scheduled job'larda cleanup ekleyin
```

### 11.2 Acil Durum Senaryoları

#### Senaryo: Walmart API Rate Limit

```bash
# Belirtiler:
# - 429 Too Many Requests hataları
# - Sipariş senkronizasyonu başarısız

# Çözüm:
1. Zamanlanmış görevleri durdurun
   ENABLE_SCHEDULED_JOBS=false

2. Rate limiting ekleyin
   - İstekler arası 1 saniye bekleyin
   - Batch size'ı azaltın

3. Exponential backoff uygulayın
```

#### Senaryo: Veritabanı Bağlantı Hatası

```bash
# Belirtiler:
# - Connection refused hataları
# - Timeout hataları

# Çözüm:
1. DB sunucusunu kontrol edin
   pg_isready -h $DB_HOST

2. Connection pool'u resetleyin
   docker restart walmart-nestjs

3. Gerekirse RDS failover başlatın
```

#### Senaryo: Yanlış Veri Yazıldı

```bash
# Belirtiler:
# - Müşteri şikayeti
# - Veri tutarsızlığı

# Çözüm:
1. HEMEN servisi durdurun
   docker stop walmart-nestjs

2. C#'a rollback yapın
   ./rollback.sh

3. Veriyi backup'tan restore edin
   ./db-rollback.sh

4. Root cause analizi yapın
```

---

## 12. Zaman Çizelgesi

### 12.1 Önerilen Geçiş Takvimi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GEÇİŞ TAKVİMİ (Minimum 4 Hafta)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  HAFTA 1: LOKAL TEST                                                   │
│  ─────────────────                                                     │
│  Pazartesi   : Proje kurulumu, npm install                            │
│  Salı        : Unit testler, E2E testler                               │
│  Çarşamba    : Manuel API testleri                                     │
│  Perşembe    : Bug fix, test tekrarı                                   │
│  Cuma        : Lokal test sign-off ✓                                   │
│                                                                         │
│  HAFTA 2: STAGING                                                      │
│  ───────────────                                                       │
│  Pazartesi   : Staging ortam kurulumu                                  │
│  Salı        : Staging deployment                                       │
│  Çarşamba    : Staging testleri                                        │
│  Perşembe    : Integration testleri                                    │
│  Cuma        : Staging sign-off ✓                                      │
│                                                                         │
│  HAFTA 2-3: PARALEL ÇALIŞTIRMA (7-14 Gün)                             │
│  ──────────────────────────────────────                                │
│  - C# ve NestJS birlikte çalışıyor                                     │
│  - Response karşılaştırma aktif                                        │
│  - 7 gün minimum izleme                                                │
│  - Paralel test sign-off ✓                                             │
│                                                                         │
│  HAFTA 4: CANARY + TAM GEÇİŞ                                          │
│  ────────────────────────────                                          │
│  Pazartesi   : %10 canary başlat                                       │
│  Salı        : %25'e çık                                               │
│  Çarşamba    : %50'ye çık                                              │
│  Perşembe    : %75'e çık                                               │
│  Cuma        : ⚠️ GEÇİŞ YAPMAYIN - Hafta sonu riski                   │
│  Pazartesi   : Tam geçiş (%100)                                        │
│  Salı        : C# servisi durdur                                       │
│  Çarşamba    : Post-migration monitoring                               │
│  Perşembe    : Dokümantasyon güncelleme                                │
│  Cuma        : Proje tamamlandı ✓                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Geçiş Yapılmaması Gereken Zamanlar

```
⛔ GEÇİŞ YAPMAYIN:

- Cuma günleri (Hafta sonu destek riski)
- Tatil öncesi (Yılbaşı, bayramlar)
- Black Friday / Cyber Monday dönemi
- Walmart peak season (Kasım-Aralık)
- Major Walmart API güncellemesi sonrası
- Team üyelerinin izin dönemlerinde
```

---

## 📞 Acil Durum İletişimi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ACİL DURUM İLETİŞİMİ                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Slack kanalı: #walmart-migration-alerts                            │
│  2. On-call mühendis: +90 XXX XXX XX XX                                │
│  3. Yedek iletişim: +90 XXX XXX XX XX                                  │
│  4. Yönetici: +90 XXX XXX XX XX                                        │
│                                                                         │
│  ⚠️ ROLLBACK GEREKİRSE:                                                │
│  1. Slack'e mesaj atın                                                 │
│  2. On-call'ı arayın                                                   │
│  3. rollback.sh'ı çalıştırın                                           │
│  4. Post-mortem toplantısı planlayın                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**Döküman Versiyonu:** 1.0.0  
**Son Güncelleme:** Ocak 2026  
**Hazırlayan:** Claude AI  
**Onaylayan:** ________________
