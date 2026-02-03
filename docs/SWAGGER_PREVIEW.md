# Walmart Service - Swagger API Önizlemesi

Bu döküman, uygulamayı çalıştırmadan Swagger UI'da göreceğiniz tüm endpoint'lerin önizlemesini sunar.

**Swagger UI URL**: `http://localhost:8082/swagger`

---

## 📚 API Genel Bakış

### Başlık
**Walmart Marketplace API Service** - Version 1.0.0

### Açıklama
```
Walmart Marketplace API Integration Service

Bu servis, Walmart Marketplace API'si ile entegrasyon sağlayan bir NestJS uygulamasıdır.

### Temel Özellikler
- Authentication: Walmart API erişimi için OAuth2 token yönetimi
- Order Management: Sipariş senkronizasyonu ve yönetimi
- Order Dispatch: Kargo bilgisi gönderimi
- Scheduled Jobs: Otomatik sipariş senkronizasyonu

### API Endpoints
- /api/Auth - Kullanıcı hesap yönetimi
- /api/Order - Sipariş işlemleri
- /health-check - Servis sağlık kontrolü

### Kimlik Doğrulama
Walmart API erişimi için gerekli bilgiler:
- Client ID: Walmart Partner hesabından alınan client ID
- Client Secret: Walmart Partner hesabından alınan client secret
```

### Sunucular
| Ortam | URL |
|-------|-----|
| Development | `http://localhost:8082` |
| Production | `http://walmart.byelabel.internal` |

---

## 🏷️ Tag'ler

| Tag | Açıklama |
|-----|----------|
| **Auth** | Kullanıcı hesap yönetimi işlemleri |
| **Order** | Sipariş yönetimi işlemleri |
| **Health** | Servis sağlık kontrolü |

---

## 🔐 Auth Endpoints

### GET /health-check
**Summary**: Health Check

**Description**: Servisin çalışır durumda olup olmadığını kontrol eder.

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Servis çalışıyor |
| 400 | Servis hatası |

---

### GET /log-test
**Summary**: Log Test

**Description**: Loglama sistemini test eder.

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Log testi başarılı |
| 400 | Log testi başarısız |

---

### POST /api/Auth
**Summary**: Create or Update Account

**Description**:
```
Yeni bir Walmart hesabı oluşturur veya mevcut hesabı günceller.

İşlem Akışı:
1. Client ID ve Client Secret ile Walmart API'ye bağlanılır
2. Credentials doğrulanır (access token alınarak)
3. Kullanıcı bilgileri veritabanında saklanır

Senaryolar:
- Yeni kullanıcı: Yeni kayıt oluşturulur
- Aynı accountId ve storeId: Credentials güncellenir
- Aynı accountId, farklı storeId: Store güncellenir
- Farklı accountId, aynı clientId: Hata döner (store başka kullanıcıda)
```

**Request Body** (application/json):
```typescript
interface NewAccountDTO {
  accountId: string;    // ByeLabel Account ID
  storeId: string;      // ByeLabel Store ID
  clientId: string;     // Walmart Client ID
  clientSecret: string; // Walmart Client Secret
}
```

**Example Request**:
```json
{
  "accountId": "byel-account-123",
  "storeId": "byel-store-456",
  "clientId": "your-walmart-client-id",
  "clientSecret": "your-walmart-client-secret"
}
```

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Hesap başarıyla oluşturuldu/güncellendi |
| 400 | Geçersiz credentials veya store başka kullanıcıda |

**Example Response (200)**:
```json
{
  "Id": 1,
  "UserId": "byel-account-123",
  "StoreId": "byel-store-456",
  "ClientId": "your-walmart-client-id",
  "ClientSecret": "your-walmart-client-secret",
  "IsDeleted": false
}
```

---

### DELETE /api/Auth/{accountId}/{storeId}
**Summary**: Delete Account

