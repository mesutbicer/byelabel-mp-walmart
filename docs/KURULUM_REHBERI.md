# 📦 Walmart NestJS Servisi - Detaylı Kurulum Rehberi

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** Ocak 2026  
> **Uyumluluk:** C# (.NET) projesinden birebir migrasyon

---

## 📋 İçindekiler

1. [Sistem Gereksinimleri](#1-sistem-gereksinimleri)
2. [Ön Hazırlık](#2-ön-hazırlık)
3. [Yerel Geliştirme Ortamı Kurulumu](#3-yerel-geliştirme-ortamı-kurulumu)
4. [Veritabanı Yapılandırması](#4-veritabanı-yapılandırması)
5. [Ortam Değişkenleri](#5-ortam-değişkenleri)
6. [Uygulamayı Çalıştırma](#6-uygulamayı-çalıştırma)
7. [Docker ile Kurulum](#7-docker-ile-kurulum)
8. [AWS Deployment](#8-aws-deployment)
9. [Testleri Çalıştırma](#9-testleri-çalıştırma)
10. [Sorun Giderme](#10-sorun-giderme)

---

## 1. Sistem Gereksinimleri

### Minimum Gereksinimler

| Bileşen | Minimum | Önerilen |
|---------|---------|----------|
| **Node.js** | 18.x LTS | 20.x LTS |
| **npm** | 9.x | 10.x |
| **PostgreSQL** | 14.x | 15.x veya 16.x |
| **RAM** | 512 MB | 1 GB |
| **Disk** | 500 MB | 1 GB |

### Gerekli Araçlar

```bash
# Node.js versiyonunu kontrol edin
node --version  # v18.0.0 veya üzeri olmalı

# npm versiyonunu kontrol edin
npm --version   # 9.0.0 veya üzeri olmalı

# PostgreSQL versiyonunu kontrol edin
psql --version  # 14.0 veya üzeri olmalı
```

---

## 2. Ön Hazırlık

### 2.1 Walmart Partner Portal Erişimi

Walmart API'yi kullanabilmek için aşağıdaki bilgilere ihtiyacınız var:

1. **Client ID** - Walmart Partner Portal'dan alınır
2. **Client Secret** - Walmart Partner Portal'dan alınır

> ⚠️ **ÖNEMLİ:** Bu bilgiler olmadan uygulama Walmart API'ye bağlanamaz!

### 2.2 Mevcut C# Veritabanı

Eğer mevcut C# uygulamasından geçiş yapıyorsanız:

- ✅ Mevcut PostgreSQL veritabanınız NestJS ile **birebir uyumludur**
- ✅ Tablo yapıları ve kolon isimleri korunmuştur
- ✅ Foreign key ilişkileri aynıdır

> ⚠️ **KRİTİK:** `DB_SYNCHRONIZE=false` olarak ayarlandığından emin olun! Aksi halde TypeORM mevcut tabloları değiştirebilir.

---

## 3. Yerel Geliştirme Ortamı Kurulumu

### 3.1 Projeyi İndirin

```bash
# ZIP dosyasını çıkarın
unzip walmart-nestjs-complete.zip
cd walmart-nestjs

# Bağımlılıkları yükleyin
npm install
```

### 3.2 TypeScript Derleme Kontrolü

```bash
# Derleme hatası olup olmadığını kontrol edin
npm run build

# Başarılı çıktı:
# > walmart-service-nestjs@1.0.0 build
# > nest build
```

> ⚠️ **UYARI:** Derleme hatası varsa deployment yapmayın! Hataları önce düzeltin.

---

## 4. Veritabanı Yapılandırması

### 4.1 Yeni Veritabanı Oluşturma (Sıfırdan Başlıyorsanız)

#### Ubuntu/Debian

```bash
# PostgreSQL'e bağlanın
sudo -u postgres psql

# Veritabanı ve kullanıcı oluşturun
CREATE DATABASE walmart_db;
CREATE USER walmart_user WITH ENCRYPTED PASSWORD 'güvenli_şifre';
GRANT ALL PRIVILEGES ON DATABASE walmart_db TO walmart_user;
\q
```

#### macOS (Homebrew)

```bash
# PostgreSQL'e bağlanın
psql postgres

# Veritabanı ve kullanıcı oluşturun
CREATE DATABASE walmart_db;
CREATE USER walmart_user WITH ENCRYPTED PASSWORD 'güvenli_şifre';
GRANT ALL PRIVILEGES ON DATABASE walmart_db TO walmart_user;
\q
```

### 4.2 Tablo Yapısını Oluşturma

```bash
# docs/schema.sql dosyasını çalıştırın
psql -U walmart_user -d walmart_db -f docs/schema.sql
```

#### Manuel SQL (Gerekirse)

```sql
-- 1. ShippingInfo tablosu
CREATE TABLE "ShippingInfo" (
    "id" SERIAL PRIMARY KEY,
    "phone" TEXT,
    "estimatedDeliveryDate" BIGINT,
    "estimatedShipDate" BIGINT,
    "methodCode" TEXT,
    "postalAddress_name" TEXT,
    "postalAddress_address1" TEXT,
    "postalAddress_address2" TEXT,
    "postalAddress_city" TEXT,
    "postalAddress_state" TEXT,
    "postalAddress_postalCode" TEXT,
    "postalAddress_country" TEXT,
    "postalAddress_addressType" TEXT
);

-- 2. User tablosu (PascalCase - C# uyumlu!)
CREATE TABLE "User" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" TEXT,
    "StoreId" TEXT,
    "ClientId" TEXT,
    "ClientSecret" TEXT,
    "IsDeleted" BOOLEAN DEFAULT FALSE
);

-- 3. Orders tablosu
CREATE TABLE "Orders" (
    "id" SERIAL PRIMARY KEY,
    "clientId" TEXT,
    "storeId" TEXT,
    "purchaseOrderId" TEXT,
    "customerOrderId" TEXT,
    "customerEmailId" TEXT,
    "orderType" TEXT,
    "originalCustomerOrderID" TEXT,
    "orderDate" BIGINT,
    "orderLocalUpdateDate" BIGINT,
    "shippingInfoid" INTEGER REFERENCES "ShippingInfo"("id")
);

-- 4. OrderLine tablosu
CREATE TABLE "OrderLine" (
    "id" SERIAL PRIMARY KEY,
    "lineNumber" TEXT,
    "item_productName" TEXT,
    "item_sku" TEXT,
    "item_condition" TEXT,
    "item_imageUrl" TEXT,
    "item_weight_value" TEXT,
    "item_weight_unit" TEXT,
    "orderLineQuantity_unitOfMeasurement" TEXT,
    "orderLineQuantity_amount" TEXT,
    "statusDate" BIGINT,
    "fulfillment_fulfillmentOption" TEXT,
    "fulfillment_shipMethod" TEXT,
    "fulfillment_pickUpDateTime" BIGINT,
    "Orderid" INTEGER REFERENCES "Orders"("id")
);

-- 5. Charge tablosu
CREATE TABLE "Charge" (
    "id" SERIAL PRIMARY KEY,
    "chargeType" TEXT,
    "chargeName" TEXT,
    "chargeAmount_currency" TEXT,
    "chargeAmount_amount" DOUBLE PRECISION,
    "tax_taxName" TEXT,
    "tax_taxAmount_currency" TEXT,
    "tax_taxAmount_amount" DOUBLE PRECISION,
    "OrderLineid" INTEGER REFERENCES "OrderLine"("id")
);

-- 6. OrderLineStatus tablosu
CREATE TABLE "OrderLineStatus" (
    "id" SERIAL PRIMARY KEY,
    "status" TEXT,
    "statusQuantity_unitOfMeasurement" TEXT,
    "statusQuantity_amount" TEXT,
    "trackingInfo_shipDateTime" BIGINT,
    "trackingInfo_carrierName_otherCarrier" TEXT,
    "trackingInfo_carrierName_carrier" TEXT,
    "trackingInfo_methodCode" TEXT,
    "trackingInfo_trackingNumber" TEXT,
    "trackingInfo_trackingURL" TEXT,
    "OrderLineid" INTEGER REFERENCES "OrderLine"("id")
);

-- İndeksler
CREATE INDEX "IX_Orders_shippingInfoid" ON "Orders" ("shippingInfoid");
CREATE INDEX "IX_OrderLine_Orderid" ON "OrderLine" ("Orderid");
CREATE INDEX "IX_Charge_OrderLineid" ON "Charge" ("OrderLineid");
CREATE INDEX "IX_OrderLineStatus_OrderLineid" ON "OrderLineStatus" ("OrderLineid");
```

### 4.3 Mevcut C# Veritabanına Bağlanma

Mevcut veritabanınızı kullanıyorsanız, ek bir işlem yapmanıza gerek yok. Sadece `.env` dosyasında doğru bağlantı bilgilerini girin.

> ⚠️ **KRİTİK UYARI:** `DB_SYNCHRONIZE=false` olmalı! Aksi halde TypeORM tablolarınızı değiştirebilir!

---

## 5. Ortam Değişkenleri

### 5.1 .env Dosyası Oluşturma

```bash
# Örnek dosyayı kopyalayın
cp .env.example .env

# Düzenleyin
nano .env
```

### 5.2 Tüm Ortam Değişkenleri

```env
# ═══════════════════════════════════════════════════════════════
# SUNUCU AYARLARI
# ═══════════════════════════════════════════════════════════════
PORT=3000
NODE_ENV=development

# ═══════════════════════════════════════════════════════════════
# VERİTABANI AYARLARI
# ═══════════════════════════════════════════════════════════════
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=walmart_user
DB_PASSWORD=güvenli_şifre
DB_DATABASE=walmart_db

# ⚠️ KRİTİK: Production'da MUTLAKA false olmalı!
DB_SYNCHRONIZE=false

# ═══════════════════════════════════════════════════════════════
# WALMART API AYARLARI
# ═══════════════════════════════════════════════════════════════
WALMART_API_BASE_URL=https://marketplace.walmartapis.com/v3
WALMART_SERVICE_NAME=ByeLabel Walmart Service

# ═══════════════════════════════════════════════════════════════
# ZAMANLANMIŞ GÖREVLER
# ═══════════════════════════════════════════════════════════════
# true: 10 dakikada bir sipariş senkronizasyonu aktif
# false: Manuel senkronizasyon (API çağrısı ile)
ENABLE_SCHEDULED_JOBS=false

# Batch işleme ayarları
BATCH_SIZE=25
MAX_CONCURRENCY=5

# ═══════════════════════════════════════════════════════════════
# LOGLAMA (Opsiyonel - Logstash)
# ═══════════════════════════════════════════════════════════════
LOGSTASH_HOST=logstash.example.com
LOGSTASH_PORT=5000
```

### 5.3 Ortam Değişkeni Açıklamaları

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `PORT` | Hayır | Uygulama portu (varsayılan: 3000) |
| `NODE_ENV` | Hayır | `development`, `production`, `test` |
| `DB_HOST` | Evet | PostgreSQL sunucu adresi |
| `DB_PORT` | Hayır | PostgreSQL portu (varsayılan: 5432) |
| `DB_USERNAME` | Evet | Veritabanı kullanıcı adı |
| `DB_PASSWORD` | Evet | Veritabanı şifresi |
| `DB_DATABASE` | Evet | Veritabanı adı |
| `DB_SYNCHRONIZE` | Evet | **KRİTİK:** Production'da `false` olmalı! |
| `WALMART_API_BASE_URL` | Hayır | Walmart API adresi |
| `ENABLE_SCHEDULED_JOBS` | Hayır | Zamanlanmış görevleri aktif et |

---

## 6. Uygulamayı Çalıştırma

### 6.1 Geliştirme Modu

```bash
# Hot-reload ile çalıştır
npm run start:dev

# Çıktı:
# [Nest] 12345  - 01/23/2026, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345  - 01/23/2026, 10:00:01 AM     LOG [RoutesResolver] AuthController {/api/Auth}:
# [Nest] 12345  - 01/23/2026, 10:00:01 AM     LOG [RoutesResolver] OrderController {/api/Order}:
# [Nest] 12345  - 01/23/2026, 10:00:01 AM     LOG [NestApplication] Nest application successfully started
# Application running on: http://localhost:3000
# Swagger documentation: http://localhost:3000/api
```

### 6.2 Production Modu

```bash
# Derle
npm run build

# Çalıştır
npm run start:prod

# veya direkt
node dist/main.js
```

### 6.3 Uygulama Doğrulama

```bash
# Health check
curl http://localhost:3000/health-check
# Beklenen: 200 OK

# Swagger UI
# Tarayıcıda: http://localhost:3000/api
```

---

## 7. Docker ile Kurulum

### 7.1 Dockerfile

Proje içinde hazır `Dockerfile` bulunmaktadır:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 7.2 Docker Compose

```yaml
version: '3.8'

services:
  walmart-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=walmart_user
      - DB_PASSWORD=güvenli_şifre
      - DB_DATABASE=walmart_db
      - DB_SYNCHRONIZE=false
      - ENABLE_SCHEDULED_JOBS=true
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=walmart_user
      - POSTGRES_PASSWORD=güvenli_şifre
      - POSTGRES_DB=walmart_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docs/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

volumes:
  postgres_data:
```

### 7.3 Docker Komutları

```bash
# İmaj oluştur
docker build -t walmart-nestjs .

# Docker Compose ile çalıştır
docker-compose up -d

# Logları kontrol et
docker-compose logs -f walmart-service
```

---

## 8. AWS Deployment

### 8.1 Gerekli AWS Servisleri

1. **Amazon RDS** - PostgreSQL veritabanı
2. **Amazon ECR** - Docker imaj deposu
3. **Amazon ECS Fargate** - Container çalıştırma
4. **Application Load Balancer** - Yük dengeleme
5. **CloudWatch** - Loglama ve monitoring

### 8.2 RDS Kurulumu

```bash
# AWS CLI ile RDS oluşturma
aws rds create-db-instance \
  --db-instance-identifier walmart-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username walmart_admin \
  --master-user-password 'GüçlüŞifre123!' \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name my-db-subnet-group \
  --publicly-accessible false
```

### 8.3 ECR'a İmaj Yükleme

```bash
# ECR'a giriş
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.eu-west-1.amazonaws.com

# İmaj oluştur ve etiketle
docker build -t walmart-nestjs .
docker tag walmart-nestjs:latest 123456789.dkr.ecr.eu-west-1.amazonaws.com/walmart-nestjs:latest

# Yükle
docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/walmart-nestjs:latest
```

### 8.4 ECS Task Definition

```json
{
  "family": "walmart-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "walmart-service",
      "image": "123456789.dkr.ecr.eu-west-1.amazonaws.com/walmart-nestjs:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "DB_SYNCHRONIZE", "value": "false" },
        { "name": "ENABLE_SCHEDULED_JOBS", "value": "true" }
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:123456789:secret:walmart/db-host"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:123456789:secret:walmart/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/walmart-service",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## 9. Testleri Çalıştırma

### 9.1 Unit Testler

```bash
# Tüm unit testleri çalıştır
npm test

# Watch modunda
npm run test:watch

# Coverage raporu ile
npm run test:cov
```

### 9.2 E2E Testler

```bash
# E2E testleri çalıştır
npm run test:e2e

# Belirli bir test dosyası
npm run test:e2e -- --testPathPattern=auth
```

### 9.3 Test Kategorileri

| Dosya | Kapsam |
|-------|--------|
| `auth.e2e-spec.ts` | Auth Controller testleri |
| `order.e2e-spec.ts` | Order Controller testleri |
| `exception-handling.e2e-spec.ts` | C# uyumlu hata formatları |
| `carrier-mapping.spec.ts` | Kargo firması eşleştirme |
| `app.e2e-spec.ts` | Genel uygulama testleri |

---

## 10. Sorun Giderme

### 10.1 Yaygın Hatalar

#### "Connection refused" Hatası

```bash
# PostgreSQL çalışıyor mu kontrol edin
sudo systemctl status postgresql

# Bağlantı bilgilerini doğrulayın
psql -h localhost -U walmart_user -d walmart_db
```

#### "relation does not exist" Hatası

```bash
# Tabloların varlığını kontrol edin
psql -U walmart_user -d walmart_db -c "\dt"

# Yoksa schema.sql'i çalıştırın
psql -U walmart_user -d walmart_db -f docs/schema.sql
```

#### TypeORM Sync Hatası

```
⚠️ DB_SYNCHRONIZE=false olduğundan emin olun!

# .env dosyasını kontrol edin
cat .env | grep SYNCHRONIZE
# Çıktı: DB_SYNCHRONIZE=false
```

#### Port Kullanımda Hatası

```bash
# 3000 portunu kullanan process'i bulun
lsof -i :3000

# Process'i sonlandırın
kill -9 <PID>

# veya farklı port kullanın
PORT=3001 npm run start:dev
```

### 10.2 Log Kontrol

```bash
# Uygulama logları
npm run start:dev 2>&1 | tee app.log

# Docker logları
docker-compose logs -f walmart-service

# AWS CloudWatch
aws logs tail /ecs/walmart-service --follow
```

### 10.3 Veritabanı Bağlantı Testi

```bash
# Node.js ile bağlantı testi
node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'walmart_user',
  password: 'şifre',
  database: 'walmart_db'
});
client.connect()
  .then(() => { console.log('✅ Bağlantı başarılı!'); client.end(); })
  .catch(e => { console.error('❌ Hata:', e.message); });
"
```

---

## ✅ Kurulum Kontrol Listesi

- [ ] Node.js 18+ kurulu
- [ ] PostgreSQL 14+ kurulu ve çalışıyor
- [ ] Veritabanı ve kullanıcı oluşturuldu
- [ ] Tablolar oluşturuldu (schema.sql)
- [ ] `.env` dosyası yapılandırıldı
- [ ] `DB_SYNCHRONIZE=false` ayarlandı
- [ ] `npm install` başarılı
- [ ] `npm run build` hatasız tamamlandı
- [ ] `npm run start:dev` çalışıyor
- [ ] `/health-check` endpoint'i 200 dönüyor
- [ ] Swagger UI erişilebilir (`/api`)

---

## 📞 Destek

Sorun yaşarsanız:
1. Bu dokümandaki sorun giderme bölümünü kontrol edin
2. Test ortamında `/health-check` endpoint'ini kontrol edin
3. Uygulama loglarını inceleyin
4. Postman collection ile endpoint'leri test edin

---

**Son Güncelleme:** Ocak 2026  
**Versiyon:** 1.0.0
