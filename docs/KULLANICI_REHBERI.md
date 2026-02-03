# 📖 Walmart NestJS Servisi - Detaylı Kullanıcı Rehberi

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** Ocak 2026  
> **Uyumluluk:** C# (.NET) projesinden birebir migrasyon

---

## 📋 İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [API Endpoint'leri](#2-api-endpointleri)
3. [Hesap Yönetimi](#3-hesap-yönetimi)
4. [Sipariş İşlemleri](#4-sipariş-işlemleri)
5. [Kargo Gönderimi](#5-kargo-gönderimi)
6. [Hata Kodları ve Çözümleri](#6-hata-kodları-ve-çözümleri)
7. [C# Uyumluluk Notları](#7-c-uyumluluk-notları)
8. [En İyi Uygulamalar](#8-en-iyi-uygulamalar)
9. [Sık Sorulan Sorular](#9-sık-sorulan-sorular)

---

## 1. Genel Bakış

### 1.1 Servis Amacı

Bu NestJS servisi, Walmart Marketplace API ile entegrasyon sağlayarak:

- ✅ Walmart satıcı hesaplarının yönetimi
- ✅ Sipariş senkronizasyonu ve takibi
- ✅ Kargo gönderim bildirimleri
- ✅ Otomatik sipariş güncelleme (10 dakikada bir)

işlemlerini gerçekleştirir.

### 1.2 Mimari Yapı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ByeLabel      │────▶│  NestJS Service │────▶│  Walmart API    │
│   (İstemci)     │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   Veritabanı    │
                        └─────────────────┘
```

### 1.3 Swagger Dokümantasyonu

Tüm API endpoint'leri interaktif olarak test edilebilir:

```
URL: http://localhost:3000/api
```

---

## 2. API Endpoint'leri

### 2.1 Endpoint Özet Tablosu

| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/health-check` | Servis sağlık kontrolü |
| `GET` | `/log-test` | Log sistemi testi |
| `POST` | `/api/Auth` | Hesap oluştur/güncelle |
| `DELETE` | `/api/Auth/{accountId}/{storeId}` | Hesap sil (soft delete) |
| `GET` | `/api/Order/{accountId}/{storeId}/{lastUpdateDate}` | Siparişleri getir |
| `GET` | `/api/Order/GetOrdersAfterDate/{accountId}/{storeId}/{lastUpdateDate}` | Siparişleri getir (alternatif) |
| `GET` | `/api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}` | Tek sipariş getir |
| `POST` | `/api/Order/DispatchOrder` | Kargo gönder |

### 2.2 Temel URL

```
Geliştirme: http://localhost:3000
Production:  https://your-domain.com
```

---

## 3. Hesap Yönetimi

### 3.1 Yeni Hesap Oluşturma

**Endpoint:** `POST /api/Auth`

**İstek Gövdesi:**

```json
{
  "accountId": "byelabel-account-123",
  "storeId": "byelabel-store-456",
  "clientId": "walmart-client-id",
  "clientSecret": "walmart-client-secret"
}
```

**Başarılı Yanıt (200 OK):**

```json
{
  "Id": 1,
  "UserId": "byelabel-account-123",
  "StoreId": "byelabel-store-456",
  "ClientId": "walmart-client-id",
  "ClientSecret": "walmart-client-secret",
  "IsDeleted": false
}
```

**Olası Hatalar:**

| Hata | Neden | Çözüm |
|------|-------|-------|
| `ClientID/ClientSecret cannot be null` | Eksik kimlik bilgisi | Tüm alanları doldurun |
| `Access Token not reacheable` | Geçersiz Walmart credentials | Client ID/Secret'ı kontrol edin |
| `Walmart store is in use by another user` | Store başka hesapta kayıtlı | Farklı clientId kullanın |

### 3.2 Hesap Senaryoları

#### Senaryo 1: Yeni Kullanıcı
- İlk kez kayıt yapılıyorsa yeni kayıt oluşturulur.

#### Senaryo 2: Yeniden Yetkilendirme (Aynı Account + Store)
- Mevcut kullanıcı güncellenir, `IsDeleted = false` yapılır.

#### Senaryo 3: Yeni Mağaza (Aynı Account, Farklı Store)
- Mevcut kullanıcının `StoreId`'si güncellenir.

#### Senaryo 4: Store Çakışması (Farklı Account, Aynı ClientId)
- **HATA!** "Walmart store is in use by another user."

### 3.3 Hesap Silme (Soft Delete)

**Endpoint:** `DELETE /api/Auth/{accountId}/{storeId}`

**Örnek:**

```bash
curl -X DELETE http://localhost:3000/api/Auth/byelabel-account-123/byelabel-store-456
```

**Yanıt:**

```json
"byelabel-account-123"
```

> ⚠️ **NOT:** Bu işlem kullanıcıyı tamamen silmez, sadece `IsDeleted = true` yapar. Geçmiş veriler korunur.

---

## 4. Sipariş İşlemleri

### 4.1 Siparişleri Getirme

**Endpoint:** `GET /api/Order/{accountId}/{storeId}/{lastUpdateDate}`

**Parametreler:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `accountId` | string | ByeLabel hesap ID |
| `storeId` | string | ByeLabel mağaza ID |
| `lastUpdateDate` | long | Unix timestamp (milisaniye) |

**Örnek Çağrı:**

```bash
# Tüm siparişler (lastUpdateDate = 0)
curl http://localhost:3000/api/Order/account-123/store-456/0

# Son 24 saatteki siparişler
curl http://localhost:3000/api/Order/account-123/store-456/1704067200000
```

**Yanıt Formatı:**

```json
[
  {
    "orderId": "ORD-001",
    "accountId": "account-123",
    "status": "awaiting",
    "purchaseOrderId": "1234567890123",
    "customerOrderId": "CUST-001",
    "orderDate": 1704067200000,
    "shippingInfo": {
      "phone": "555-1234",
      "estimatedDeliveryDate": 1704326400000,
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
          "productName": "Blue T-Shirt",
          "sku": "SKU-001"
        },
        "quantity": {
          "unitOfMeasurement": "EACH",
          "amount": "2"
        },
        "charges": [
          {
            "chargeType": "PRODUCT",
            "amount": 29.99,
            "currency": "USD"
          }
        ],
        "statuses": [
          {
            "status": "Created",
            "quantity": "2"
          }
        ]
      }
    ]
  }
]
```

### 4.2 İlk Senkronizasyon Davranışı

⚠️ **ÖNEMLİ:** Bir kullanıcının ilk sipariş sorgulamasında:

1. Sistem veritabanında sipariş olup olmadığını kontrol eder
2. Sipariş yoksa otomatik olarak **son 30 günün siparişleri** Walmart API'den çekilir
3. Bu işlem birkaç saniye sürebilir

### 4.3 Sipariş Durumları

| Durum | Açıklama |
|-------|----------|
| `Created` | Sipariş oluşturuldu |
| `Acknowledged` | Sipariş onaylandı |
| `Shipped` | Kargoya verildi |
| `Delivered` | Teslim edildi |
| `Cancelled` | İptal edildi |

### 4.4 Tek Sipariş Getirme (API'den)

**Endpoint:** `GET /api/Order/GetOrderFromApiByPurchaseOrderId/{accountId}/{storeId}/{purchaseOrderId}`

Bu endpoint:
1. Walmart API'den siparişi çeker
2. Veritabanına kaydeder/günceller
3. Güncel veriyi döndürür

**Kullanım Senaryosu:** Belirli bir siparişin anlık durumunu almak istediğinizde.

---

## 5. Kargo Gönderimi

### 5.1 Kargo Bildirimi

**Endpoint:** `POST /api/Order/DispatchOrder`

### 5.2 Bilinen Kargo Firmaları

Aşağıdaki firmalar için **trackingNumber zorunludur**:

| Kod | Firma |
|-----|-------|
| `UPS` | UPS |
| `USPS` | USPS |
| `FedEx` | FedEx |
| `DHL` | DHL |
| `Asendia` | Asendia |

### 5.3 Bilinmeyen Kargo Firmaları

Yukarıdaki listede olmayan firmalar için **trackingURL zorunludur**.

### 5.4 İstek Örnekleri

#### Örnek 1: Bilinen Kargo (UPS)

```json
{
  "orderId": "1234567890123",
  "userId": "account-123",
  "storeId": "store-456",
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

#### Örnek 2: Bilinmeyen Kargo

```json
{
  "orderId": "1234567890123",
  "userId": "account-123",
  "storeId": "store-456",
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

### 5.5 Method Kodları

| Kod | Açıklama |
|-----|----------|
| `Standard` | Standart kargo (3-5 iş günü) |
| `Express` | Hızlı kargo (1-2 iş günü) |
| `OneDay` | Ertesi gün teslimat |
| `Freight` | Yük taşımacılığı |
| `WhiteGlove` | Özel teslimat hizmeti |
| `Value` | Ekonomik kargo |

### 5.6 Kargo Kuralları

```
┌─────────────────────────────────────────────────────────────┐
│                    KARGO VALİDASYON KURALLARI               │
├─────────────────────────────────────────────────────────────┤
│  Bilinen Kargo (UPS, FedEx, DHL, USPS, Asendia)            │
│  ├── carrierName: "UPS" (veya diğerleri)                   │
│  └── trackingNumber: ZORUNLU ✓                             │
├─────────────────────────────────────────────────────────────┤
│  Bilinmeyen Kargo (Diğer tüm firmalar)                     │
│  ├── carrierName: "MyLocalCarrier"                         │
│  └── trackingURL: ZORUNLU ✓                                │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ HATA: Kurallara uymayan istek 400 hatası döndürür:     │
│  "Known Carrier Name - TrackingNumber or Unknown Carrier   │
│   Name - Tracking Url pairs are required."                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Hata Kodları ve Çözümleri

### 6.1 Hata Formatları

Bu servis iki farklı hata formatı kullanır (C# uyumlu):

#### Format 1: Plain String (CreateNewAccount)

```json
"Hata mesajı burada"
```

#### Format 2: Obje (Diğer Endpoint'ler)

```json
{
  "Message": "User Not Found.",
  "code": "USER_NOT_FOUND"
}
```

### 6.2 Hata Kodları Tablosu

| Kod | HTTP Status | Açıklama | Çözüm |
|-----|-------------|----------|-------|
| `USER_NOT_FOUND` | 400 | Kullanıcı bulunamadı | accountId/storeId kontrol edin |
| `GENERAL` | 400 | Genel hata | Hata mesajını inceleyin |
| - | 400 | Validation hatası | İstek parametrelerini kontrol edin |
| - | 404 | Endpoint bulunamadı | URL'i kontrol edin |
| - | 500 | Sunucu hatası | Logları inceleyin |

### 6.3 Yaygın Hatalar ve Çözümleri

#### "User Not Found"

```json
{
  "Message": "User Not Found.",
  "code": "USER_NOT_FOUND"
}
```

**Neden:** accountId veya storeId hatalı, ya da kullanıcı silinmiş.

**Çözüm:** 
1. accountId ve storeId'yi kontrol edin
2. `POST /api/Auth` ile kullanıcıyı yeniden oluşturun

#### "Order Not Found"

```json
{
  "Message": "Order Not Found",
  "code": "GENERAL"
}
```

**Neden:** orderId veritabanında bulunamadı.

**Çözüm:**
1. orderId'yi kontrol edin (purchaseOrderId veya customerOrderId olabilir)
2. Önce siparişleri senkronize edin

#### "Tracking pairs required"

```json
{
  "Message": "Known Carrier Name - TrackingNumber or Unknown Carrier Name - Tracking Url pairs are required.",
  "code": "GENERAL"
}
```

**Neden:** Kargo kurallarına uyulmamış.

**Çözüm:**
- Bilinen kargo ise: trackingNumber ekleyin
- Bilinmeyen kargo ise: trackingURL ekleyin

---

## 7. C# Uyumluluk Notları

### 7.1 Birebir Uyumlu Alanlar

| Özellik | C# | NestJS | Durum |
|---------|-----|--------|-------|
| Route prefix | `/api/Auth`, `/api/Order` | Aynı | ✅ |
| HTTP kodları | 200, 400 | Aynı | ✅ |
| Hata formatı | `{Message, code}` | Aynı | ✅ |
| UserNotFoundException | 400 Bad Request | 400 Bad Request | ✅ |
| Tablo isimleri | PascalCase (User), lowercase (Orders) | Aynı | ✅ |
| FK isimleri | `shippingInfoid`, `Orderid`, `OrderLineid` | Aynı | ✅ |

### 7.2 Timestamp Davranışı

C# projesiyle aynı davranış korunmuştur:

- `orderLocalUpdateDate`: milisaniye cinsinden Unix timestamp
- İlk senkronizasyon: Son 30 gün

### 7.3 Response Uyumluluğu

- **CreateNewAccount hatası:** Plain string döner (obje değil)
- **Diğer hatalar:** `{Message: "...", code: "..."}` formatında
- **Message** büyük M ile başlar (C# serialization uyumu)

---

## 8. En İyi Uygulamalar

### 8.1 Polling Stratejisi

```
✅ DOĞRU:
- Son güncelleme tarihini saklayın
- Her sorguda lastUpdateDate parametresini kullanın
- Gereksiz veri transferini önleyin

❌ YANLIŞ:
- Her seferinde lastUpdateDate=0 göndermek
- Çok sık sorgu yapmak (1 dakikadan az aralık)
```

### 8.2 Hata Yönetimi

```javascript
// Örnek: Hata yönetimi
async function getOrders(accountId, storeId, lastUpdateDate) {
  try {
    const response = await fetch(`/api/Order/${accountId}/${storeId}/${lastUpdateDate}`);
    
    if (!response.ok) {
      const error = await response.json();
      
      if (error.code === 'USER_NOT_FOUND') {
        // Kullanıcıyı yeniden kaydet
        await reauthorizeUser();
        return getOrders(accountId, storeId, lastUpdateDate);
      }
      
      throw new Error(error.Message || error);
    }
    
    return response.json();
  } catch (error) {
    console.error('Sipariş hatası:', error);
    throw error;
  }
}
```

### 8.3 Rate Limiting

Walmart API rate limit'lere sahiptir:

- **Önerilen:** 1-2 saniye aralıklarla istek
- **Batch işlemler:** 5 paralel istek maksimum
- **Retry stratejisi:** Exponential backoff

### 8.4 Güvenlik Önerileri

1. **Credentials:** Client ID/Secret'ı environment variable olarak saklayın
2. **HTTPS:** Production'da mutlaka HTTPS kullanın
3. **Input validation:** Tüm girdileri doğrulayın
4. **Loglama:** Hassas verileri loglamayın

---

## 9. Sık Sorulan Sorular

### S1: İlk senkronizasyon neden uzun sürüyor?

**C:** İlk sorguda son 30 günün siparişleri Walmart API'den çekilir. Bu işlem sipariş sayısına göre birkaç saniye sürebilir.

### S2: Silinen kullanıcı tekrar eklenebilir mi?

**C:** Evet. Aynı credentials ile `POST /api/Auth` çağrısı yapıldığında `IsDeleted = false` yapılır ve hesap tekrar aktif olur.

### S3: Kargo firması listede yoksa ne yapmalıyım?

**C:** `carrierName` olarak firmanın adını yazın ve `trackingURL` alanını doldurun. Walmart bilinmeyen firmalar için URL ile takip sağlar.

### S4: Zamanlanmış senkronizasyon nasıl çalışır?

**C:** `ENABLE_SCHEDULED_JOBS=true` ayarlandığında, her 10 dakikada bir tüm aktif kullanıcıların siparişleri otomatik güncellenir.

### S5: Veritabanı şemasını değiştirmem gerekiyor mu?

**C:** Hayır. NestJS servisi C# ile aynı veritabanı şemasını kullanır. `DB_SYNCHRONIZE=false` olduğundan emin olun.

### S6: C# ve NestJS paralel çalışabilir mi?

**C:** Evet! Aynı veritabanına bağlanarak her iki servis de çalışabilir. Geçiş sürecinde önerilir.

### S7: Hangi kargo firmalarıyla tracking number kullanmalıyım?

**C:** UPS, USPS, FedEx, DHL, Asendia için tracking number zorunludur. Diğerleri için tracking URL kullanın.

### S8: lastUpdateDate formatı nedir?

**C:** Unix timestamp (milisaniye cinsinden). Örnek: `1704067200000` (1 Ocak 2024 00:00:00 UTC)

---

## 📞 Destek

### Postman Collection

Tüm endpoint'leri test etmek için hazır Postman collection:

```
docs/Walmart-Service.postman_collection.json
```

### Swagger UI

İnteraktif API dokümantasyonu:

```
http://localhost:3000/api
```

---

**Son Güncelleme:** Ocak 2026  
**Versiyon:** 1.0.0