**Description**:
```
Belirtilen Walmart hesabını soft delete yapar.

NOT: Bu işlem kullanıcıyı tamamen silmez, sadece IsDeleted flag'ini true yapar.
Bu sayede geçmiş siparişler ve veriler korunur.
```

**Parameters**:
| Name | In | Type | Required | Description |
|------|----|----- |----------|-------------|
| accountId | path | string | ✓ | ByeLabel Account ID |
| storeId | path | string | ✓ | ByeLabel Store ID |

**Example**: `DELETE /api/Auth/byel-account-123/byel-store-456`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Hesap başarıyla silindi |
| 400 | Kullanıcı bulunamadı veya işlem hatası |

**Example Response (200)**:
```json
"byel-account-123"
```

---

## 📦 Order Endpoints

### GET /api/Order/{accountId}/{storeId}/{lastUpdateDate}
**Summary**: Belirtilen tarihten sonra güncellenen siparişleri getirir

**Description**:
```
Bu endpoint, belirtilen tarihten sonra güncellenen tüm siparişleri döner.

İlk çağrıda: Eğer kullanıcının hiç siparişi yoksa, 
Walmart API'den son 30 günün siparişleri otomatik olarak senkronize edilir.

lastUpdateDate parametresi: Unix timestamp (milisaniye) formatında olmalıdır.

Örnek: 1704067200000 (1 Ocak 2024 00:00:00 UTC)
```

**Parameters**:
| Name | In | Type | Required | Description | Example |
|------|----|----- |----------|-------------|---------|
| accountId | path | string | ✓ | Kullanıcı hesap ID'si | user123 |
| storeId | path | string | ✓ | Walmart mağaza ID'si | store456 |
| lastUpdateDate | path | string | ✓ | Unix timestamp (ms) | 1704067200000 |

**Example**: `GET /api/Order/user123/store456/1704067200000`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Sipariş listesi başarıyla döndürüldü |
| 400 | Kullanıcı bulunamadı veya hata oluştu |

**Example Response (200)**:
```json
[
  {
    "accountId": "user123",
    "purchaseOrderId": "1234567890123",
    "customerOrderId": "C001234567",
    "orderDate": "2024-01-15T10:30:00.000Z",
    "shippingInfo": {
      "phone": "5551234567",
      "estimatedDeliveryDate": 1705420800000,
      "methodCode": "Standard",
      "postalAddress": {
        "name": "John Doe",
        "address1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      }
    },
    "orderLines": [
      {
        "lineNumber": "1",
        "item": {
          "productName": "Widget A",
          "sku": "WGT-001",
          "imageUrl": "https://..."
        },
        "quantity": 2,
        "unitPrice": 19.99,
        "totalPrice": 39.98,
        "status": "Created"
      }
    ],
    "totalAmount": 39.98,
    "status": "awaiting"
  }
]
```

**Example Error Response (400)**:
```json
{
  "name": "UserNotFoundException",
  "message": "User Not Found."
}
```

---

### GET /api/Order/GetOrdersAfterDate/{accountId}/{storeId}/{lastUpdateDate}
**Summary**: Belirtilen tarihten sonra güncellenen siparişleri getirir

**Description**:
```
Bu endpoint, belirtilen tarihten sonra güncellenen tüm siparişleri döner.

İlk çağrıda: Eğer kullanıcının hiç siparişi yoksa, 
Walmart API'den son 30 günün siparişleri otomatik olarak senkronize edilir.

Sipariş Durumları:
- awaiting: Sipariş beklemede (Created, Acknowledged)
- shipped: Sipariş kargoya verildi
- cancelled: Sipariş iptal edildi
```

*Aynı parametreler ve yanıtlar yukarıdaki endpoint ile aynıdır.*

---

### GET /api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}
**Summary**: Walmart API'den belirli bir siparişi getirir

**Description**:
```
Bu endpoint, Walmart API'den belirli bir Purchase Order ID ile siparişi çeker 
ve veritabanına kaydeder/günceller.

Kullanım Senaryosu:
- Belirli bir siparişin güncel durumunu almak istediğinizde
- Sipariş detaylarını yenilemek istediğinizde

purchaseOrderId: Walmart tarafından atanan benzersiz sipariş numarasıdır.
```

