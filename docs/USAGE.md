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
| **Production** | `https://walmart.byelabel.internal/mp-walmart` |
| **Production (ALB)** | `https://internal-byelabel-main-internal-lb-300788144.us-east-1.elb.amazonaws.com/mp-walmart` |

> ⚠️ **VPN Gerekli**: Production URL'lerine erişim için VPN bağlantısı gereklidir.

> ⚠️ **SSL Uyarısı**: SSL sertifikası `byelabel.com` için düzenlenmiştir. Tarayıcıda "Not Secure" uyarısı alabilirsiniz. Postman kullanıyorsanız Settings → General → SSL certificate verification → **OFF** yapın.

### 1.4 URL Yapısı

Production ortamında tüm endpoint'ler `/mp-walmart` prefix'i ile erişilir:

| Local | Production |
|-------|------------|
| `/health-check` | `/mp-walmart/health-check` |
| `/swagger` | `/mp-walmart/swagger` |
| `/api/Auth` | `/mp-walmart/api/Auth` |
| `/api/Order/...` | `/mp-walmart/api/Order/...` |

Bu prefix ALB routing için kullanılır ve uygulama tarafındaki middleware ile otomatik olarak kaldırılır.

---

## 2. Swagger UI Kullanımı

### 2.1 Swagger'a Erişim

| Ortam | URL |
|-------|-----|
| **Local** | `http://localhost:8082/swagger` |
| **Production** | `https://walmart.byelabel.internal/mp-walmart/swagger` |

### 2.2 Endpoint Test Etme

1. İlgili endpoint'e tıklayın
2. **"Try it out"** butonuna basın
3. Parametreleri doldurun
4. **"Execute"** butonuna basın
5. Yanıtı inceleyin

### 2.3 Postman Collection

Tüm endpoint'leri Postman'da test etmek için hazır collection mevcuttur:

```
docs/Walmart-Marketplace-API.postman_collection.json
```

Postman'a import edin ve `baseUrl` değişkenini ortamınıza göre ayarlayın.

---

## 3. Hesap Yönetimi

### 3.1 Yeni Hesap Oluşturma

#### Request

```http
POST /mp-walmart/api/Auth
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
  "id": 1,
  "userId": "byel-account-123",
  "storeId": "byel-store-456",
  "clientId": "your-walmart-client-id",
  "clientSecret": "your-walmart-client-secret",
  "isDeleted": false
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

#### Request

```http
DELETE /mp-walmart/api/Auth/byel-account-123/byel-store-456
```

#### Response

```json
"byel-account-123"
```

> ⚠️ **Not**: Bu işlem kullanıcıyı kalıcı olarak silmez. Sadece `IsDeleted` flag'ini `true` yapar.

### 3.3 Health Check

```http
GET /mp-walmart/health-check
```

**Response**: `200 OK` (boş body)

**curl ile test:**
```bash
# Local
curl http://localhost:8082/health-check

# Production (VPN gerekli)
curl -k https://walmart.byelabel.internal/mp-walmart/health-check
```

---

## 4. Sipariş İşlemleri

### 4.1 Siparişleri Getirme

#### Request

```http
GET /mp-walmart/api/Order/GetOrdersAfterDate/{accountId}/{storeId}/{lastUpdateDate}
```

**Parametreler:**

| Parametre | Tip | Açıklama | Örnek |
|-----------|-----|----------|-------|
| accountId | string | ByeLabel hesap ID | `byel-account-123` |
| storeId | string | ByeLabel mağaza ID | `byel-store-456` |
| lastUpdateDate | number | Unix timestamp (ms) | `1704067200000` |

> 💡 **İpucu**: İlk çağrıda eğer kullanıcının hiç siparişi yoksa, Walmart API'den son 30 günün siparişleri otomatik olarak senkronize edilir.

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
          "sku": "WGT-001"
        },
        "quantity": 2,
        "unitPrice": 19.99,
        "status": "Created"
      }
    ]
  }
]
```

### 4.2 Tek Sipariş Getirme

#### Request

```http
GET /mp-walmart/api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}
```

