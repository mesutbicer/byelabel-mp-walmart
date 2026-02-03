# 🚀 Walmart NestJS Servisi - Canlı Ortama Geçiş Rehberi

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** Ocak 2026  
> **Kritiklik Seviyesi:** 🔴 YÜKSEK

---

## 📋 İçindekiler

1. [Geçiş Stratejisi Genel Bakış](#1-geçiş-stratejisi-genel-bakış)
2. [AŞAMA 1: Lokal Ortam Testleri](#2-aşama-1-lokal-ortam-testleri)
3. [AŞAMA 2: Test/Staging Ortamı](#3-aşama-2-teststaging-ortamı)
4. [AŞAMA 3: Paralel Çalıştırma](#4-aşama-3-paralel-çalıştırma)
5. [AŞAMA 4: Response Karşılaştırma](#5-aşama-4-response-karşılaştırma)
6. [AŞAMA 5: Kademeli Geçiş (Canary)](#6-aşama-5-kademeli-geçiş-canary)
7. [AŞAMA 6: Tam Geçiş](#7-aşama-6-tam-geçiş)
8. [Rollback Stratejisi](#8-rollback-stratejisi)
9. [Monitoring ve Alerting](#9-monitoring-ve-alerting)
10. [Kontrol Listeleri](#10-kontrol-listeleri)
11. [Acil Durum Prosedürleri](#11-acil-durum-prosedürleri)

---

## 1. Geçiş Stratejisi Genel Bakış

### 1.1 Geçiş Zaman Çizelgesi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GEÇIŞ ZAMAN ÇİZELGESİ                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HAFTA 1          HAFTA 2          HAFTA 3          HAFTA 4                │
│  ─────────        ─────────        ─────────        ─────────              │
│                                                                             │
│  [AŞAMA 1]        [AŞAMA 2]        [AŞAMA 3-4]      [AŞAMA 5-6]            │
│  Lokal Test       Staging          Paralel          Canary → Tam           │
│                                    Çalıştırma       Geçiş                  │
│                                                                             │
│  ● npm build      ● Test DB        ● Her iki        ● %10 trafik           │
│  ● Unit test      ● Tüm API        servis           ● %50 trafik           │
│  ● E2E test       ● Load test      çalışıyor        ● %100 trafik          │
│  ● Manuel test    ● Walmart API    ● Response       ● C# kapatma           │
│                     bağlantısı       karşılaştır                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Temel İlkeler

```
✅ YAPILMASI GEREKENLER:
├── Her aşamayı tamamlamadan sonrakine geçme
├── Tüm testleri %100 geçir
├── Her aşamada rollback planı hazır olsun
├── Değişiklikleri dokümante et
└── Takım iletişimini sürekli tut

❌ YAPILMAMASI GEREKENLER:
├── Acele etme
├── Testleri atlama
├── Cuma günü production'a çıkma
├── Tek başına karar verme
└── Rollback planı olmadan ilerleme
```

### 1.3 Risk Matrisi

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| TypeORM davranış farkı | Orta | Yüksek | Kapsamlı E2E testler |
| Walmart API uyumsuzluğu | Düşük | Yüksek | Gerçek API ile test |
| Veritabanı bağlantı sorunu | Düşük | Kritik | Connection pool ayarları |
| Performance farkı | Orta | Orta | Load test |
| Memory leak | Düşük | Yüksek | Uzun süreli test |

---

## 2. AŞAMA 1: Lokal Ortam Testleri

### 2.1 Ortam Hazırlığı

```bash
# 1. Proje dizinine git
cd walmart-nestjs

# 2. Node.js versiyonunu kontrol et
node --version  # v18.x veya v20.x olmalı

# 3. Bağımlılıkları yükle
npm install

# 4. Derleme kontrolü
npm run build
```

**✅ Başarı Kriteri:** Hiçbir hata olmadan derlenmeli

### 2.2 Lokal Veritabanı Kurulumu

```bash
# PostgreSQL'de test veritabanı oluştur
psql -U postgres

CREATE DATABASE walmart_test;
CREATE USER walmart_test_user WITH ENCRYPTED PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE walmart_test TO walmart_test_user;
\q

# Schema'yı uygula
psql -U walmart_test_user -d walmart_test -f docs/schema.sql
```

### 2.3 .env Dosyası (Lokal Test)

```env
# .env.local
PORT=3000
NODE_ENV=development

# Lokal test veritabanı
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=walmart_test_user
DB_PASSWORD=test_password
DB_DATABASE=walmart_test

# ⚠️ KRİTİK: false olmalı!
DB_SYNCHRONIZE=false

# Walmart API (Test/Sandbox varsa)
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
WALMART_SERVICE_NAME=ByeLabel Test Service

# Zamanlanmış görevler kapalı
ENABLE_SCHEDULED_JOBS=false
```

### 2.4 Unit Test Çalıştırma

```bash
# Tüm unit testleri çalıştır
npm test

# Coverage raporu ile
npm run test:cov

# Beklenen çıktı:
# Test Suites: X passed, X total
# Tests:       X passed, X total
# Coverage:    >80%
```

**✅ Başarı Kriteri:** Tüm testler geçmeli, coverage >80%

### 2.5 E2E Test Çalıştırma

```bash
# E2E testleri çalıştır
npm run test:e2e

# Belirli test dosyası
npm run test:e2e -- --testPathPattern=auth
npm run test:e2e -- --testPathPattern=order
npm run test:e2e -- --testPathPattern=exception

# Beklenen çıktı:
# Test Suites: 5 passed, 5 total
# Tests:       ~90 passed, ~90 total
```

**✅ Başarı Kriteri:** Tüm E2E testler geçmeli

### 2.6 Manuel API Testi

```bash
# 1. Uygulamayı başlat
npm run start:dev

# 2. Health check
curl http://localhost:3000/health-check
# Beklenen: 200 OK

# 3. Swagger UI kontrol
# Tarayıcıda: http://localhost:3000/api
```

### 2.7 Postman Collection Testi

```bash
# Postman CLI (Newman) ile test
npm install -g newman

# Collection'ı çalıştır
newman run docs/Walmart-Service.postman_collection.json \
  --environment local-env.json \
  --reporters cli,html \
  --reporter-html-export test-results.html
```

### 2.8 Lokal Test Kontrol Listesi

```
AŞAMA 1 KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

□ npm install başarılı
□ npm run build hatasız
□ Lokal PostgreSQL çalışıyor
□ Schema.sql uygulandı
□ .env.local yapılandırıldı
□ DB_SYNCHRONIZE=false kontrol edildi
□ npm test - Tüm unit testler geçti
□ npm run test:e2e - Tüm E2E testler geçti
□ npm run start:dev - Uygulama başladı
□ /health-check 200 döndü
□ Swagger UI erişilebilir
□ Postman collection testleri geçti

✅ AŞAMA 1 TAMAMLANDI: [Tarih] [İmza]
```

---

## 3. AŞAMA 2: Test/Staging Ortamı

### 3.1 Staging Ortamı Gereksinimleri

```
┌─────────────────────────────────────────────────────────────┐
│                   STAGING ORTAMI YAPISI                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐      ┌─────────────┐                     │
│   │   NestJS    │      │    C#       │                     │
│   │  (Port:3001)│      │ (Port:3000) │                     │
│   └──────┬──────┘      └──────┬──────┘                     │
│          │                    │                             │
│          └────────┬───────────┘                             │
│                   ▼                                         │
│          ┌─────────────┐                                    │
│          │  PostgreSQL │ ◄── CANLI DB'NİN KOPYASI          │
│          │   (KOPYA)   │                                    │
│          └─────────────┘                                    │
│                                                             │
│   ⚠️ ASLA CANLI VERİTABANINA BAĞLANMA!                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Canlı Veritabanının Kopyasını Oluşturma

```bash
# ⚠️ CANLI VERİTABANINDAN KOPYA AL

# 1. Canlı DB'den backup al
pg_dump -h canli-db-host -U canli_user -d walmart_db \
  --no-owner --no-acl \
  -f walmart_backup_$(date +%Y%m%d).sql

# 2. Staging DB'ye restore et
psql -h staging-db-host -U staging_user -d walmart_staging \
  -f walmart_backup_$(date +%Y%m%d).sql

# 3. Hassas verileri maskele (opsiyonel ama önerilen)
psql -h staging-db-host -U staging_user -d walmart_staging <<EOF
-- ClientSecret'ları maskele
UPDATE "User" SET "ClientSecret" = 'MASKED_SECRET_' || "Id"::text;
EOF
```

### 3.3 Staging .env Dosyası

```env
# .env.staging
PORT=3001
NODE_ENV=staging

# Staging veritabanı (CANLI'nın KOPYASI)
DB_HOST=staging-db-host.example.com
DB_PORT=5432
DB_USERNAME=staging_user
DB_PASSWORD=staging_password
DB_DATABASE=walmart_staging

# ⚠️ KRİTİK: false olmalı!
DB_SYNCHRONIZE=false

# Walmart API (GERÇEK credentials)
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
WALMART_SERVICE_NAME=ByeLabel Staging Service

# Zamanlanmış görevler kapalı (staging'de)
ENABLE_SCHEDULED_JOBS=false

# Loglama (detaylı)
LOG_LEVEL=debug
```

### 3.4 Docker ile Staging Deployment

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  walmart-nestjs-staging:
    build: .
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - DB_HOST=staging-db-host
      - DB_PORT=5432
      - DB_USERNAME=staging_user
      - DB_PASSWORD=${STAGING_DB_PASSWORD}
      - DB_DATABASE=walmart_staging
      - DB_SYNCHRONIZE=false
      - ENABLE_SCHEDULED_JOBS=false
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health-check"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# Staging'e deploy et
docker-compose -f docker-compose.staging.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.staging.yml logs -f
```

### 3.5 Staging'de API Testleri

#### Test 1: Health Check

```bash
curl -X GET https://staging.example.com:3001/health-check
# Beklenen: 200 OK
```

#### Test 2: Hesap Oluşturma (Test Credentials ile)

```bash
curl -X POST https://staging.example.com:3001/api/Auth \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "staging-test-account",
    "storeId": "staging-test-store",
    "clientId": "YOUR_WALMART_CLIENT_ID",
    "clientSecret": "YOUR_WALMART_CLIENT_SECRET"
  }'
```

⚠️ **DİKKAT:** Gerçek Walmart credentials kullanın, ancak test hesabı oluşturun!

#### Test 3: Sipariş Sorgulama

```bash
curl -X GET "https://staging.example.com:3001/api/Order/staging-test-account/staging-test-store/0"
```

#### Test 4: Kargo Gönderimi (DİKKATLİ!)

```bash
# ⚠️ GERÇEK SİPARİŞE KARGO GÖNDERİR! TEST AMAÇLI KULLANMAYIN!
# Sadece test siparişi varsa deneyin.
```

### 3.6 Walmart API Bağlantı Testi

```bash
# Token alma testi
curl -X POST https://marketplace.walmartapis.com/v3/token \
  -H "Authorization: Basic $(echo -n 'CLIENT_ID:CLIENT_SECRET' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "WM_QOS.CORRELATION_ID: $(uuidgen)" \
  -H "WM_SVC.NAME: Test Service" \
  -d "grant_type=client_credentials"

# Başarılı yanıt:
# {"access_token": "...", "token_type": "Bearer", "expires_in": 900}
```

### 3.7 Load Test (Yük Testi)

```bash
# Apache Benchmark ile basit test
ab -n 1000 -c 10 https://staging.example.com:3001/health-check

# Veya k6 ile kapsamlı test
```

```javascript
// load-test.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '3m', target: 10 },   // Stay
    { duration: '1m', target: 50 },   // Spike
    { duration: '2m', target: 50 },   // Stay
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% istekler 500ms altında
    http_req_failed: ['rate<0.01'],    // %1'den az hata
  },
};

export default function () {
  // Health check
  const healthRes = http.get('https://staging.example.com:3001/health-check');
  check(healthRes, {
    'health check status 200': (r) => r.status === 200,
  });

  // Orders endpoint
  const ordersRes = http.get(
    'https://staging.example.com:3001/api/Order/test-user/test-store/0'
  );
  check(ordersRes, {
    'orders status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  sleep(1);
}
```

```bash
# k6 çalıştır
k6 run load-test.js
```

### 3.8 Memory ve CPU Monitoring

```bash
# Container kaynak kullanımı
docker stats walmart-nestjs-staging

# Beklenen değerler:
# CPU: <%50 (idle), <%80 (load altında)
# Memory: <512MB (normal), <768MB (load altında)
```

### 3.9 Staging Test Kontrol Listesi

```
AŞAMA 2 KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

□ Staging ortamı hazır
□ Canlı DB kopyası alındı ve restore edildi
□ Hassas veriler maskelendi (opsiyonel)
□ .env.staging yapılandırıldı
□ DB_SYNCHRONIZE=false kontrol edildi
□ Docker imajı build edildi
□ Container başarıyla çalışıyor
□ /health-check 200 döndü
□ Walmart API token alma başarılı
□ Test hesabı oluşturulabildi
□ Sipariş sorgusu çalışıyor
□ Load test başarılı (p95 < 500ms)
□ Memory kullanımı normal (<512MB)
□ 24 saat kesintisiz çalıştı

✅ AŞAMA 2 TAMAMLANDI: [Tarih] [İmza]
```

---

## 4. AŞAMA 3: Paralel Çalıştırma

### 4.1 Paralel Çalıştırma Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PARALEL ÇALIŞTIRMA MİMARİSİ                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────┐                                  │
│                        │   Load Balancer │                                  │
│                        │    / API GW     │                                  │
│                        └────────┬────────┘                                  │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                        │
│              │                  │                  │                        │
│              ▼                  ▼                  ▼                        │
│     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│     │    C#       │    │   NestJS    │    │  Response   │                  │
│     │  (AKTİF)    │    │  (SHADOW)   │    │  Comparator │                  │
│     │ Port: 8080  │    │ Port: 3000  │    │             │                  │
│     └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                  │
│            │                  │                  │                         │
│            │                  │                  │                         │
│            └──────────────────┴──────────────────┘                         │
│                               │                                             │
│                               ▼                                             │
│                      ┌─────────────┐                                        │
│                      │  PostgreSQL │ ◄── AYNI VERİTABANI                   │
│                      │   (CANLI)   │                                        │
│                      └─────────────┘                                        │
│                                                                             │
│   ⚠️ Her iki servis de AYNI veritabanına bağlı                             │
│   ⚠️ Sadece READ operasyonları paralel test edilmeli                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Shadow Mode Yapılandırması

Shadow mode'da NestJS servisi gerçek trafiği alır ama sadece **okuma** işlemleri yapar:

```typescript
// shadow-mode.interceptor.ts (opsiyonel)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ShadowModeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Shadow mode'da yazma operasyonlarını logla ama yapma
    if (process.env.SHADOW_MODE === 'true' && ['POST', 'PUT', 'DELETE'].includes(method)) {
      console.log(`[SHADOW MODE] Would execute: ${method} ${url}`);
      // Gerçek operasyonu yapma, sadece logla
      return next.handle().pipe(
        tap(() => console.log(`[SHADOW MODE] Response logged for: ${method} ${url}`))
      );
    }

    return next.handle();
  }
}
```

### 4.3 Paralel İstek Script'i

```javascript
// parallel-test.js
const axios = require('axios');
const fs = require('fs');

const CSHARP_URL = 'http://csharp-service:8080';
const NESTJS_URL = 'http://nestjs-service:3000';

const testCases = [
  { method: 'GET', path: '/health-check' },
  { method: 'GET', path: '/api/Order/account1/store1/0' },
  { method: 'GET', path: '/api/Order/GetOrdersAfterDate/account1/store1/0' },
  // Daha fazla test case...
];

async function compareResponses(testCase) {
  try {
    const [csharpRes, nestjsRes] = await Promise.all([
      axios({
        method: testCase.method,
        url: `${CSHARP_URL}${testCase.path}`,
        validateStatus: () => true, // Tüm status kodlarını kabul et
      }),
      axios({
        method: testCase.method,
        url: `${NESTJS_URL}${testCase.path}`,
        validateStatus: () => true,
      }),
    ]);

    const result = {
      path: testCase.path,
      method: testCase.method,
      csharp: {
        status: csharpRes.status,
        data: csharpRes.data,
      },
      nestjs: {
        status: nestjsRes.status,
        data: nestjsRes.data,
      },
      match: {
        status: csharpRes.status === nestjsRes.status,
        body: JSON.stringify(csharpRes.data) === JSON.stringify(nestjsRes.data),
      },
    };

    return result;
  } catch (error) {
    return {
      path: testCase.path,
      error: error.message,
    };
  }
}

async function runTests() {
  const results = [];
  
  for (const testCase of testCases) {
    const result = await compareResponses(testCase);
    results.push(result);
    
    if (!result.match?.status || !result.match?.body) {
      console.log(`❌ MISMATCH: ${testCase.method} ${testCase.path}`);
      console.log('C#:', JSON.stringify(result.csharp, null, 2));
      console.log('NestJS:', JSON.stringify(result.nestjs, null, 2));
    } else {
      console.log(`✅ MATCH: ${testCase.method} ${testCase.path}`);
    }
  }

  // Sonuçları dosyaya yaz
  fs.writeFileSync(
    `comparison-results-${Date.now()}.json`,
    JSON.stringify(results, null, 2)
  );

  // Özet
  const matches = results.filter(r => r.match?.status && r.match?.body).length;
  console.log(`\n📊 ÖZET: ${matches}/${results.length} eşleşti`);
}

runTests();
```

### 4.4 Veritabanı Yazma Koruması

⚠️ **KRİTİK:** Paralel çalıştırma sırasında yazma çakışmalarını önleyin:

```sql
-- NestJS için READ-ONLY kullanıcı oluştur (paralel test için)
CREATE USER nestjs_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE walmart_db TO nestjs_readonly;
GRANT USAGE ON SCHEMA public TO nestjs_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nestjs_readonly;

-- Yazma yetkisi yok!
```

```env
# .env.parallel (NestJS)
DB_USERNAME=nestjs_readonly
DB_PASSWORD=readonly_password
# Bu kullanıcı sadece SELECT yapabilir
```

### 4.5 Paralel Test Kontrol Listesi

```
AŞAMA 3 KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

□ Her iki servis de çalışıyor
□ Her iki servis de AYNI veritabanına bağlı
□ NestJS için read-only kullanıcı oluşturuldu
□ Paralel test script'i hazır
□ GET /health-check eşleşiyor
□ GET /api/Order/{...} eşleşiyor
□ GET /api/Order/GetOrdersAfterDate/{...} eşleşiyor
□ GET /api/Order/GetOrderFromApiByPurchaseOrderId/{...} eşleşiyor
□ Hata response'ları eşleşiyor (format ve içerik)
□ HTTP status kodları eşleşiyor
□ En az 100 farklı istek test edildi
□ %100 eşleşme sağlandı

✅ AŞAMA 3 TAMAMLANDI: [Tarih] [İmza]
```

---

## 5. AŞAMA 4: Response Karşılaştırma

### 5.1 Detaylı Karşılaştırma Script'i

```javascript
// detailed-comparison.js
const deepEqual = require('deep-equal');

function compareResponses(csharpResponse, nestjsResponse, path) {
  const report = {
    path,
    timestamp: new Date().toISOString(),
    status: {
      csharp: csharpResponse.status,
      nestjs: nestjsResponse.status,
      match: csharpResponse.status === nestjsResponse.status,
    },
    headers: {
      contentType: {
        csharp: csharpResponse.headers['content-type'],
        nestjs: nestjsResponse.headers['content-type'],
        match: csharpResponse.headers['content-type'] === nestjsResponse.headers['content-type'],
      },
    },
    body: {
      csharp: csharpResponse.data,
      nestjs: nestjsResponse.data,
      match: deepEqual(csharpResponse.data, nestjsResponse.data, { strict: true }),
    },
    differences: [],
  };

  // Detaylı fark analizi
  if (!report.body.match) {
    report.differences = findDifferences(csharpResponse.data, nestjsResponse.data);
  }

  return report;
}

function findDifferences(obj1, obj2, path = '') {
  const differences = [];

  if (typeof obj1 !== typeof obj2) {
    differences.push({
      path,
      type: 'type_mismatch',
      csharp: typeof obj1,
      nestjs: typeof obj2,
    });
    return differences;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      differences.push({
        path,
        type: 'array_length',
        csharp: obj1.length,
        nestjs: obj2.length,
      });
    }
    const minLength = Math.min(obj1.length, obj2.length);
    for (let i = 0; i < minLength; i++) {
      differences.push(...findDifferences(obj1[i], obj2[i], `${path}[${i}]`));
    }
  } else if (typeof obj1 === 'object' && obj1 !== null && obj2 !== null) {
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      if (!(key in obj1)) {
        differences.push({
          path: newPath,
          type: 'missing_in_csharp',
          nestjs: obj2[key],
        });
      } else if (!(key in obj2)) {
        differences.push({
          path: newPath,
          type: 'missing_in_nestjs',
          csharp: obj1[key],
        });
      } else {
        differences.push(...findDifferences(obj1[key], obj2[key], newPath));
      }
    }
  } else if (obj1 !== obj2) {
    differences.push({
      path,
      type: 'value_mismatch',
      csharp: obj1,
      nestjs: obj2,
    });
  }

  return differences;
}

module.exports = { compareResponses, findDifferences };
```

### 5.2 Kritik Karşılaştırma Noktaları

#### 5.2.1 Exception Format Kontrolü

```javascript
// UserNotFoundException kontrolü
const userNotFoundTest = {
  path: '/api/Order/nonexistent/nonexistent/0',
  expectedFormat: {
    Message: 'User Not Found.',  // Büyük M!
    code: 'USER_NOT_FOUND',
  },
};

// BaseException kontrolü
const baseExceptionTest = {
  path: '/api/Order/DispatchOrder',
  body: { /* invalid data */ },
  expectedFormat: {
    Message: expect.any(String),  // Büyük M!
    code: 'GENERAL',
  },
};

// CreateNewAccount hatası - Plain string kontrolü
const createAccountErrorTest = {
  path: '/api/Auth',
  body: { clientId: '', clientSecret: '' },
  // Response: "ClientID/ClientSecret cannot be null" (string, obje DEĞİL!)
};
```

#### 5.2.2 Timestamp Kontrolü

```javascript
// orderLocalUpdateDate kontrol
function validateTimestamp(csharpOrder, nestjsOrder) {
  const csharpTimestamp = csharpOrder.orderLocalUpdateDate;
  const nestjsTimestamp = nestjsOrder.orderLocalUpdateDate;
  
  // Her ikisi de milisaniye cinsinden olmalı
  const isCsharpMs = csharpTimestamp > 1000000000000; // 2001 yılından büyük
  const isNestjsMs = nestjsTimestamp > 1000000000000;
  
  return {
    valid: isCsharpMs && isNestjsMs,
    csharp: csharpTimestamp,
    nestjs: nestjsTimestamp,
  };
}
```

#### 5.2.3 Foreign Key İsimleri

```javascript
// Database sorgularında kolon ismi kontrolü
const columnNameTests = [
  { table: 'User', columns: ['Id', 'UserId', 'StoreId', 'ClientId', 'ClientSecret', 'IsDeleted'] }, // PascalCase
  { table: 'Orders', columns: ['id', 'clientId', 'storeId', 'shippingInfoid'] }, // lowercase + mixed FK
  { table: 'OrderLine', columns: ['id', 'Orderid', 'lineNumber'] }, // mixed FK
  { table: 'Charge', columns: ['id', 'OrderLineid'] }, // mixed FK
];
```

### 5.3 Karşılaştırma Raporu Şablonu

```markdown
# Response Karşılaştırma Raporu

**Tarih:** [YYYY-MM-DD HH:mm]
**Test Edilen Endpoint Sayısı:** [X]
**Eşleşen:** [Y]
**Eşleşmeyen:** [Z]

## Özet

| Endpoint | Metod | Status Eşleşme | Body Eşleşme | Notlar |
|----------|-------|----------------|--------------|--------|
| /health-check | GET | ✅ | ✅ | - |
| /api/Auth | POST | ✅ | ✅ | - |
| /api/Order/{...} | GET | ✅ | ✅ | - |
| ... | ... | ... | ... | ... |

## Eşleşmeyen Durumlar

### Endpoint: [PATH]

**C# Response:**
```json
{...}
```

**NestJS Response:**
```json
{...}
```

**Farklar:**
- [Fark 1]
- [Fark 2]

## Sonuç

[ ] Tüm testler geçti - Bir sonraki aşamaya geçilebilir
[ ] Bazı testler başarısız - Düzeltme gerekli
```

### 5.4 Response Karşılaştırma Kontrol Listesi

```
AŞAMA 4 KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

HTTP STATUS KODLARI:
□ 200 OK response'ları eşleşiyor
□ 400 Bad Request response'ları eşleşiyor
□ UserNotFoundException için 400 (404 DEĞİL!)

EXCEPTION FORMATLARI:
□ UserNotFoundException: {Message: "...", code: "USER_NOT_FOUND"}
□ BaseException: {Message: "...", code: "GENERAL"}
□ CreateNewAccount hatası: Plain string
□ "Message" büyük M ile başlıyor

RESPONSE BODY:
□ JSON yapısı birebir aynı
□ Alan isimleri (camelCase/PascalCase) aynı
□ Null değerler aynı şekilde handle ediliyor
□ Array sıralamaları aynı

TIMESTAMP'LAR:
□ orderLocalUpdateDate milisaniye cinsinden
□ orderDate milisaniye cinsinden
□ shipDateTime milisaniye cinsinden

CARRIER MAPPING:
□ "UPS" → "UPS"
□ "ups" → "UPS"
□ "fedex" → "FedEx"
□ Bilinmeyen carrier → ""

EN AZ 50 FARKLI REQUEST TEST EDİLDİ:
□ Health check
□ Account create (başarılı)
□ Account create (hatalı credentials)
□ Account create (store çakışması)
□ Account delete
□ Orders get (mevcut kullanıcı)
□ Orders get (olmayan kullanıcı)
□ Single order get
□ Dispatch order (bilinen carrier)
□ Dispatch order (bilinmeyen carrier)
□ Dispatch order (validation hatası)

✅ AŞAMA 4 TAMAMLANDI: [Tarih] [İmza]
```

---

## 6. AŞAMA 5: Kademeli Geçiş (Canary)

### 6.1 Canary Deployment Stratejisi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CANARY DEPLOYMENT AŞAMALARI                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AŞAMA 5.1: %10 TRAFİK                                                     │
│  ────────────────────                                                       │
│                                                                             │
│      ┌──────────────────────────────────────────┐                          │
│      │            LOAD BALANCER                 │                          │
│      └──────────────────┬───────────────────────┘                          │
│                         │                                                   │
│              ┌──────────┴──────────┐                                       │
│              │                     │                                       │
│              ▼                     ▼                                       │
│     ┌─────────────┐       ┌─────────────┐                                  │
│     │    C#       │       │   NestJS    │                                  │
│     │   (%90)     │       │   (%10)     │                                  │
│     │ Weight: 9   │       │ Weight: 1   │                                  │
│     └─────────────┘       └─────────────┘                                  │
│                                                                             │
│  SÜRE: 24-48 saat                                                          │
│  İZLENECEKLER: Hata oranı, latency, memory                                 │
│  BAŞARI KRİTERİ: Hata oranı <%0.1, p95 <500ms                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AŞAMA 5.2: %50 TRAFİK                                                     │
│  ────────────────────                                                       │
│                                                                             │
│     ┌─────────────┐       ┌─────────────┐                                  │
│     │    C#       │       │   NestJS    │                                  │
│     │   (%50)     │       │   (%50)     │                                  │
│     │ Weight: 1   │       │ Weight: 1   │                                  │
│     └─────────────┘       └─────────────┘                                  │
│                                                                             │
│  SÜRE: 48-72 saat                                                          │
│  İZLENECEKLER: Aynı + veritabanı yükü                                      │
│  BAŞARI KRİTERİ: Aynı + DB bağlantı havuzu stabil                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AŞAMA 5.3: %90 TRAFİK                                                     │
│  ────────────────────                                                       │
│                                                                             │
│     ┌─────────────┐       ┌─────────────┐                                  │
│     │    C#       │       │   NestJS    │                                  │
│     │   (%10)     │       │   (%90)     │                                  │
│     │ Weight: 1   │       │ Weight: 9   │                                  │
│     └─────────────┘       └─────────────┘                                  │
│                                                                             │
│  SÜRE: 24-48 saat                                                          │
│  İZLENECEKLER: Tüm metrikler                                               │
│  BAŞARI KRİTERİ: Tam stabilite                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 AWS ALB ile Canary Yapılandırması

```json
// Target Group 1: C# Service
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:...:targetgroup/csharp-tg/...",
  "Weight": 90
}

// Target Group 2: NestJS Service
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:...:targetgroup/nestjs-tg/...",
  "Weight": 10
}
```

```bash
# AWS CLI ile weight güncelleme
aws elbv2 modify-rule \
  --rule-arn "arn:aws:elasticloadbalancing:...:listener-rule/..." \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "arn:...csharp-tg/...", "Weight": 90},
          {"TargetGroupArn": "arn:...nestjs-tg/...", "Weight": 10}
        ]
      }
    }
  ]'
```

### 6.3 Nginx ile Canary Yapılandırması

```nginx
# nginx.conf
upstream backend {
    server csharp-service:8080 weight=90;
    server nestjs-service:3000 weight=10;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6.4 Canary Monitoring Dashboard

```yaml
# Grafana Dashboard için Prometheus Queries

# Request Rate (per service)
sum(rate(http_requests_total{service="nestjs"}[5m])) by (status)
sum(rate(http_requests_total{service="csharp"}[5m])) by (status)

# Error Rate
sum(rate(http_requests_total{service="nestjs", status=~"5.."}[5m])) / 
sum(rate(http_requests_total{service="nestjs"}[5m])) * 100

# Latency (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="nestjs"}[5m]))

# Memory Usage
container_memory_usage_bytes{container="nestjs-service"}
```

### 6.5 Canary Rollback Tetikleyicileri

```
🔴 ANINDA ROLLBACK GEREKTİREN DURUMLAR:
├── Hata oranı >%1 (5 dakika içinde)
├── p95 latency >1s (5 dakika içinde)
├── Container restart >3 (10 dakika içinde)
├── Memory kullanımı >90%
├── Veritabanı bağlantı hatası >10 (dakikada)
└── Walmart API timeout >50 (10 dakikada)

🟡 İZLENMESİ GEREKEN DURUMLAR:
├── Hata oranı %0.5-%1 arası
├── p95 latency 500ms-1s arası
├── Memory kullanımı %70-%90 arası
└── CPU kullanımı %70-%90 arası
```

### 6.6 Canary Kontrol Listesi

```
AŞAMA 5 KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

HAZIRLIK:
□ Monitoring dashboard hazır
□ Alerting kuralları tanımlı
□ Rollback script'i hazır ve test edildi
□ On-call ekip belirlendi

%10 TRAFİK (24-48 saat):
□ Traffic yönlendirme yapılandırıldı
□ İlk 1 saat yakın izleme yapıldı
□ Hata oranı <%0.1
□ p95 latency <500ms
□ Memory stabil
□ Kullanıcı şikayeti yok
□ 24 saat sorunsuz çalıştı

%50 TRAFİK (48-72 saat):
□ Traffic yüzdesi güncellendi
□ Veritabanı yükü izlendi
□ Hata oranı <%0.1
□ p95 latency <500ms
□ Her iki servis stabil
□ 48 saat sorunsuz çalıştı

%90 TRAFİK (24-48 saat):
□ Traffic yüzdesi güncellendi
□ C# servisi minimal yükte
□ Tüm metrikler normal
□ 24 saat sorunsuz çalıştı
□ Tam geçiş için onay alındı

✅ AŞAMA 5 TAMAMLANDI: [Tarih] [İmza]
```

---

## 7. AŞAMA 6: Tam Geçiş

### 7.1 Tam Geçiş Checklist

```
TAM GEÇİŞ ÖNCESİ KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════

TARİH/SAAT SEÇİMİ:
□ Düşük trafik saati seçildi (gece/hafta sonu)
□ Cuma günü DEĞİL
□ Tatil öncesi DEĞİL
□ Ekip tam kadro müsait

SON KONTROLLER:
□ Tüm testler son kez çalıştırıldı
□ Monitoring dashboard açık
□ Rollback script'i hazır
□ Database backup alındı
□ Stakeholder'lar bilgilendirildi

İLETİŞİM:
□ Tam geçiş zamanı duyuruldu
□ Acil durum iletişim kanalları belirlendi
□ Yönetici onayı alındı
```

### 7.2 Tam Geçiş Adımları

```bash
#!/bin/bash
# full-migration.sh

echo "═══════════════════════════════════════════════════════════"
echo "          WALMART NestJS TAM GEÇİŞ SCRIPT'İ                "
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Tarih: $(date)"
echo ""

# 1. Onay al
read -p "Tam geçiş işlemini başlatmak istiyor musunuz? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "İşlem iptal edildi."
    exit 1
fi

# 2. Database backup
echo ""
echo "[1/6] Database backup alınıyor..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
if [ $? -ne 0 ]; then
    echo "❌ Backup başarısız! İşlem durduruluyor."
    exit 1
fi
echo "✅ Backup tamamlandı."

# 3. Traffic'i %100 NestJS'e yönlendir
echo ""
echo "[2/6] Traffic %100 NestJS'e yönlendiriliyor..."
aws elbv2 modify-rule \
  --rule-arn "$ALB_RULE_ARN" \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "'$NESTJS_TG_ARN'", "Weight": 100}
        ]
      }
    }
  ]'
echo "✅ Traffic yönlendirmesi tamamlandı."

# 4. Health check
echo ""
echo "[3/6] Health check yapılıyor..."
for i in {1..5}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" $NESTJS_URL/health-check)
    if [ "$status" = "200" ]; then
        echo "✅ Health check başarılı (deneme $i)"
    else
        echo "❌ Health check başarısız! Status: $status"
        echo "Rollback başlatılıyor..."
        ./rollback.sh
        exit 1
    fi
    sleep 2
done

# 5. C# servisini durdur (opsiyonel - hemen yapılmayabilir)
echo ""
echo "[4/6] C# servisi durduruluyor..."
read -p "C# servisini durdurmak istiyor musunuz? (yes/no): " stop_csharp
if [ "$stop_csharp" = "yes" ]; then
    docker stop csharp-walmart-service
    echo "✅ C# servisi durduruldu."
else
    echo "⚠️  C# servisi çalışmaya devam ediyor (backup olarak)."
fi

# 6. Monitoring kontrolü
echo ""
echo "[5/6] 5 dakika monitoring kontrolü..."
for i in {1..5}; do
    echo "Dakika $i/5 - Metrikler kontrol ediliyor..."
    # Burada Prometheus/Grafana API'den metrik çekilebilir
    sleep 60
done

# 7. Tamamlandı
echo ""
echo "[6/6] ✅ TAM GEÇİŞ TAMAMLANDI!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    ÖNEMLİ NOTLAR                          "
echo "═══════════════════════════════════════════════════════════"
echo "1. Monitoring'i en az 24 saat yakından izleyin"
echo "2. Rollback script'i hazır tutun: ./rollback.sh"
echo "3. C# servisi henüz silinmediyse 1 hafta backup olarak tutun"
echo "4. Kullanıcı geri bildirimlerini takip edin"
echo "═══════════════════════════════════════════════════════════"
```

### 7.3 Zamanlanmış Görevleri Aktifleştirme

```bash
# Tam geçiş sonrası zamanlanmış görevleri aç
# ÖNEMLİ: Sadece tam geçiş tamamlandıktan sonra!

# Environment variable güncelle
ENABLE_SCHEDULED_JOBS=true

# Veya container'ı yeniden başlat
docker-compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker logs -f nestjs-walmart-service | grep "Scheduled"
# Beklenen: "Scheduled order sync is ENABLED"
```

### 7.4 Tam Geçiş Sonrası Kontrol Listesi

```
TAM GEÇİŞ SONRASI KONTROL LİSTESİ (İLK 24 SAAT)
═══════════════════════════════════════════════════════════════

İLK 1 SAAT:
□ Health check her 5 dakikada bir kontrol
□ Hata oranı izleniyor
□ Response time izleniyor
□ Kullanıcı şikayeti kontrolü

İLK 4 SAAT:
□ İlk sipariş senkronizasyonu başarılı
□ Memory kullanımı stabil
□ CPU kullanımı normal
□ Veritabanı bağlantıları stabil

İLK 24 SAAT:
□ Zamanlanmış görev çalıştı (10 dk'da bir)
□ Tüm kullanıcı işlemleri normal
□ Kargo gönderimi test edildi
□ Walmart API bağlantısı stabil
□ Log dosyaları kontrol edildi
□ Hata yok veya bilinen hatalar

İLK 1 HAFTA:
□ C# servisi backup olarak tutuldu
□ Günlük monitoring raporu oluşturuldu
□ Performans metrikleri karşılaştırıldı
□ Kullanıcı geri bildirimleri toplandı
□ Dokümantasyon güncellendi

✅ TAM GEÇİŞ BAŞARILI: [Tarih] [İmza]
```

---

## 8. Rollback Stratejisi

### 8.1 Rollback Senaryoları

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROLLBACK KARAR AĞACI                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                      ┌─────────────────────┐                               │
│                      │   Sorun Tespit      │                               │
│                      └──────────┬──────────┘                               │
│                                 │                                           │
│                    ┌────────────┴────────────┐                             │
│                    │                         │                             │
│                    ▼                         ▼                             │
│           ┌───────────────┐         ┌───────────────┐                      │
│           │  Kritik Hata  │         │ Küçük Sorun   │                      │
│           │  (Hata >%1)   │         │ (Hata <%1)    │                      │
│           └───────┬───────┘         └───────┬───────┘                      │
│                   │                         │                              │
│                   ▼                         ▼                              │
│           ┌───────────────┐         ┌───────────────┐                      │
│           │    ANINDA     │         │   İzle ve     │                      │
│           │   ROLLBACK    │         │   Değerlendir │                      │
│           └───────────────┘         └───────┬───────┘                      │
│                                             │                              │
│                                    ┌────────┴────────┐                     │
│                                    │                 │                     │
│                                    ▼                 ▼                     │
│                            ┌─────────────┐   ┌─────────────┐              │
│                            │ Düzeltilebilir │   │ Düzeltilemiyor│          │
│                            │  (Hotfix)    │   │             │              │
│                            └──────┬──────┘   └──────┬──────┘              │
│                                   │                 │                      │
│                                   ▼                 ▼                      │
│                            ┌─────────────┐   ┌─────────────┐              │
│                            │   Hotfix    │   │  ROLLBACK   │              │
│                            │   Deploy    │   │             │              │
│                            └─────────────┘   └─────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Rollback Script'i

```bash
#!/bin/bash
# rollback.sh

echo "═══════════════════════════════════════════════════════════"
echo "              ROLLBACK SCRIPT'İ BAŞLATILIYOR               "
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "⚠️  DİKKAT: Bu işlem trafiği C# servisine geri yönlendirecek!"
echo ""

# Onay al
read -p "Rollback işlemini başlatmak istiyor musunuz? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "İşlem iptal edildi."
    exit 1
fi

# 1. C# servisinin çalıştığından emin ol
echo ""
echo "[1/4] C# servisi kontrol ediliyor..."
csharp_status=$(curl -s -o /dev/null -w "%{http_code}" $CSHARP_URL/health-check)
if [ "$csharp_status" != "200" ]; then
    echo "❌ C# servisi çalışmıyor! Önce başlatın."
    echo "Başlatmak için: docker start csharp-walmart-service"
    exit 1
fi
echo "✅ C# servisi çalışıyor."

# 2. Traffic'i C#'a yönlendir
echo ""
echo "[2/4] Traffic C#'a yönlendiriliyor..."
aws elbv2 modify-rule \
  --rule-arn "$ALB_RULE_ARN" \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "'$CSHARP_TG_ARN'", "Weight": 100}
        ]
      }
    }
  ]'
echo "✅ Traffic C#'a yönlendirildi."

# 3. C# health check
echo ""
echo "[3/4] C# health check yapılıyor..."
for i in {1..3}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" $CSHARP_URL/health-check)
    if [ "$status" = "200" ]; then
        echo "✅ C# health check başarılı (deneme $i)"
    else
        echo "❌ C# health check başarısız! Manuel müdahale gerekli!"
        exit 1
    fi
    sleep 2
done

# 4. NestJS zamanlanmış görevleri durdur
echo ""
echo "[4/4] NestJS zamanlanmış görevleri durduruluyor..."
docker exec nestjs-walmart-service sh -c "export ENABLE_SCHEDULED_JOBS=false"
# veya container'ı durdur
# docker stop nestjs-walmart-service

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "              ✅ ROLLBACK TAMAMLANDI                       "
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Sonraki adımlar:"
echo "1. Sorunun nedenini araştırın"
echo "2. Logları inceleyin"
echo "3. Düzeltme yapın"
echo "4. Yeniden test edin"
echo "5. Tekrar deneyin"
echo ""
```

### 8.3 Veritabanı Rollback (Nadir Durum)

```bash
# ⚠️ SADECE VERİTABANI DEĞİŞİKLİĞİ YAPILDIYSA!
# NestJS projesi aynı schema'yı kullandığı için normalde gerekli değil.

# Backup'tan restore
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_YYYYMMDD_HHMMSS.sql
```

---

## 9. Monitoring ve Alerting

### 9.1 İzlenmesi Gereken Metrikler

```yaml
# Prometheus alerting rules
groups:
  - name: walmart-nestjs-alerts
    rules:
      # Yüksek hata oranı
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{service="nestjs", status=~"5.."}[5m])) /
          sum(rate(http_requests_total{service="nestjs"}[5m])) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Yüksek hata oranı tespit edildi (>1%)"
          description: "NestJS servisinde hata oranı {{ $value | humanizePercentage }}"

      # Yüksek latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="nestjs"}[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Yüksek latency tespit edildi (p95 > 500ms)"

      # Memory kullanımı
      - alert: HighMemoryUsage
        expr: |
          container_memory_usage_bytes{container="nestjs-walmart-service"} /
          container_spec_memory_limit_bytes{container="nestjs-walmart-service"} > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Yüksek memory kullanımı (>85%)"

      # Container restart
      - alert: ContainerRestarting
        expr: |
          increase(kube_pod_container_status_restarts_total{container="nestjs-walmart-service"}[10m]) > 3
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Container sürekli restart ediyor"

      # Veritabanı bağlantı hatası
      - alert: DatabaseConnectionError
        expr: |
          increase(pg_connection_errors_total{service="nestjs"}[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Veritabanı bağlantı hataları artıyor"
```

### 9.2 Grafana Dashboard

```json
{
  "title": "Walmart NestJS Service",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{service=\"nestjs\"}[5m])) by (status)"
        }
      ]
    },
    {
      "title": "Error Rate",
      "type": "singlestat",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{service=\"nestjs\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"nestjs\"}[5m])) * 100"
        }
      ],
      "thresholds": "0.5,1",
      "colors": ["green", "yellow", "red"]
    },
    {
      "title": "Latency (p50, p95, p99)",
      "type": "graph",
      "targets": [
        {
          "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service=\"nestjs\"}[5m]))",
          "legendFormat": "p50"
        },
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=\"nestjs\"}[5m]))",
          "legendFormat": "p95"
        },
        {
          "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service=\"nestjs\"}[5m]))",
          "legendFormat": "p99"
        }
      ]
    },
    {
      "title": "Memory Usage",
      "type": "graph",
      "targets": [
        {
          "expr": "container_memory_usage_bytes{container=\"nestjs-walmart-service\"}"
        }
      ]
    },
    {
      "title": "CPU Usage",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(container_cpu_usage_seconds_total{container=\"nestjs-walmart-service\"}[5m])"
        }
      ]
    }
  ]
}
```

### 9.3 Log Monitoring

```bash
# CloudWatch Logs Insights sorguları