**Parameters**:
| Name | In | Type | Required | Description | Example |
|------|----|----- |----------|-------------|---------|
| accountId | path | string | ✓ | Kullanıcı hesap ID'si | user123 |
| storeId | path | string | ✓ | Walmart mağaza ID'si | store456 |
| purchaseOrderId | path | string | ✓ | Walmart Purchase Order ID | 1234567890123 |

**Example**: `GET /api/Order/GetOrderFromApiByPurchaseOrderId/user123/store456/1234567890123`

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Sipariş başarıyla döndürüldü |
| 400 | Kullanıcı bulunamadı veya hata oluştu |

---

### POST /api/Order/DispatchOrder
**Summary**: Siparişi kargoya verir

**Description**:
```
Bu endpoint, siparişi Walmart'a kargoya verildi olarak bildirir.

Önemli Kurallar:
1. Bilinen kargo firması kullanıyorsanız: carrierName + trackingNumber zorunludur
2. Bilinmeyen kargo firması kullanıyorsanız: carrierName + trackingURL zorunludur

Desteklenen Kargo Firmaları (Bilinen):
UPS, USPS, FedEx, DHL, Airborne, OnTrac, LS (LaserShip), UDS, UPSMI, FDX, PILOT, 
ESTES, SAIA, FDS Express, Seko Worldwide, HIT Delivery, FEDEXSP, RL Carriers, 
China Post, YunExpress, 4PX, GLS, OSM Worldwide, FIRST MILE, CEVA, India Post, 
SF Express, Canada Post, Japan Post, Deutsche Post, Asendia, ve daha fazlası...

Method Kodları:
- Standard: Standart kargo
- Express: Hızlı kargo
- OneDay: Bir günde teslimat
- Freight: Yük taşımacılığı
- WhiteGlove: Özel teslimat hizmeti
- Value: Ekonomik kargo
```

**Request Body** (application/json):
```typescript
interface ShippingDTO {
  orderId: string;      // Purchase Order ID veya Customer Order ID
  userId: string;       // ByeLabel Account ID
  storeId: string;      // ByeLabel Store ID
  shippingLines: ShippingLineDTO[];
}

interface ShippingLineDTO {
  orderItemId: string;       // Sipariş kalemi ID
  orderItemQuantity: number; // Miktar
  shipDateTime: number;      // Gönderim zamanı (Unix timestamp ms)
  carrierName: string;       // Kargo firması adı
  methodCode: string;        // Kargo yöntemi kodu
  trackingNumber: string;    // Takip numarası (bilinen kargo için)
  trackingURL: string;       // Takip URL'i (bilinmeyen kargo için)
}
```

**Example Request (Bilinen Kargo)**:
```json
{
  "orderId": "1234567890123",
  "userId": "user123",
  "storeId": "store456",
  "shippingLines": [
    {
      "orderItemId": "1",
      "orderItemQuantity": 2,
      "shipDateTime": 1704067200000,
      "carrierName": "UPS",
      "methodCode": "Standard",
      "trackingNumber": "1Z999AA10123456784",
      "trackingURL": ""
    }
  ]
}
```

**Example Request (Bilinmeyen Kargo)**:
```json
{
  "orderId": "1234567890123",
  "userId": "user123",
  "storeId": "store456",
  "shippingLines": [
    {
      "orderItemId": "1",
      "orderItemQuantity": 2,
      "shipDateTime": 1704067200000,
      "carrierName": "MyLocalCarrier",
      "methodCode": "Standard",
      "trackingNumber": "",
      "trackingURL": "https://mycarrier.com/track/ABC123"
    }
  ]
}
```

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Sipariş başarıyla kargoya verildi |
| 400 | Hata oluştu |

**Example Error Responses (400)**:
```json
{
  "name": "UserNotFoundException",
  "message": "User Not Found."
}
```