Bu endpoint Walmart API'den güncel sipariş bilgisini çeker ve veritabanına kaydeder/günceller.

### 4.3 Sipariş Durumları

| Durum | Açıklama |
|-------|----------|
| `awaiting` | Sipariş beklemede (Created, Acknowledged) |
| `shipped` | Sipariş kargoya verildi |
| `cancelled` | Sipariş iptal edildi |

---

## 5. Kargo Bildirimi

### 5.1 Kargo Gönderimi Bildirme

#### Request

```http
POST /mp-walmart/api/Order/DispatchOrder
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

UPS, FedEx, USPS, DHL, OnTrac, LS (LaserShip), Asendia, China Post, YunExpress, 4PX, Canada Post, Japan Post, Deutsche Post, SF Express ve daha fazlası.

#### Bilinmeyen Kargo Firmaları (trackingURL gerekli)

```json
{
  "carrierName": "MyLocalCarrier",
  "trackingNumber": "",
  "trackingURL": "https://mycarrier.com/track/ABC123"
}
```

### 5.3 Method Kodları

| Kod | Açıklama |
|-----|----------|
| `Standard` | Standart kargo (3-5 iş günü) |
| `Express` | Hızlı kargo (1-2 iş günü) |
| `OneDay` | Bir günde teslimat |
| `Freight` | Yük taşımacılığı |
| `WhiteGlove` | Özel teslimat hizmeti |
| `Value` | Ekonomik kargo (5-8 iş günü) |

### 5.4 Kurallar

| Kargo Tipi | Gerekli Alan |
|------------|--------------|
| Bilinen (UPS, FedEx, vb.) | `trackingNumber` zorunlu |
| Bilinmeyen | `trackingURL` zorunlu |

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

> **Not**: C# uyumluluğu için bu hata HTTP 400 döner (404 değil).

#### BaseException
```json
{
  "name": "BaseException",
  "message": "Error description"
}
```

**Yaygın Mesajlar:**
- `"Access Token not reacheable"` → Walmart credentials hatalı
- `"Walmart store is in use by another user."` → Mağaza başka hesapta
- `"Order Not Found"` → Sipariş bulunamadı
- `"Partner is TERMINATED"` → Walmart hesabı kapatılmış
- `"Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required."` → Kargo bilgisi eksik

---

## 7. Best Practices

### 7.1 Sipariş Senkronizasyonu

1. **İlk Kurulum**: Hesap oluşturduktan sonra ilk sipariş çağrısı yapın (son 30 gün otomatik çekilir)
2. **Otomatik Sync**: Scheduled job her 10 dakikada bir sipariş güncellemesi yapar
3. **Manuel Sync**: `lastUpdateDate` parametresi ile belirli tarihten sonraki siparişleri çekin

### 7.2 Hata Yönetimi

```javascript
try {
  const response = await fetch('/mp-walmart/api/Order/DispatchOrder', {
    method: 'POST',
    body: JSON.stringify(shippingData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (error.name === 'UserNotFoundException') {
      // Kullanıcıyı yeniden authorize et
    } else if (error.message.includes('Partner is TERMINATED')) {
      // Walmart hesabı kapatılmış
    }
  }
} catch (e) {
  console.error('Network error:', e);
}
```

### 7.3 Güvenlik

- Client Secret'ı asla frontend'de saklamayın
- Production ortamında HTTPS zorunludur (ALB üzerinden)
- API key'leri environment variable'larda tutun
- VPN bağlantısı olmadan production API'ye erişilemez

---

## Ek Kaynaklar

- **Swagger UI (Local)**: `http://localhost:8082/swagger`
- **Swagger UI (Production)**: `https://walmart.byelabel.internal/mp-walmart/swagger`
- **Postman Collection**: `docs/Walmart-Marketplace-API.postman_collection.json`
- **Mimari Döküman**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Kurulum Rehberi**: [INSTALLATION.md](./INSTALLATION.md)

---

*Bu kullanım rehberi, Walmart Service API'sinin nasıl kullanılacağını açıklamaktadır.*
