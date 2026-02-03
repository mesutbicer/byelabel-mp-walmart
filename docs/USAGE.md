# Walmart Service - Kullanım Rehberi

## 📋 İçindekiler

1. [Giriş](#1-giriş)
2. [Swagger UI Kullanımı](#2-swagger-ui-kullanımı)
3. [Hesap Yönetimi](#3-hesap-yönetimi)
4. [Sipariş İşlemleri](#4-sipariş-işlemleri)
5. [Kargo Bildirimi](#5-kargo-bildirimi)
6. [Hata Kodları](#6-hata-kodları)
7. [Best Practices](#7-best-practices)

---

## 1. Giriş

### 1.1 Servis Hakkında

Walmart Marketplace API Service, Walmart mağazanızı yönetmenizi sağlayan bir entegrasyon servisidir. Temel yetenekleri:

- **Mağaza Bağlantısı**: Walmart hesabınızı sisteme entegre edin
- **Sipariş Senkronizasyonu**: Siparişlerinizi otomatik olarak çekin
- **Kargo Takibi**: Gönderimlerinizi Walmart'a bildirin

### 1.2 Temel Kavramlar

| Kavram | Açıklama |
|--------|----------|
| **accountId** | ByeLabel sistemindeki hesap ID'niz |
| **storeId** | ByeLabel sistemindeki mağaza ID'niz |
| **clientId** | Walmart Partner hesabından alınan Client ID |
| **clientSecret** | Walmart Partner hesabından alınan Client Secret |
| **purchaseOrderId** | Walmart'ın sipariş numarası |

### 1.3 API Base URL

| Ortam | URL |
|-------|-----|
| **Development** | `http://localhost:8082` |
| **Production** | `http://walmart.byelabel.internal` |

---

## 2. Swagger UI Kullanımı

### 2.1 Swagger'a Erişim

Swagger UI, tüm API endpoint'lerini görüntülemenizi ve test etmenizi sağlar.

**URL**: `http://localhost:8082/swagger`

### 2.2 Swagger Arayüzü

```
┌─────────────────────────────────────────────────────────────────┐
│ Walmart Marketplace API Service                                 │
│ Version: 1.0.0                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ▼ Auth - Kullanıcı hesap yönetimi işlemleri                    │
│   GET  /health-check       Health Check                         │
│   GET  /log-test           Log Test                             │
│   POST /api/Auth           Create or Update Account             │
│   DELETE /api/Auth/{...}   Delete Account                       │
│                                                                 │
│ ▼ Order - Sipariş yönetimi işlemleri                           │
│   GET  /api/Order/{...}    Siparişleri getir                   │
│   GET  /api/Order/Get...   Siparişleri getir (alternatif)      │
│   GET  /api/Order/Get...   Tek sipariş getir                   │
│   POST /api/Order/Dis...   Kargo bildirimi                     │
│                                                                 │
│ ▼ Health - Servis sağlık kontrolü                              │
│   GET  /health-check       Health Check                         │
│   GET  /log-test           Log Test                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Endpoint Test Etme

1. İlgili endpoint'e tıklayın
2. **"Try it out"** butonuna basın
3. Parametreleri doldurun
4. **"Execute"** butonuna basın
5. Yanıtı inceleyin

---

## 3. Hesap Yönetimi

### 3.1 Yeni Hesap Oluşturma

Walmart mağazanızı sisteme entegre etmek için hesap oluşturmanız gerekir.

**Swagger'da**: `Auth > POST /api/Auth > Try it out`

#### Request

```http
POST /api/Auth
Content-Type: application/json

{
  "accountId": "byel-account-123",
  "storeId": "byel-store-456",
  "clientId": "your-walmart-client-id",
  "clientSecret": "your-walmart-client-secret"
}
```

#### Response (Başarılı)

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

#### Olası Senaryolar

| Senaryo | Davranış |
|---------|----------|
| Yeni kullanıcı | Yeni kayıt oluşturulur |
| Aynı accountId + storeId | Credentials güncellenir |
| Aynı accountId, farklı storeId | Store ID güncellenir |
| Farklı accountId, aynı clientId | **Hata**: Store başka kullanıcıda |

### 3.2 Hesap Silme (Soft Delete)

**Swagger'da**: `Auth > DELETE /api/Auth/{accountId}/{storeId} > Try it out`

#### Request

```http
DELETE /api/Auth/byel-account-123/byel-store-456
```

#### Response

```json
"byel-account-123"
```

> ⚠️ **Not**: Bu işlem kullanıcıyı kalıcı olarak silmez. Sadece `IsDeleted` flag'ini `true` yapar. Geçmiş veriler korunur.

### 3.3 Health Check

Servisin çalışır durumda olduğunu kontrol edin.

**Swagger'da**: `Health > GET /health-check > Try it out`

```http
GET /health-check
```

**Response**: `200 OK` (boş body)

---

## 4. Sipariş İşlemleri

### 4.1 Siparişleri Getirme

Belirli bir tarihten sonra güncellenen tüm siparişleri çekin.

**Swagger'da**: `Order > GET /api/Order/GetOrdersAfterDate/{...} > Try it out`

#### Request

```http
GET /api/Order/GetOrdersAfterDate/{accountId}/{storeId}/{lastUpdateDate}
```

**Parametreler:**

| Parametre | Tip | Açıklama | Örnek |
|-----------|-----|----------|-------|
| accountId | string | ByeLabel hesap ID | `byel-account-123` |
| storeId | string | ByeLabel mağaza ID | `byel-store-456` |
| lastUpdateDate | number | Unix timestamp (ms) | `1704067200000` |

> 💡 **İpucu**: `lastUpdateDate` için şu anki zamanın Unix timestamp değerini kullanın: `Date.now()`

#### Response

```json
[
  {
    "accountId": "byel-account-123",
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

### 4.2 İlk Senkronizasyon

Hesap oluşturulduktan sonra ilk sipariş çağrısında:

1. Sistem otomatik olarak **son 30 günün siparişlerini** Walmart'tan çeker
2. Veritabanına kaydeder
3. Sonraki çağrılarda sadece güncellenen siparişler döner

### 4.3 Tek Sipariş Getirme

Belirli bir siparişin güncel durumunu Walmart API'den çekin.

**Swagger'da**: `Order > GET /api/Order/GetOrderFromApiByPurchaseOrderId/{...} > Try it out`

#### Request

```http
GET /api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}
```

**Parametreler:**

| Parametre | Tip | Açıklama | Örnek |
|-----------|-----|----------|-------|
| accountId | string | ByeLabel hesap ID | `byel-account-123` |
| storeId | string | ByeLabel mağaza ID | `byel-store-456` |
| purchaseOrderId | string | Walmart sipariş numarası | `1234567890123` |

#### Response

```json
{
  "accountId": "byel-account-123",
  "purchaseOrderId": "1234567890123",
  "customerOrderId": "C001234567",
  "orderDate": "2024-01-15T10:30:00.000Z",
  "shippingInfo": { ... },
  "orderLines": [ ... ],
  "totalAmount": 39.98,
  "status": "awaiting"
}
```

### 4.4 Sipariş Durumları

| Durum | Açıklama | Walmart Durumları |
|-------|----------|-------------------|
| `awaiting` | Beklemede | Created, Acknowledged |
| `shipped` | Kargoya verildi | Shipped |
| `cancelled` | İptal edildi | Cancelled |

---

## 5. Kargo Bildirimi

### 5.1 Kargo Gönderimi Bildirme

Siparişi Walmart'a kargoya verildi olarak bildirin.

**Swagger'da**: `Order > POST /api/Order/DispatchOrder > Try it out`

#### Request

```http
POST /api/Order/DispatchOrder
Content-Type: application/json

{
  "orderId": "1234567890123",
  "userId": "byel-account-123",
  "storeId": "byel-store-456",
  "shippingLines": [
    {
      "orderItemId": "1",
      "orderItemQuantity": 2,
      "shipDateTime": 1704153600000,
      "carrierName": "UPS",
      "methodCode": "Standard",
      "trackingNumber": "1Z999AA10123456784",
      "trackingURL": ""
    }
  ]
}
```

### 5.2 Kargo Firmaları

#### Bilinen Kargo Firmaları (trackingNumber gerekli)

| Firma | carrierName Değeri |
|-------|-------------------|
| UPS | `UPS` |
| FedEx | `FedEx` |
| USPS | `USPS` |
| DHL | `DHL` |
| OnTrac | `OnTrac` |
| LS (LaserShip) | `LS` |
| Asendia | `Asendia` |
| China Post | `China Post` |
| YunExpress | `YunExpress` |
| 4PX | `4PX` |
| Canada Post | `Canada Post` |
| Japan Post | `Japan Post` |
| Deutsche Post | `Deutsche Post` |
| SF Express | `SF Express` |

#### Bilinmeyen Kargo Firmaları (trackingURL gerekli)

Yukarıdaki listede olmayan kargo firmaları için:

```json
{
  "carrierName": "MyLocalCarrier",
  "trackingNumber": "",
  "trackingURL": "https://mycarrier.com/track/ABC123"
}
```

### 5.3 Shipping Method Kodları

| Kod | Açıklama |
|-----|----------|
| `Standard` | Standart kargo (3-5 iş günü) |
| `Express` | Hızlı kargo (1-2 iş günü) |
| `OneDay` | Bir günde teslimat |
| `Freight` | Yük taşımacılığı (büyük ürünler) |
| `WhiteGlove` | Özel teslimat hizmeti |
| `Value` | Ekonomik kargo (5-8 iş günü) |

### 5.4 Kargo Bildirimi Kuralları

| Kargo Firması Tipi | Gerekli Alan |
|-------------------|--------------|
| Bilinen (UPS, FedEx, vb.) | `trackingNumber` zorunlu |
| Bilinmeyen | `trackingURL` zorunlu |

> ⚠️ **Önemli**: Her iki koşuldan biri sağlanmazsa hata alırsınız:
> ```json
> {
>   "name": "BaseException",
>   "message": "Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required."
> }
> ```

### 5.5 Başarılı Kargo Bildirimi

```http
HTTP/1.1 200 OK
```

Boş body ile 200 OK döner. Sipariş durumu Walmart'ta "Shipped" olarak güncellenir.

---

## 6. Hata Kodları

### 6.1 HTTP Durum Kodları

| Kod | Açıklama |
|-----|----------|
| `200 OK` | İşlem başarılı |
| `400 Bad Request` | İstek hatası (validation, business rule) |
| `500 Internal Server Error` | Sunucu hatası |

### 6.2 Özel Hatalar

#### UserNotFoundException

```json
{
  "name": "UserNotFoundException",
  "message": "User Not Found."
}
```

**Neden**: Belirtilen accountId/storeId ile kullanıcı bulunamadı veya silinmiş.

**Çözüm**: Doğru accountId/storeId kullandığınızdan emin olun veya yeni hesap oluşturun.

#### BaseException

```json
{
  "name": "BaseException",
  "message": "Error description here"
}
```

**Neden**: Genel hata - mesaja bakarak anlayabilirsiniz.

**Yaygın Nedenler:**
- `"Access Token not reacheable"`: Walmart credentials hatalı
- `"Walmart store is in use by another user."`: Mağaza başka hesapta kayıtlı
- `"Order Not Found"`: Sipariş bulunamadı
- `"Partner is TERMINATED"`: Walmart hesabı kapatılmış

### 6.3 Walmart API Hataları

```json
{
  "name": "BaseException",
  "message": "{\"errors\":[{\"code\":\"INVALID_REQUEST_CONTENT\",\"description\":\"...\"}]}"
}
```

Walmart API'den gelen hatalar JSON formatında mesaj içinde yer alır.

---

## 7. Best Practices

### 7.1 Sipariş Senkronizasyonu

1. **İlk Kurulum**: Hesap oluşturduktan sonra ilk sipariş çağrısı yapın
2. **Düzenli Polling**: 10-15 dakikada bir sipariş güncellemesi çekin
3. **lastUpdateDate**: Son başarılı senkronizasyon tarihini saklayın

```javascript
// Örnek: Son senkronizasyon tarihini kaydetme
let lastSync = Date.now();

async function syncOrders() {
  const orders = await fetch(`/api/Order/GetOrdersAfterDate/${accountId}/${storeId}/${lastSync}`);
  lastSync = Date.now();
  return orders;
}
```

### 7.2 Hata Yönetimi

```javascript
try {
  const response = await fetch('/api/Order/DispatchOrder', {
    method: 'POST',
    body: JSON.stringify(shippingData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (error.name === 'UserNotFoundException') {
      // Kullanıcıyı yeniden authorize et
      await reauthorize();
    } else if (error.message.includes('Partner is TERMINATED')) {
      // Walmart hesabı kapatılmış - kullanıcıyı bilgilendir
      notifyUser('Walmart hesabınız kapatılmış');
    }
  }
} catch (e) {
  console.error('Network error:', e);
}
```

### 7.3 Rate Limiting

- Walmart API'nin rate limit'leri vardır
- Çok sık istek yapmaktan kaçının
- Hata durumunda exponential backoff uygulayın

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      
      if (response.status === 429) { // Too Many Requests
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
    }
  }
}
```

### 7.4 Güvenlik

- Client Secret'ı asla frontend'de saklamayın
- HTTPS kullanın (production'da zorunlu)
- API key'leri environment variable'larda tutun

---

## Ek Kaynaklar

- **Swagger UI**: `http://localhost:8082/swagger`
- **Swagger JSON**: `http://localhost:8082/swagger-json`
- **Health Check**: `http://localhost:8082/health-check`
- **Mimari Döküman**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Kurulum Rehberi**: [INSTALLATION.md](./INSTALLATION.md)

---

*Bu kullanım rehberi, Walmart Service API'sinin nasıl kullanılacağını açıklamaktadır. Güncellemeler ve sorular için development ekibi ile iletişime geçin.*