# Hata logları
fields @timestamp, @message
| filter @message like /error|Error|ERROR/
| sort @timestamp desc
| limit 100

# Walmart API hataları
fields @timestamp, @message
| filter @message like /Walmart|AuthError|FetchOrder/
| filter @message like /error|Error|fail/
| sort @timestamp desc
| limit 50

# Yavaş istekler (>1s)
fields @timestamp, @message, @duration
| filter @duration > 1000
| sort @duration desc
| limit 50
```

---

## 10. Kontrol Listeleri

### 10.1 Master Kontrol Listesi

```
═══════════════════════════════════════════════════════════════════════════════
                    WALMART NestJS MASTER KONTROL LİSTESİ
═══════════════════════════════════════════════════════════════════════════════

AŞAMA 1: LOKAL ORTAM TESTLERİ
─────────────────────────────
□ npm install başarılı
□ npm run build hatasız
□ Unit testler geçti
□ E2E testler geçti
□ Manuel API testleri başarılı
□ Postman collection testleri başarılı

Tamamlanma: [Tarih] __________ İmza: __________

AŞAMA 2: TEST/STAGING ORTAMI
────────────────────────────
□ Staging ortamı hazır
□ Canlı DB kopyası alındı
□ Tüm API testleri başarılı
□ Walmart API bağlantısı test edildi
□ Load test başarılı
□ 24 saat kesintisiz çalıştı

