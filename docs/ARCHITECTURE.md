# Walmart Marketplace API Service - Mimari Döküman

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Sistem Mimarisi](#2-sistem-mimarisi)
3. [Veritabanı Yapısı](#3-veritabanı-yapısı)
4. [API Endpoint'leri](#4-api-endpointleri)
5. [Walmart API Entegrasyonu](#5-walmart-api-entegrasyonu)
6. [Servis Katmanları](#6-servis-katmanları)
7. [Zamanlanmış Görevler](#7-zamanlanmış-görevler)
8. [Hata Yönetimi](#8-hata-yönetimi)
9. [Loglama Stratejisi](#9-loglama-stratejisi)

---

## 1. Proje Özeti

### 1.1 Amaç
Bu proje, **Walmart Marketplace API** ile entegrasyon sağlayan bir servis uygulamasıdır. Temel işlevleri:

- **Walmart mağaza bağlantısı**: Satıcıların Walmart hesaplarını sisteme entegre etmesi
- **Sipariş senkronizasyonu**: Walmart'tan siparişlerin otomatik çekilmesi
- **Kargo bildirimi**: Siparişlerin kargoya verildi olarak işaretlenmesi

### 1.2 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Runtime** | Node.js 20+ |
| **Framework** | NestJS 10 |
| **Database** | PostgreSQL 14+ |
| **ORM** | TypeORM |
| **API Docs** | Swagger/OpenAPI |
| **HTTP Client** | Axios |
| **Scheduler** | @nestjs/schedule |

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
│   └── main.ts                  # Uygulama giriş noktası
│
├── docs/                        # Dokümantasyon
├── .env.example                 # Örnek environment dosyası
├── package.json
└── tsconfig.json
```

---

## 2. Sistem Mimarisi

### 2.1 Genel Bakış

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
                    │    PostgreSQL    │
                    │    Database      │
                    └──────────────────┘
```

### 2.2 Veri Akışı

#### Hesap Oluşturma Akışı
```
1. ByeLabel Backend → POST /api/Auth (credentials)
2. AuthService → Walmart API (token validation)
3. AuthService → PostgreSQL (save user)
4. Response → ByeLabel Backend
```

#### Sipariş Senkronizasyon Akışı
```
1. Scheduler/API Call → OrderService.getOrdersAfterDate()
2. OrderService → AuthService (get access token)
3. OrderEndpointService → Walmart API (fetch orders)
4. OrderService → PostgreSQL (save/update orders)
5. OrderService → OrderToDTO Mapper
6. Response → Caller
```

#### Kargo Bildirimi Akışı
```
1. ByeLabel Backend → POST /api/Order/DispatchOrder
2. OrderService → Validate shipping info
3. OrderService → Build Walmart shipment payload
4. OrderEndpointService → Walmart API (ship order)
5. Response → ByeLabel Backend
```

---

## 3. Veritabanı Yapısı

### 3.1 Entity-Relationship Diyagramı

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

### 3.2 Tablo Detayları

#### User (Kullanıcılar)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | int (PK, auto) | Birincil anahtar |
| UserId | varchar | ByeLabel hesap ID |
| StoreId | varchar | ByeLabel mağaza ID |
| ClientId | varchar | Walmart Client ID |
| ClientSecret | varchar | Walmart Client Secret |
| IsDeleted | boolean | Soft delete flag |

#### Orders (Siparişler)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | int (PK, auto) | Birincil anahtar |
| purchaseOrderId | varchar | Walmart sipariş numarası |
| customerOrderId | varchar | Müşteri sipariş numarası |
| orderDate | varchar | Sipariş tarihi (ISO) |
| clientId | varchar | İlişkili Walmart Client ID |
| storeId | varchar | İlişkili ByeLabel Store ID |
| orderLocalUpdateDate | bigint | Son senkronizasyon tarihi (Unix ms) |

#### OrderLines (Sipariş Kalemleri)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | int (PK, auto) | Birincil anahtar |
| lineNumber | varchar | Kalem numarası |
| item_productName | varchar | Ürün adı |
| item_sku | varchar | SKU kodu |
| item_imageUrl | varchar | Ürün görseli URL |
| item_weight_value | double | Ağırlık değeri |
| item_weight_unit | varchar | Ağırlık birimi |
| orderLineQuantity_amount | varchar | Sipariş miktarı |
| fulfillment_shipMethod | varchar | Kargo yöntemi |
| Orderid | int (FK) | Sipariş referansı |

#### OrderLineStatuses (Kalem Durumları)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | int (PK, auto) | Birincil anahtar |
| status | varchar | Durum (Created, Shipped, Cancelled) |
| statusQuantity_amount | varchar | Durum miktarı |
| trackingInfo_shipDateTime | bigint | Gönderim zamanı |
| trackingInfo_carrierName_carrier | varchar | Kargo firması |
| trackingInfo_trackingNumber | varchar | Takip numarası |
| OrderLineid | int (FK) | Sipariş kalemi referansı |

#### Charges (Ücretler)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | int (PK, auto) | Birincil anahtar |
| chargeType | varchar | Ücret tipi (PRODUCT, SHIPPING) |
| chargeName | varchar | Ücret adı |
| chargeAmount_currency | varchar | Para birimi |
| chargeAmount_amount | double | Tutar |
| tax_taxAmount_amount | double | Vergi tutarı |
| OrderLineid | int (FK) | Sipariş kalemi referansı |

#### ShippingInfo (Teslimat Bilgileri)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | int (PK, auto) | Birincil anahtar |
| phone | varchar | Telefon numarası |
| estimatedDeliveryDate | bigint | Tahmini teslimat tarihi |
| methodCode | varchar | Teslimat yöntemi |
| postalAddress_name | varchar | Alıcı adı |
| postalAddress_address1 | varchar | Adres satırı 1 |
| postalAddress_city | varchar | Şehir |
| postalAddress_state | varchar | Eyalet/İl |
| postalAddress_postalCode | varchar | Posta kodu |
| postalAddress_country | varchar | Ülke kodu |
| Orderid | int (FK) | Sipariş referansı |

### 3.3 Önemli Notlar

> ⚠️ **Kolon İsimlendirme**: C# Entity Framework uyumluluğu için PascalCase kolon isimleri kullanılmaktadır (örn: `UserId`, `ClientId`, `IsDeleted`).

> ⚠️ **Senkronizasyon**: `DB_SYNCHRONIZE=false` ayarı ile TypeORM'un otomatik şema değişikliği yapması engellenmiştir. Şema değişiklikleri için migration kullanılmalıdır.

---

## 4. API Endpoint'leri

### 4.1 Auth Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health-check` | Servis sağlık kontrolü |
| GET | `/log-test` | Loglama testi |
| POST | `/api/Auth` | Hesap oluşturma/güncelleme |
| DELETE | `/api/Auth/:accountId/:storeId` | Hesap silme (soft delete) |

### 4.2 Order Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/Order/:accountId/:storeId/:lastUpdateDate` | Siparişleri getir |
| GET | `/api/Order/GetOrdersAfterDate/:accountId/:storeId/:lastUpdateDate` | Siparişleri getir (alternatif) |
| GET | `/api/Order/GetOrderFromApiByPurchaseOrderId/:accountId/:storeId/:purchaseOrderId` | Tek sipariş getir |
| POST | `/api/Order/DispatchOrder` | Kargo bildirimi |

### 4.3 Response Formatları

#### Başarılı Yanıt
```json
{
  "data": [...],
  "statusCode": 200
}
```

#### Hata Yanıtı
```json
{
  "name": "BaseException",
  "message": "Error description"
}
```

---

## 5. Walmart API Entegrasyonu

### 5.1 Base URL
```
https://marketplace.walmartapis.com/v3
```

### 5.2 Kullanılan Endpoint'ler

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/token` | POST | OAuth2 access token alma |
| `/orders` | GET | Sipariş listesi |
| `/orders/{purchaseOrderId}` | GET | Tek sipariş detayı |
| `/orders/{purchaseOrderId}/shipping` | POST | Kargo bildirimi |

### 5.3 Gerekli Header'lar

| Header | Açıklama |
|--------|----------|
| `WM_SEC.ACCESS_TOKEN` | OAuth2 access token |
| `WM_QOS.CORRELATION_ID` | Benzersiz istek ID (UUID) |
| `WM_SVC.NAME` | Servis adı |
| `Authorization` | Basic auth (sadece /token için) |

### 5.4 OAuth2 Token Alma

```
POST /token
Authorization: Basic base64(clientId:clientSecret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

**Yanıt:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### 5.5 Resmi Dokümantasyon Linkleri

- **Developer Portal**: https://developer.walmart.com/
- **API Reference**: https://developer.walmart.com/api/us/mp/orders
- **Authentication Guide**: https://developer.walmart.com/api/us/mp/auth

---

## 6. Servis Katmanları

### 6.1 AuthService

**Sorumluluklar:**
- Kullanıcı CRUD işlemleri
- Walmart credentials validasyonu
- Access token üretimi

**Önemli Metodlar:**
```typescript
createOrUpdateUser(dto: NewAccountDTO): Promise<User>
generateAccessToken(clientId: string, clientSecret: string): Promise<string>
delete(userId: string, storeId: string): Promise<string>
```

### 6.2 OrderService

**Sorumluluklar:**
- Sipariş senkronizasyonu
- Sipariş güncelleme
- Kargo bildirimi

**Önemli Metodlar:**
```typescript
getOrdersAfterDate(userId, storeId, lastUpdateDate): Promise<OrderDTO[]>
getOrderFromApiByPurchaseOrderId(accountId, storeId, purchaseOrderId): Promise<OrderDTO>
shipOrderItems(shippingDTO: ShippingDTO): Promise<void>
syncOrdersFromWalmart(user: User): Promise<void>
```

### 6.3 Endpoint Services

**AuthEndpointService:**
- Walmart OAuth2 token endpoint iletişimi

**OrderEndpointService:**
- Walmart sipariş endpoint'leri iletişimi
- Sayfalama (pagination) yönetimi
- Hata yönetimi

---

## 7. Zamanlanmış Görevler

### 7.1 FetchOrderScheduleService

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

### 7.2 Batch İşleme Akışı

```
1. Tüm aktif kullanıcıları al
2. BATCH_SIZE gruplarına böl
3. Her batch için paralel işlem (MAX_CONCURRENCY)
4. Her kullanıcı için syncOrdersFromWalmart() çağır
5. Hataları logla, diğer kullanıcılara devam et
```

---

## 8. Hata Yönetimi

### 8.1 Custom Exception'lar

```typescript
// UserNotFoundException - Kullanıcı bulunamadı
class UserNotFoundException extends Error {
  name = 'UserNotFoundException';
}

// BaseException - Genel hata
class BaseException extends Error {
  name = 'BaseException';
}
```

### 8.2 Global Exception Filter

Tüm hatalar `HttpExceptionFilter` tarafından yakalanır ve standart formatta döndürülür:

```json
{
  "name": "ExceptionType",
  "message": "Error message"
}
```

### 8.3 Walmart API Hata Yönetimi

- **Partner TERMINATED**: Kullanıcı otomatik soft delete yapılır
- **Rate Limit**: Retry mekanizması (TODO)
- **Network Errors**: Hata loglanır, işlem devam eder

---

## 9. Loglama Stratejisi

### 9.1 Log Seviyeleri

| Seviye | Kullanım |
|--------|----------|
| `error` | Hatalar, exception'lar |
| `warn` | Uyarılar, beklenmeyen durumlar |
| `log` | Normal operasyonlar |
| `debug` | Debug bilgileri |

### 9.2 TCP Loglama (Logstash)

Loglar TCP üzerinden Logstash'e gönderilir:

```env
LOG_TCP_HOST=10.0.2.39
LOG_TCP_PORT=5045
```

### 9.3 Log Formatı

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "context": "OrderService",
  "message": "Fetched 50 orders for user user123"
}
```

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 1.0.0 | 2025-01-23 | İlk versiyon - C# → NestJS migration |

---

*Bu döküman, Walmart Marketplace API Service'in teknik mimarisini açıklamaktadır. Güncellemeler için lütfen development ekibi ile iletişime geçin.*
