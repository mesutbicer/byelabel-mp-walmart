# Walmart Marketplace API Service - Mimari Döküman

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Sistem Mimarisi](#2-sistem-mimarisi)
3. [AWS Altyapısı](#3-aws-altyapısı)
4. [Request Akışı ve Middleware](#4-request-akışı-ve-middleware)
5. [Veritabanı Yapısı](#5-veritabanı-yapısı)
6. [API Endpoint'leri](#6-api-endpointleri)
7. [Walmart API Entegrasyonu](#7-walmart-api-entegrasyonu)
8. [Servis Katmanları](#8-servis-katmanları)
9. [Zamanlanmış Görevler](#9-zamanlanmış-görevler)
10. [Hata Yönetimi](#10-hata-yönetimi)
11. [Loglama Stratejisi](#11-loglama-stratejisi)
12. [Deployment](#12-deployment)

---

## 1. Proje Özeti

### 1.1 Amaç
Bu proje, **Walmart Marketplace API** ile entegrasyon sağlayan bir servis uygulamasıdır. C# (.NET) servisinden NestJS'e migrate edilmiş olup, mevcut veritabanı şeması ve API kontratları ile tam geriye dönük uyumluluk sağlar.

Temel işlevleri:
- **Walmart mağaza bağlantısı**: Satıcıların Walmart hesaplarını sisteme entegre etmesi
- **Sipariş senkronizasyonu**: Walmart'tan siparişlerin otomatik çekilmesi
- **Kargo bildirimi**: Siparişlerin kargoya verildi olarak işaretlenmesi

### 1.2 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Runtime** | Node.js 20+ |
| **Framework** | NestJS 10 |
| **Database** | PostgreSQL 14+ (AWS RDS) |
| **ORM** | TypeORM |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **HTTP Client** | Axios |
| **Scheduler** | @nestjs/schedule |
| **Container** | Docker (multi-stage build) |
| **Cloud** | AWS ECS Fargate, ECR, ALB, Route 53 |
| **Monitoring** | AWS CloudWatch Logs |

### 1.3 Proje Yapısı

```
walmart-nestjs/
├── src/
│   ├── auth/                    # Authentication modülü
│   │   ├── auth.controller.ts   # Kullanıcı endpoint'leri
│   │   ├── auth.service.ts      # Kullanıcı iş mantığı
│   │   ├── auth-endpoint.service.ts  # Walmart Auth API
│   │   └── auth.module.ts
│   │
│   ├── order/                   # Sipariş modülü
│   │   ├── order.controller.ts  # Sipariş endpoint'leri
│   │   ├── order.service.ts     # Sipariş iş mantığı
│   │   ├── order-endpoint.service.ts  # Walmart Order API
│   │   └── order.module.ts
│   │
│   ├── schedule/                # Zamanlanmış görevler
│   │   ├── fetch-order-schedule.service.ts
│   │   └── schedule.module.ts
│   │
│   ├── database/
│   │   └── entities/            # TypeORM entity'leri
│   │       ├── user.entity.ts
│   │       ├── order.entity.ts
│   │       ├── order-line.entity.ts
│   │       ├── order-line-status.entity.ts
│   │       ├── charge.entity.ts
│   │       └── shipping-info.entity.ts
│   │
│   ├── common/
│   │   ├── dto/                 # Data Transfer Objects
│   │   ├── exceptions/          # Özel exception'lar
│   │   ├── filters/             # Exception filter'ları
│   │   ├── interceptors/        # Logging interceptor
│   │   └── utils/               # Yardımcı fonksiyonlar
│   │
│   ├── app.module.ts            # Ana modül
│   └── main.ts                  # Giriş noktası + /mp-walmart prefix middleware
│
├── docs/                        # Dokümantasyon
├── deploy.sh                    # Otomatik deployment scripti
├── Dockerfile                   # Multi-stage Docker build
├── .env.example                 # Örnek environment dosyası
├── package.json
└── tsconfig.json
```

---

## 2. Sistem Mimarisi

### 2.1 Production Topolojisi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (us-east-1)                          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Route 53 - Private Hosted Zone                     │  │
│  │                        byelabel.internal                              │  │
│  │                                                                       │  │
│  │  walmart.byelabel.internal ──────► Internal ALB                       │  │
│  │  amazon.byelabel.internal  ──────► Internal ALB                       │  │
│  │  ebay.byelabel.internal    ──────► Internal ALB                       │  │
│  │  etsy.byelabel.internal    ──────► Internal ALB                       │  │
│  │  shopify.byelabel.internal ──────► Internal ALB                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │            Internal ALB (internal-byelabel-main-internal-lb)          │  │
│  │                                                                       │  │
│  │  Listener Rules:                                                      │  │
│  │    /mp-walmart/*  ──────► mp-walmart-tg (Port 8082)                  │  │
│  │    /mp-amazon/*   ──────► mp-amazon-tg                               │  │
│  │    /mp-ebay/*     ──────► mp-ebay-tg                                 │  │
│  │    ...                                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     ECS Fargate Cluster (byelabel)                    │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │             mp-walmart-service (NestJS Container)               │ │  │
│  │  │                                                                 │ │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │ │  │
│  │  │  │  Middleware: Strip /mp-walmart prefix                     │ │ │  │
│  │  │  │  /mp-walmart/api/Auth ──► /api/Auth                      │ │ │  │
│  │  │  │  /mp-walmart/swagger  ──► /swagger                       │ │ │  │
│  │  │  └───────────────────────────────────────────────────────────┘ │ │  │
│  │  │                              │                                 │ │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │ │  │
│  │  │  │  NestJS Application (Port 8082)                          │ │ │  │
│  │  │  │  ├── AuthController    /api/Auth                         │ │ │  │
│  │  │  │  ├── OrderController   /api/Order                        │ │ │  │
│  │  │  │  ├── HealthController  /health-check                     │ │ │  │
│  │  │  │  └── ScheduleService   (10 min interval)                 │ │ │  │
│  │  │  └───────────────────────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    RDS PostgreSQL (SSL Enabled)                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   CloudWatch Logs (/ecs/mp-walmart-service)          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 External Entegrasyonlar

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SYSTEMS                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      │
│  │   ByeLabel   │      │   Walmart    │      │   Logstash   │      │
│  │   Backend    │      │     API      │      │   (Logging)  │      │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘      │
└─────────┼──────────────────────┼──────────────────────┼─────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WALMART SERVICE (NestJS)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Middleware Layer (Prefix Stripping)             │   │
│  │         /mp-walmart/api/Auth → /api/Auth                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     API Layer (Controllers)                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │AuthController│  │OrderController│  │HealthController│    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Service Layer (Business Logic)             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ AuthService  │  │ OrderService │  │ScheduleService│      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Endpoint Services (API Clients)            │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐         │   │
│  │  │ AuthEndpointService  │  │ OrderEndpointService │         │   │
│  │  └──────────────────────┘  └──────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Data Layer (TypeORM)                     │   │
│  │  ┌──────┐ ┌──────┐ ┌─────────┐ ┌────────┐ ┌──────────────┐  │   │
│  │  │ User │ │Order │ │OrderLine│ │ Charge │ │ ShippingInfo │  │   │
│  │  └──────┘ └──────┘ └─────────┘ └────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PostgreSQL (RDS)│
                    │  (SSL Enabled)   │
                    └──────────────────┘
```

---

## 3. AWS Altyapısı

### 3.1 Kaynak Envanteri

| Kaynak | Değer | Açıklama |
|--------|-------|----------|
| **AWS Account** | 140023362064 | ByeLabel AWS hesabı |
| **Region** | us-east-1 | N. Virginia |
| **ECS Cluster** | byelabel | Ortak cluster (tüm marketplace servisleri) |
| **ECS Service** | mp-walmart-service | Fargate service, desiredCount=1 |
| **ECR Repository** | mp-walmart-service | Docker image repository |
| **ALB** | internal-byelabel-main-internal-lb | Internal Application Load Balancer |
| **Target Group** | mp-walmart-tg | Port 8082, health check: /health-check |
| **Route 53 Zone** | byelabel.internal (Private) | Zone ID: Z00712722R9870ZSKU94N |
| **DNS Record** | walmart.byelabel.internal | A Record (Alias) → Internal ALB |
| **CloudWatch** | /ecs/mp-walmart-service | Log group |
| **SSL Certificate** | CN=byelabel.com | Amazon RSA 2048, expires April 2026 |

### 3.2 ECS Deployment Konfigürasyonu

```json
{
  "minimumHealthyPercent": 100,
  "maximumPercent": 200,
  "deploymentCircuitBreaker": {
    "enable": true,
    "rollback": true
  }
}
```

Bu konfigürasyon sayesinde:
- **Kesintisiz deployment**: Eski task her zaman ayakta kalır, yeni task paralel başlar
- **Otomatik rollback**: Yeni task health check'ten geçemezse önceki versiyona döner

### 3.3 DNS Yapısı

Tüm marketplace servisleri `byelabel.internal` private hosted zone altında aynı Internal ALB'ye yönlendirilir. ALB listener rule'ları ile path bazlı routing yapılır:

| DNS | ALB Path Rule | Target Group |
|-----|--------------|--------------|
| walmart.byelabel.internal | /mp-walmart/* | mp-walmart-tg |
| amazon.byelabel.internal | /mp-amazon/* | mp-amazon-tg |
| ebay.byelabel.internal | /mp-ebay/* | mp-ebay-tg |
| etsy.byelabel.internal | /mp-etsy/* | mp-etsy-tg |
| shopify.byelabel.internal | /mp-shopify/* | mp-shopify-tg |

---

## 4. Request Akışı ve Middleware

### 4.1 ALB → Uygulama Akışı

ALB, `/mp-walmart/*` path rule'u ile istekleri target group'a yönlendirir. Ancak ALB path rewriting desteklemediğinden, istekler uygulamaya `/mp-walmart/api/Auth` şeklinde gelir. NestJS uygulaması ise endpoint'leri `/api/Auth` olarak tanımlar.

Bu uyumsuzluğu çözmek için `main.ts`'de bir **Express middleware** kullanılır:

```typescript
// main.ts - ALB prefix stripping middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/mp-walmart')) {
    req.url = req.url.replace('/mp-walmart', '') || '/';
  }
  next();
});
```

### 4.2 Request Akışı (Detaylı)

```
1. Client → https://walmart.byelabel.internal/mp-walmart/api/Auth
2. Route 53 → walmart.byelabel.internal DNS çözümleme → ALB IP'leri
3. ALB → /mp-walmart/* rule ile mp-walmart-tg'ye yönlendir
4. Container → req.url: "/mp-walmart/api/Auth"
5. Middleware → req.url: "/api/Auth" (prefix stripped)
6. NestJS → AuthController.createNewAccount() çalışır
7. Response → Client'a döner
```

### 4.3 Health Check Akışları

| Kaynak | Path | Açıklama |
|--------|------|----------|
| **Docker HEALTHCHECK** | `http://localhost:8082/health-check` | Container'a direkt erişim, middleware'den geçmez |
| **Target Group** | `/health-check` | Container'a direkt erişim (ALB bypass) |
| **ALB üzerinden** | `/mp-walmart/health-check` | Middleware ile strip edilir → `/health-check` |

### 4.4 Veri Akışları

#### Hesap Oluşturma
```
1. Client → POST /mp-walmart/api/Auth (credentials)
2. Middleware → /api/Auth
3. AuthService → Walmart API (token validation)
4. AuthService → PostgreSQL (save user)
5. Response → Client
```

#### Sipariş Senkronizasyonu
```
1. Scheduler/API Call → OrderService.getOrdersAfterDate()
2. OrderService → AuthService (get access token)
3. OrderEndpointService → Walmart API (fetch orders)
4. OrderService → PostgreSQL (save/update orders)
5. OrderService → OrderToDTO Mapper
6. Response → Caller
```

#### Kargo Bildirimi
```
1. Client → POST /mp-walmart/api/Order/DispatchOrder
2. Middleware → /api/Order/DispatchOrder
3. OrderService → Validate shipping info
4. OrderService → Build Walmart shipment payload
5. OrderEndpointService → Walmart API (ship order)
6. Response → Client
```

---

## 5. Veritabanı Yapısı

### 5.1 Entity-Relationship Diyagramı

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ Id (PK)         │
│ UserId          │
│ StoreId         │
│ ClientId        │
│ ClientSecret    │
│ IsDeleted       │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     Orders      │       │  ShippingInfo   │
├─────────────────┤       ├─────────────────┤
│ Id (PK)         │───┐   │ Id (PK)         │
│ purchaseOrderId │   │   │ phone           │
│ customerOrderId │   │   │ estimatedDeliv..│
│ orderDate       │   │   │ methodCode      │
│ clientId        │   └──▶│ postalAddress_* │
│ storeId         │       │ Orderid (FK)    │
│ orderLocalUpd.. │       └─────────────────┘
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   OrderLines    │       │     Charges     │
├─────────────────┤       ├─────────────────┤
│ Id (PK)         │───┐   │ Id (PK)         │
│ lineNumber      │   │   │ chargeType      │
│ item_productName│   │   │ chargeName      │
│ item_sku        │   │   │ chargeAmount_*  │
│ orderLineQty_*  │   └──▶│ tax_*           │
│ fulfillment_*   │       │ OrderLineid(FK) │
│ Orderid (FK)    │       └─────────────────┘
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│OrderLineStatuses│
├─────────────────┤
│ Id (PK)         │
│ status          │
│ statusQuantity_*│
│ trackingInfo_*  │
│ OrderLineid(FK) │
└─────────────────┘
```

### 5.2 Önemli Notlar

> ⚠️ **Kolon İsimlendirme**: C# Entity Framework uyumluluğu için PascalCase kolon isimleri kullanılmaktadır (örn: `UserId`, `ClientId`, `IsDeleted`). TypeORM entity property'leri de PascalCase'dir ancak API response'ları camelCase'e dönüştürülür (C# ASP.NET Core JSON serializer davranışıyla uyumlu).

> ⚠️ **Senkronizasyon**: `DB_SYNCHRONIZE=false` ayarı ile TypeORM'un otomatik şema değişikliği yapması engellenmiştir.

> ⚠️ **SSL**: Production ortamında RDS bağlantısı SSL ile yapılır (`DB_SSL=true`).

---

## 6. API Endpoint'leri

### 6.1 Auth Endpoints

| Method | Endpoint | ALB Path | Açıklama |
|--------|----------|----------|----------|
| POST | `/api/Auth` | `/mp-walmart/api/Auth` | Hesap oluşturma/güncelleme |
| DELETE | `/api/Auth/:accountId/:storeId` | `/mp-walmart/api/Auth/:accountId/:storeId` | Hesap silme (soft delete) |

### 6.2 Order Endpoints

| Method | Endpoint | ALB Path | Açıklama |
|--------|----------|----------|----------|
| GET | `/api/Order/:accountId/:storeId/:lastUpdateDate` | `/mp-walmart/api/Order/...` | Siparişleri getir |
| GET | `/api/Order/GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate` | `/mp-walmart/api/Order/GetOrdersAfterDate/...` | Siparişleri getir (C# uyumlu alias) |
| GET | `/api/Order/GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId` | `/mp-walmart/api/Order/GetOrderFromApiByPurchaseOrderId/...` | Tek sipariş getir |
| POST | `/api/Order/DispatchOrder` | `/mp-walmart/api/Order/DispatchOrder` | Kargo bildirimi |

### 6.3 Health Endpoints

| Method | Endpoint | ALB Path | Açıklama |
|--------|----------|----------|----------|
| GET | `/health-check` | `/mp-walmart/health-check` | Servis sağlık kontrolü |
| GET | `/log-test` | `/mp-walmart/log-test` | Loglama testi |

---

## 7. Walmart API Entegrasyonu

### 7.1 Base URL
```
https://marketplace.walmartapis.com/v3
```

### 7.2 Kullanılan Endpoint'ler

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/token` | POST | OAuth2 access token alma |
| `/orders` | GET | Sipariş listesi |
| `/orders/{purchaseOrderId}` | GET | Tek sipariş detayı |
| `/orders/{purchaseOrderId}/shipping` | POST | Kargo bildirimi |

### 7.3 OAuth2 Token Alma

```
POST /token
Authorization: Basic base64(clientId:clientSecret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

### 7.4 Resmi Dokümantasyon

- **Developer Portal**: https://developer.walmart.com/
- **API Reference**: https://developer.walmart.com/api/us/mp/orders
- **Authentication Guide**: https://developer.walmart.com/api/us/mp/auth

---

## 8. Servis Katmanları

### 8.1 AuthService

**Sorumluluklar:** Kullanıcı CRUD işlemleri, Walmart credentials validasyonu, access token üretimi

**Önemli Metodlar:**
```typescript
createOrUpdateUser(dto: NewAccountDTO): Promise<User>
generateAccessToken(clientId: string, clientSecret: string): Promise<string>
delete(userId: string, storeId: string): Promise<string>
```

### 8.2 OrderService

**Sorumluluklar:** Sipariş senkronizasyonu, sipariş güncelleme, kargo bildirimi

**Önemli Metodlar:**
```typescript
getOrdersAfterDate(userId, storeId, lastUpdateDate): Promise<OrderDTO[]>
getOrderFromApiByPurchaseOrderId(accountId, storeId, purchaseOrderId): Promise<OrderDTO>
shipOrderItems(shippingDTO: ShippingDTO): Promise<void>
syncOrdersFromWalmart(user: User): Promise<void>
```

### 8.3 Endpoint Services

**AuthEndpointService:** Walmart OAuth2 token endpoint iletişimi

**OrderEndpointService:** Walmart sipariş endpoint'leri iletişimi, sayfalama yönetimi, hata yönetimi

---

## 9. Zamanlanmış Görevler

### 9.1 FetchOrderScheduleService

**Çalışma Prensibi:**
- Her 10 dakikada bir tetiklenir
- Tüm aktif kullanıcılar için sipariş senkronizasyonu yapar
- Batch işleme ile performans optimize edilir

**Konfigürasyon:**
```env
ENABLE_SCHEDULED_JOBS=true    # Production'da true
ORDER_SYNC_INTERVAL_MINUTES=10
BATCH_SIZE=5
MAX_CONCURRENCY=5
```

---

## 10. Hata Yönetimi

### 10.1 Custom Exception'lar

| Exception | HTTP Status | Açıklama |
|-----------|-------------|----------|
| `UserNotFoundException` | 400 | Kullanıcı bulunamadı (NOT: C# uyumluluğu için 400, 404 değil) |
| `BaseException` | 400 | Genel hata |

### 10.2 Walmart API Hata Yönetimi

- **Partner TERMINATED**: Kullanıcı otomatik soft delete yapılır
- **Rate Limit**: Retry mekanizması
- **Network Errors**: Hata loglanır, işlem devam eder

---

## 11. Loglama Stratejisi

### 11.1 CloudWatch Logs

Production ortamında loglar AWS CloudWatch'a yazılır:

```bash
# Canlı log takibi
aws logs tail /ecs/mp-walmart-service --since 5m --follow
```

### 11.2 TCP Loglama (Logstash)

```env
LOG_TCP_HOST=10.0.2.39
LOG_TCP_PORT=5045
```

---

## 12. Deployment

### 12.1 Deploy Script

Tek komutla deployment:

```bash
./deploy.sh
```

Script aşamaları:
1. ECR login
2. Docker build (unique timestamp tag)
3. ECR push
4. Task definition güncelleme (yeni image tag)
5. ECS service güncelleme
6. Deployment durumu takibi
7. Timeout durumunda uyarı (circuit breaker otomatik rollback yapar)

### 12.2 Manuel Deploy Adımları

```bash
# 1. ECR Login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 140023362064.dkr.ecr.us-east-1.amazonaws.com

# 2. Build
docker build --platform linux/amd64 -t mp-walmart-service .

# 3. Tag & Push
docker tag mp-walmart-service:latest 140023362064.dkr.ecr.us-east-1.amazonaws.com/mp-walmart-service:latest
docker push 140023362064.dkr.ecr.us-east-1.amazonaws.com/mp-walmart-service:latest

# 4. Deploy
aws ecs update-service --cluster byelabel --service mp-walmart-service --force-new-deployment
```

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 1.0.0 | 2025-01-23 | İlk versiyon - C# → NestJS migration |
| 1.1.0 | 2026-02-02 | AWS ECS Fargate deployment, Docker containerization |
| 1.2.0 | 2026-02-03 | ALB routing, middleware prefix stripping, deploy script, circuit breaker, Route 53 DNS |

---

*Bu döküman, Walmart Marketplace API Service'in teknik mimarisini açıklamaktadır.*