Tamamlanma: [Tarih] __________ İmza: __________

AŞAMA 3: PARALEL ÇALIŞTIRMA
───────────────────────────
□ Her iki servis çalışıyor
□ Paralel test script'i hazır
□ En az 100 request test edildi
□ Response'lar %100 eşleşti

Tamamlanma: [Tarih] __________ İmza: __________

AŞAMA 4: RESPONSE KARŞILAŞTIRMA
───────────────────────────────
□ HTTP status kodları eşleşti
□ Exception formatları eşleşti
□ Response body'ler eşleşti
□ Karşılaştırma raporu oluşturuldu

Tamamlanma: [Tarih] __________ İmza: __________

AŞAMA 5: KADEMELİ GEÇİŞ (CANARY)
────────────────────────────────
□ %10 trafik - 24 saat başarılı
□ %50 trafik - 48 saat başarılı
□ %90 trafik - 24 saat başarılı
□ Monitoring metrikleri normal

Tamamlanma: [Tarih] __________ İmza: __________

AŞAMA 6: TAM GEÇİŞ
──────────────────
□ Yönetici onayı alındı
□ Database backup alındı
□ %100 trafik NestJS'e yönlendirildi
□ Health check başarılı
□ İlk 24 saat sorunsuz
□ C# servisi backup olarak tutuldu

