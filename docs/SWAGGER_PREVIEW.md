# Walmart Service - Swagger API Önizlemesi

Bu döküman, uygulamayı çalıştırmadan Swagger UI'da göreceğiniz tüm endpoint'lerin önizlemesini sunar.

## Swagger UI Erişimi

| Ortam | URL |
|-------|-----|
| **Local** | `http://localhost:8082/swagger` |
| **Production** | `https://walmart.byelabel.internal/mp-walmart/swagger` |

> ⚠️ Production erişimi için VPN bağlantısı gereklidir. SSL sertifikası `byelabel.com` için düzenlendiğinden tarayıcı uyarısı alabilirsiniz.

---

## 📚 API Genel Bakış

**Başlık**: Walmart Marketplace API Service - Version 1.0.0

**Açıklama**: Walmart Marketplace API Integration Service. Bu servis, Walmart Marketplace API'si ile entegrasyon sağlayan bir NestJS uygulamasıdır. C# (.NET) servisinden migrate edilmiştir.

---

## 🏷️ Tag'ler

| Tag | Açıklama |
|-----|----------|
| **Auth** | Kullanıcı hesap yönetimi işlemleri |
| **Order** | Sipariş yönetimi işlemleri |
| **Health** | Servis sağlık kontrolü |

---

## 🔐 Auth Endpoints

### POST /api/Auth
*Production: `/mp-walmart/api/Auth`*

**Summary**: Create or Update Account

**Description**: Yeni bir Walmart hesabı oluşturur veya mevcut hesabı günceller. Client ID ve Client Secret ile Walmart API'ye bağlanarak credentials doğrulanır.

**Request Body** (application/json):
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
  "id": 1,
  "userId": "byel-account-123",
  "storeId": "byel-store-456",
  "clientId": "your-walmart-client-id",
  "clientSecret": "your-walmart-client-secret",
  "isDeleted": false
}
```

---

### DELETE /api/Auth/{accountId}/{storeId}
*Production: `/mp-walmart/api/Auth/{accountId}/{storeId}`*

**Summary**: Delete Account (Soft Delete)

**Parameters**:
| Name | In | Type | Required | Example |
|------|----|----- |----------|---------|
| accountId | path | string | ✓ | byel-account-123 |
| storeId | path | string | ✓ | byel-store-456 |

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Hesap başarıyla silindi (accountId döner) |
| 400 | Kullanıcı bulunamadı (UserNotFoundException) |

---

## 📦 Order Endpoints

### GET /api/Order/{accountId}/{storeId}/{lastUpdateDate}
*Production: `/mp-walmart/api/Order/{accountId}/{storeId}/{lastUpdateDate}`*

**Summary**: Belirtilen tarihten sonra güncellenen siparişleri getirir

**Parameters**:
| Name | In | Type | Required | Example |
|------|----|----- |----------|---------|
| accountId | path | string | ✓ | user123 |
| storeId | path | string | ✓ | store456 |
| lastUpdateDate | path | string | ✓ | 1704067200000 |

**Responses**:
| Status | Description |
|--------|-------------|
| 200 | Sipariş listesi (OrderDTO[]) |
| 400 | Kullanıcı bulunamadı (UserNotFoundException) |

---

### GET /api/Order/GetOrdersAfterDate/{accountId}/{storeId}/{lastUpdateDate}
*Production: `/mp-walmart/api/Order/GetOrdersAfterDate/{accountId}/{storeId}/{lastUpdateDate}`*

**Summary**: Siparişleri getir (C# uyumlu alternatif endpoint)

Yukarıdaki endpoint ile aynı işlevi görür. C# servisindeki URL yapısıyla uyumluluk için korunmuştur.

---

### GET /api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}
*Production: `/mp-walmart/api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}`*

**Summary**: Walmart API'den belirli bir siparişi getirir

**Parameters**:
| Name | In | Type | Required | Example |
|------|----|----- |----------|---------|
| accountId | path | string | ✓ | user123 |
| storeId | path | string | ✓ | store456 |
| purchaseOrderId | path | string | ✓ | 1234567890123 |

---

### POST /api/Order/DispatchOrder
*Production: `/mp-walmart/api/Order/DispatchOrder`*

**Summary**: Siparişi kargoya verir

**Request Body (Bilinen Kargo)**:
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

**Request Body (Bilinmeyen Kargo)**:
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
| 400 | Hata (UserNotFoundException, BaseException) |

---

## 🏥 Health Endpoints

### GET /health-check
*Production: `/mp-walmart/health-check`*

**Summary**: Health Check - Servis çalışır durumda mı kontrol eder.

**Response**: `200 OK` (boş body)

---

### GET /log-test
*Production: `/mp-walmart/log-test`*

**Summary**: Log Test - Loglama sistemini test eder.

**Response**: `200 OK`

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

### UserResponseDTO
```typescript
{
  id: number;           // Veritabanı ID
  userId: string;       // ByeLabel Account ID
  storeId: string;      // ByeLabel Store ID
  clientId: string;     // Walmart Client ID
  clientSecret: string; // Walmart Client Secret
  isDeleted: boolean;   // Soft delete flag
}
```

> **Not**: Veritabanı PascalCase (Id, UserId, StoreId) kullanır ancak API response'ları camelCase (id, userId, storeId) döner. Bu, C# ASP.NET Core'un JSON serializer davranışıyla uyumludur.

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
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ▼ Auth - Kullanıcı hesap yönetimi işlemleri                             │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ POST   /api/Auth             Create or Update Account              │  │
│ │ DELETE /api/Auth/{accountId}/{storeId}  Delete Account             │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ▼ Order - Sipariş yönetimi işlemleri                                    │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ GET    /api/Order/{accountId}/{storeId}/{lastUpdateDate}           │  │
│ │ GET    /api/Order/GetOrdersAfterDate/{...}                         │  │
│ │ GET    /api/Order/GetOrderFromApiByPurchaseOrderId/{...}           │  │
│ │ POST   /api/Order/DispatchOrder                                    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ▼ Health - Servis sağlık kontrolü                                       │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ GET    /health-check         Health Check                          │  │
│ │ GET    /log-test             Log Test                              │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Schemas                                                                  │
│ ├── NewAccountDTO                                                        │
│ ├── UserResponseDTO                                                      │
│ ├── ShippingDTO                                                          │
│ └── ShippingLineDTO                                                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Bu önizleme, gerçek Swagger UI'ın yapısını göstermektedir. Canlı Swagger UI'a erişmek için: `https://walmart.byelabel.internal/mp-walmart/swagger` (VPN gerekli)*