```json
{
  "name": "BaseException",
  "message": "Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required."
}
```

```json
{
  "name": "BaseException",
  "message": "Order Not Found"
}
```

---

## 🏥 Health Endpoints

### GET /health-check
**Summary**: Health Check

**Description**: Servisin çalışır durumda olup olmadığını kontrol eder.

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Servis çalışıyor |

---

### GET /log-test
**Summary**: Log Test

**Description**: Loglama sistemini test eder.

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Log testi başarılı |

---

## 📋 Schema Tanımları

### NewAccountDTO
```typescript
{
  accountId: string;    // ByeLabel Account ID
  storeId: string;      // ByeLabel Store ID
  clientId: string;     // Walmart Client ID
  clientSecret: string; // Walmart Client Secret
}
```

### User
```typescript
{
  Id: number;           // Veritabanı ID
  UserId: string;       // ByeLabel Account ID
  StoreId: string;      // ByeLabel Store ID
  ClientId: string;     // Walmart Client ID
  ClientSecret: string; // Walmart Client Secret
  IsDeleted: boolean;   // Soft delete flag
}
```

### OrderDTO
```typescript
{
  accountId: string;
  purchaseOrderId: string;
  customerOrderId: string;
  orderDate: string;
  shippingInfo: ShippingInfoDTO;
  orderLines: OrderLineDTO[];
  totalAmount: number;
  status: 'awaiting' | 'shipped' | 'cancelled';
}
```

### ShippingDTO
```typescript
{
  orderId: string;
  userId: string;
  storeId: string;
  shippingLines: ShippingLineDTO[];
}
```

### ShippingLineDTO
```typescript
{
  orderItemId: string;
  orderItemQuantity: number;
  shipDateTime: number;
  carrierName: string;
  methodCode: string;
  trackingNumber: string;
  trackingURL: string;
}
```

---

## 🔗 Swagger UI Ekran Görüntüsü (Simüle)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔵 Walmart Marketplace API Service                                       │
│ Version: 1.0.0                                                           │
│ http://localhost:8082/swagger                                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Servers: [Development - http://localhost:8082 ▼]                        │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                          │
│ ▼ Auth - Kullanıcı hesap yönetimi işlemleri                             │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ GET    /health-check         Health Check                          │  │
│ │ GET    /log-test             Log Test                              │  │
│ │ POST   /api/Auth             Create or Update Account              │  │
│ │ DELETE /api/Auth/{accountId}/{storeId}  Delete Account             │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ▼ Order - Sipariş yönetimi işlemleri                                    │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ GET    /api/Order/{accountId}/{storeId}/{lastUpdateDate}           │  │
│ │        Belirtilen tarihten sonra güncellenen siparişleri getirir   │  │
│ │                                                                    │  │
│ │ GET    /api/Order/GetOrdersAfterDate/{accountId}/{storeId}/...     │  │
│ │        Belirtilen tarihten sonra güncellenen siparişleri getirir   │  │
│ │                                                                    │  │
│ │ GET    /api/Order/GetOrderFromApiByPurchaseOrderId/{...}           │  │
│ │        Walmart API'den belirli bir siparişi getirir                │  │
│ │                                                                    │  │
│ │ POST   /api/Order/DispatchOrder                                    │  │
│ │        Siparişi kargoya verir                                      │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ▼ Health - Servis sağlık kontrolü                                       │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ GET    /health-check         Health Check                          │  │
│ │ GET    /log-test             Log Test                              │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                          │
│ Schemas                                                                  │
│ ├── NewAccountDTO                                                        │
│ ├── User                                                                 │
│ ├── OrderDTO                                                             │
│ ├── ShippingDTO                                                          │
│ └── ShippingLineDTO                                                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Bu önizleme, gerçek Swagger UI'ın yapısını göstermektedir. Uygulama çalıştırıldığında `http://localhost:8082/swagger` adresinden interaktif dokümantasyona erişebilirsiniz.*