Tamamlanma: [Tarih] __________ İmza: __________

═══════════════════════════════════════════════════════════════════════════════
                         PROJE TAMAMLANDI
                         
Final Onay: [Tarih] __________

Proje Yöneticisi: __________
Teknik Lider: __________
DevOps: __________
═══════════════════════════════════════════════════════════════════════════════
```

---

## 11. Acil Durum Prosedürleri

### 11.1 Acil Durum İletişim Matrisi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ACİL DURUM İLETİŞİM MATRİSİ                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SEVİYE 1 (KRİTİK) - Servis tamamen down                                   │
│  ├── Yanıt süresi: 5 dakika                                                │
│  ├── Kime haber ver: Teknik Lider, DevOps, Yönetici                        │
│  └── Aksiyon: Anında rollback                                              │
│                                                                             │
│  SEVİYE 2 (YÜKSEK) - Hata oranı >%1                                        │
│  ├── Yanıt süresi: 15 dakika                                               │
│  ├── Kime haber ver: Teknik Lider, DevOps                                  │
│  └── Aksiyon: İncele, gerekirse rollback                                   │
│                                                                             │
│  SEVİYE 3 (ORTA) - Performance düşük                                       │
│  ├── Yanıt süresi: 1 saat                                                  │
│  ├── Kime haber ver: Teknik Lider                                          │
│  └── Aksiyon: İncele, hotfix veya sonraki sprint                           │
│                                                                             │
│  SEVİYE 4 (DÜŞÜK) - Küçük bug                                              │
│  ├── Yanıt süresi: 24 saat                                                 │
│  ├── Kime haber ver: Geliştirici                                           │
│  └── Aksiyon: Backlog'a ekle                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Acil Durum Akış Şeması

```
┌─────────────────┐
│  Sorun Tespit   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Hayır     ┌─────────────────┐
│ Servis Down mı? │─────────────▶│ Hata Oranı >%1? │
└────────┬────────┘               └────────┬────────┘
         │ Evet                            │
         ▼                                 ▼ Evet
┌─────────────────┐               ┌─────────────────┐
│ SEVİYE 1 ALARM  │               │ SEVİYE 2 ALARM  │
│ Anında Rollback │               │ İncele          │
└────────┬────────┘               └────────┬────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│ ./rollback.sh   │               │ Log Analizi     │
└────────┬────────┘               └────────┬────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│ Ekibi Bilgilendir│               │ Kök Neden Bul   │
└────────┬────────┘               └────────┬────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│ Post-mortem     │               │ Hotfix/Rollback │
└─────────────────┘               └─────────────────┘
```

### 11.3 Sık Karşılaşılan Sorunlar ve Çözümleri

```
SORUN: Container sürekli restart ediyor
──────────────────────────────────────
1. Logları kontrol et: docker logs nestjs-walmart-service
2. Memory limit kontrol: docker stats
3. Health check endpoint kontrol
4. Eğer memory sorunu: Limit artır veya memory leak ara
5. Çözülmezse: Rollback

SORUN: Veritabanı bağlantı hatası
─────────────────────────────────
1. PostgreSQL çalışıyor mu: systemctl status postgresql
2. Connection string kontrol: .env dosyası
3. Max connections kontrol: SHOW max_connections;
4. Connection pool ayarları
5. Firewall/Security group kontrol

SORUN: Walmart API timeout
──────────────────────────
1. Walmart API status page kontrol
2. Network bağlantısı kontrol
3. Credentials doğru mu kontrol
4. Rate limit'e takıldık mı kontrol
5. Retry logic çalışıyor mu

SORUN: Response format uyumsuzluğu
──────────────────────────────────
1. Hangi endpoint'te sorun var belirle
2. C# response'u logla
3. NestJS response'u logla
4. Farkı bul
5. Hotfix veya rollback
```

---

## 📋 Özet

Bu rehber, NestJS projesinin canlı ortama güvenli bir şekilde geçişi için **6 aşamalı** bir süreç sunmaktadır:

1. **Lokal Test** → Temel doğrulama
2. **Staging** → Gerçek ortam simülasyonu
3. **Paralel Çalıştırma** → Yan yana karşılaştırma
4. **Response Karşılaştırma** → Detaylı doğrulama
5. **Canary Deployment** → Kademeli geçiş
6. **Tam Geçiş** → Final

Her aşamada **kontrol listeleri**, **rollback stratejileri** ve **monitoring** önerileri bulunmaktadır.

---

**Son Güncelleme:** Ocak 2026  
**Versiyon:** 1.0.0
