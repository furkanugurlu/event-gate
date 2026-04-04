# Event Gate — Etkinlik Bilet Satış Platformu



| Alan | Bilgi |
|---|---|
| **Proje Adı** | Event Gate |
| **Ekip Üyesi 1** | Furkan Uğurlu (`furkanugurlu`) |
| **Ekip Üyesi 2** | İlber Özgürdayi (`ilberozgurdayi`) |
| **Tarih** | Nisan 2026 |

---

## İçindekiler

1. [Giriş ve Problem Tanımı](#1-giriş-ve-problem-tanımı)
2. [Richardson Olgunluk Modeli ve RESTful Servisler](#2-richardson-olgunluk-modeli-ve-restful-servisler)
3. [Sistem Mimarisi ve Sınıf Diyagramları](#3-sistem-mimarisi-ve-sınıf-diyagramları)
4. [Modüller ve Yapılar](#4-modüller-ve-yapılar)
5. [Test Senaryoları ve Sonuçlar](#5-test-senaryoları-ve-sonuçlar)
6. [Sonuç ve Tartışma](#6-sonuç-ve-tartışma)
7. [Gereksinimlerin Kontrol Listesi](#7-gereksinimlerin-kontrol-listesi)
8. [Kaynaklar](#8-kaynaklar)

---

## 1. Giriş ve Problem Tanımı

### Problemin Tanımı

Geleneksel monolitik mimaride yazılmış etkinlik bilet sistemleri; ani trafik artışlarında darboğaz oluşturma, bağımsız ölçeklendirememe ve tek bir bileşendeki hatanın tüm sistemi çökertmesi gibi kritik sorunlar barındırır. 50.000 kişilik bir konser biletleme anında her modülün — kimlik doğrulama, ödeme, bildirim, kullanıcı profili — aynı process içinde çalışması, hem güvenilirlik hem de bakım açısından sürdürülemezdir.

### Amaç

Bu proje aşağıdaki hedefleri gerçek bir üretim benzeri sistemde bir arada uygulamayı amaçlar:

- **Mikroservis Mimarisi:** Bağımsız ölçeklenebilen, gevşek bağlı servislerden oluşan bir platform
- **API Gateway Deseni:** Dispatcher üzerinden merkezi kimlik doğrulama ve trafik yönlendirme
- **Richardson Maturity Model Level 3:** HATEOAS dahil tam RESTful API tasarımı
- **TDD (Test-Driven Development):** RED → GREEN → REFACTOR döngüsüyle kalite güvencesi
- **SOLID Prensipleri:** Bakımı kolay, genişletilebilir nesne yönelimli tasarım
- **Ölçeklenebilirlik:** 500 eş zamanlı kullanıcı altında ölçülebilir performans

### Kapsam

Sistem; konser, tiyatro, opera, festival ve spor etkinlikleri için bilet satışını yöneten tam işlevsel bir platform olarak tasarlanmıştır. Kullanıcı davranışları RFM (Recency-Frequency-Monetary) modeli ve ağırlıklı ilgi skoru ile analiz edilir; yeni etkinlik bildirimleri yalnızca ilgili kullanıcılara iletilir.

---

## 2. Richardson Olgunluk Modeli ve RESTful Servisler

### 2.1 Richardson Olgunluk Modeli Nedir?

Richardson Maturity Model (RMM), Leonard Richardson tarafından 2008 yılında tanımlanan ve REST API'lerin olgunluk seviyesini dört kademeye ayıran bir modeldir.

```
Level 0 │ HTTP Tünel (tek endpoint, tek metod)
Level 1 │ Kaynaklar (birden fazla URI)
Level 2 │ HTTP Fiilleri + Durum Kodları
Level 3 │ HATEOAS (Hypermedia As The Engine Of Application State)
```

Martin Fowler'ın 2010 tarihli "Richardson Maturity Model" blog yazısına göre; Level 3 bir API, istemcinin API'yi keşfedebileceği ve belgelere ihtiyaç duymadan gezilebileceği anlamına gelir. Her yanıt, bir sonraki olası aksiyonların bağlantılarını taşır.

### 2.2 Projede RMM Uygulaması

#### Level 0 — HTTP Tünel

Tüm servisler HTTP/1.1 protokolü üzerinden iletişim kurar. İstemci, Dispatcher'a tek giriş noktasından (`localhost:3000`) bağlanır.

#### Level 1 — Kaynaklar

Her domain kendi URI alanına sahiptir:

| Kaynak | URI Prefix | Servis |
|---|---|---|
| Kimlik Doğrulama | `/api/auth` | auth-service |
| Etkinlikler | `/api/events` | event-service |
| Biletler | `/api/tickets` | ticket-service |
| Bildirimler | `/api/notifications` | notification-service |
| Kullanıcı Profilleri | `/api/users` | user-profile-service |

#### Level 2 — HTTP Fiilleri ve Durum Kodları

```
GET    /api/events        → 200 OK            (liste)
GET    /api/events/:id    → 200 OK / 404      (tekil kaynak)
POST   /api/events        → 201 Created / 400  (oluşturma)
PUT    /api/events/:id    → 200 OK / 404 / 400 (güncelleme)
DELETE /api/events/:id    → 204 No Content / 404 (silme)
```

**Yanlış tasarım örneği (Level 0, projede uygulanmamaktadır):**
```
POST /api/deleteEvent?id=123   ← HTTP fiili yok sayılmış
GET  /api/createEvent          ← GET ile değişiklik yapılıyor
```

**Projede uygulanan tasarım (Level 2+):**
```
DELETE /api/events/123         ← doğru HTTP fiili
POST   /api/events             ← oluşturma için POST
```

#### Level 3 — HATEOAS

Tüm yanıtlar `_links` nesnesi ile hipermedia bağlantıları taşır. İstemci, bir bilet satın aldığında yanıtta o biletin URI'sini ve ilgili etkinliğin URI'sini alır — bu URI'leri ezberlemesi gerekmez.

**Bilet satın alma yanıtı:**
```json
{
  "_id": "64f3a2b1c9e4d500123abc01",
  "user_id": "alice",
  "event_id": "64f3a2b1c9e4d500123abc00",
  "createdAt": "2025-04-04T10:00:00.000Z",
  "_links": {
    "self": "/api/tickets/64f3a2b1c9e4d500123abc01",
    "event": "/api/events/64f3a2b1c9e4d500123abc00"
  }
}
```

**Bildirim yanıtı (TICKET_PURCHASED):**
```json
{
  "_id": "64f3a2b1c9e4d500123abc02",
  "userId": "alice",
  "type": "TICKET_PURCHASED",
  "message": "Biletiniz başarıyla alındı. Etkinlik ID: 64f3a...",
  "_links": {
    "self":   "/api/notifications/64f3a2b1c9e4d500123abc02",
    "event":  "/api/events/64f3a2b1c9e4d500123abc00",
    "ticket": "/api/tickets/64f3a2b1c9e4d500123abc01"
  }
}
```

**Yeni etkinlik bildirimleri (NEW_EVENT) toplu yanıt:**
```json
[
  {
    "_id": "...",
    "userId": "bob",
    "type": "NEW_EVENT",
    "message": "Daha önce ilgilendiğiniz \"concert\" kategorisinde yeni bir etkinlik eklendi: Jazz Festivali",
    "_links": {
      "self":  "/api/notifications/...",
      "event": "/api/events/64f3..."
    }
  }
]
```

### 2.3 Algoritma Açıklamaları

#### RFM Skoru Algoritması

RFM (Recency-Frequency-Monetary) müşteri değer segmentasyonu için kullanılan bir analitik modeldir. Her boyut 1-5 arası skorlanır; toplamda 3-15 arası bir müşteri değer puanı üretilir.

**Recency (Ne kadar yakın zamanda satın aldı?):**

```
son alım ≤ 7 gün   → 5
son alım ≤ 30 gün  → 4
son alım ≤ 90 gün  → 3
son alım ≤ 180 gün → 2
son alım > 180 gün → 1
```

**Frequency (Kaç bilet aldı?):**

```
totalTickets ≥ 20 → 5
totalTickets ≥ 10 → 4
totalTickets ≥ 5  → 3
totalTickets ≥ 2  → 2
totalTickets < 2  → 1
```

**Monetary (Ne kadar harcadı?):**

```
totalSpent ≥ 5000 → 5
totalSpent ≥ 2000 → 4
totalSpent ≥ 1000 → 3
totalSpent ≥ 500  → 2
totalSpent < 500  → 1
```

**RFM Akış Diyagramı:**

```mermaid
flowchart TD
    Start([Bilet Satın Alındı]) --> UpdateStats[totalTickets++\ntotalSpent += price\nlastPurchaseDate = now]
    UpdateStats --> CalcR{Son alım kaç gün önce?}
    CalcR -->|≤ 7| R5[R = 5]
    CalcR -->|≤ 30| R4[R = 4]
    CalcR -->|≤ 90| R3[R = 3]
    CalcR -->|≤ 180| R2[R = 2]
    CalcR -->|> 180| R1[R = 1]
    R5 & R4 & R3 & R2 & R1 --> CalcF{totalTickets}
    CalcF -->|≥ 20| F5[F = 5]
    CalcF -->|≥ 10| F4[F = 4]
    CalcF -->|≥ 5| F3[F = 3]
    CalcF -->|≥ 2| F2[F = 2]
    CalcF -->|< 2| F1[F = 1]
    F5 & F4 & F3 & F2 & F1 --> CalcM{totalSpent}
    CalcM -->|≥ 5000| M5[M = 5]
    CalcM -->|≥ 2000| M4[M = 4]
    CalcM -->|≥ 1000| M3[M = 3]
    CalcM -->|≥ 500| M2[M = 2]
    CalcM -->|< 500| M1[M = 1]
    M5 & M4 & M3 & M2 & M1 --> Total["rfmScore.total = R + F + M\n(3–15 arası)"]
    Total --> Save[MongoDB'ye kaydet]
    Save --> End([Bitti])
```

**Karmaşıklık Analizi — RFM:**
- Zaman: `O(1)` — sabit sayıda karşılaştırma, kullanıcı sayısından bağımsız
- Alan: `O(1)` — ek bellek kullanımı yok

#### Ağırlıklı İlgi Skoru Algoritması

Belirli bir etkinlik türü için kullanıcının affinite skoru:

```
Formül: (tür_oranı × 0.6) + (tür_yeniliği × 0.4)

tür_oranı    = (o türden bilet sayısı / toplam bilet sayısı) × 5   [0-5]
tür_yeniliği = recencyScore(o türün son satın alma tarihi)          [1-5]
```

**Örnek:**
```
Kullanıcı: toplam 10 bilet, 6 tanesi concert
tür_oranı = (6/10) × 5 = 3.0
tür_yeniliği = 4 (son alım 20 gün önce)
affinityScore = (3.0 × 0.6) + (4 × 0.4) = 1.8 + 1.6 = 3.4
```

**Karmaşıklık Analizi — İlgi Skoru:**

| Adım | İşlem | Karmaşıklık |
|---|---|---|
| MongoDB'den kullanıcı çekme | `find({ purchasedTypes: eventType })` | O(n) — n: o türde alışveriş yapmış kullanıcı |
| Her kullanıcı için affinity hesaplama | `_weightedInterestScore()` | O(1) — sabit formül, typeStats dizisinde doğrudan erişim |
| Filtreleme (minScore) | `.filter(score >= 1.5)` | O(n) |
| Sıralama | `.sort((a,b) => b.score - a.score)` | O(n log n) |
| **Toplam** | | **O(n log n)** |

- Alan Karmaşıklığı: `O(n)` — filtrelenmiş kullanıcı listesi için
- **Pratikte:** 100.000 kayıtlı kullanıcıda, "concert" türünü sevenlerin %10'u = 10.000 kişi → `O(10K log 10K) ≈ 130.000 karşılaştırma`. MongoDB `typeStats.type` alanına indeks eklenirse sorgu O(n)'dan O(log n + m)'ye iner.

**Karmaşıklık Analizi — Dispatcher Proxy Yönlendirme:**

Dispatcher, istek URL'sine göre hangi mikroservise proxy yapacağına O(1) ile karar verir:

```js
// http-proxy-middleware — 5 statik prefix eşleştirmesi
/api/auth         → auth-service
/api/events       → event-service
/api/tickets      → ticket-service
/api/notifications → notification-service
/api/users        → user-profile-service
```

| Adım | Karmaşıklık | Açıklama |
|---|---|---|
| Token doğrulama (Redis lookup) | O(1) | Redis hash lookup — sabit süre |
| Route eşleştirme | O(k) | k = 5 prefix (sabit) → pratikte O(1) |
| HTTP proxy iletimi | O(1) | Bağlantı havuzu üzerinden |
| **Toplam istek başına** | **O(1)** | Mikroservis sayısından bağımsız |

Bu tasarım, yeni mikroservis eklense bile dispatcher performansını etkilemez.

**Yeni Etkinlik Bildirimi Akış Diyagramı:**

```mermaid
flowchart TD
    Start([POST /api/events]) --> CreateEvent[Etkinliği MongoDB'ye kaydet]
    CreateEvent --> Respond[201 Created döndür]
    Respond --> FireForget{Fire-and-forget\nNewEvent bildirimi}
    FireForget --> QueryUsers[GET /api/users/by-type/:eventType]
    QueryUsers --> FilterUsers{affinityScore ≥ 1.5?}
    FilterUsers -->|Evet| CreateNotifs[Toplu bildirim oluştur\nMongoDB createMany]
    FilterUsers -->|Hayır / Kullanıcı yok| Skip[Bildirim atla]
    CreateNotifs --> LogSuccess[Konsola bildir]
    Skip --> LogWarn[Uyarı logla]
    QueryUsers -->|Bağlantı hatası| Graceful[Graceful degradation\nSistemi durdurma]
```

---

## 3. Sistem Mimarisi ve Sınıf Diyagramları

### 3.1 Genel Mimari

```mermaid
graph TD
    Client([İstemci]) -->|HTTP :3000| Dispatcher

    subgraph Docker Internal Network
        Dispatcher -->|Proxy + Auth| AuthService[auth-service]
        Dispatcher -->|Proxy| EventService[event-service]
        Dispatcher -->|Proxy| TicketService[ticket-service]
        Dispatcher -->|Proxy| NotifService[notification-service]
        Dispatcher -->|Proxy| UserService[user-profile-service]

        Dispatcher -.->|Token Doğrulama| AuthService

        EventService -->|NEW_EVENT| NotifService
        TicketService -->|Kapasite Kontrol| EventService
        TicketService -->|TICKET_PURCHASED| NotifService
        TicketService -->|Profil Güncelle| UserService
        NotifService -->|İlgili Kullanıcılar| UserService

        AuthService --- RedisAuth[(Redis\nauth-redis)]
        Dispatcher --- RedisDisp[(Redis\ndispatcher-redis)]
        EventService --- MongoDB1[(MongoDB\nevent-db)]
        TicketService --- MongoDB2[(MongoDB\nticket-db)]
        NotifService --- MongoDB3[(MongoDB\nnotification-db)]
        UserService --- MongoDB4[(MongoDB\nuserprofile-db)]

        Dispatcher -.->|/metrics| Prometheus[(Prometheus)]
        Prometheus -.->| | Grafana
    end

    Grafana([Grafana :3001]) -->|Dashboard| Client
```

### 3.2 Network İzolasyonu

**Mikro servislere doğrudan dış erişim kapalıdır.** Docker Compose yapılandırmasında yalnızca `dispatcher` ve görselleştirme araçları dış dünyaya port açar:

```yaml
# docker-compose.yml — sadece bu servisler dışarıya port açar:
dispatcher:
  ports:
    - "3000:3000"   # ← tek public API giriş noktası

grafana:
  ports:
    - "3001:3000"   # ← monitoring UI

# auth-service, event-service, ticket-service vb.:
# ports: tanımı YOK → sadece Docker iç ağından erişilebilir
```

Tüm servisler `internal` adlı bridge network'te yer alır. Dışarıdan `http://localhost:4001` gibi bir adresle event-service'e doğrudan erişim mümkün değildir; istek `dispatcher:3000`'den geçmek zorundadır. Bu mimari, tüm kimlik doğrulama ve yetkilendirmenin dispatcher'da tek merkezde yapılmasını garantiler.

```mermaid
sequenceDiagram
    participant Saldırgan as Dış İstemci
    participant Dispatcher as Dispatcher :3000
    participant EventSvc as event-service (iç ağ)

    Note over Saldırgan,EventSvc: Senaryo 1 — Dispatcher üzerinden geçerli istek
    Saldırgan->>Dispatcher: GET /api/events (Bearer token)
    Dispatcher->>EventSvc: Proxy — token doğrulandı
    EventSvc-->>Dispatcher: 200 OK
    Dispatcher-->>Saldırgan: 200 OK

    Note over Saldırgan,EventSvc: Senaryo 2 — Servise doğrudan erişim denemesi
    Saldırgan--xEventSvc: GET http://localhost:PORT/api/events
    Note right of EventSvc: Port dışarıya açık değil\nDocker iç ağı engeller\nBağlantı kurulamaz
```

### 3.3 Dispatcher — Sınıf Diyagramı ve TDD

```mermaid
classDiagram
    class App {
        -app: Express
        -authMiddleware: AuthMiddleware
        +metrics() void
        +middlewares() void
        +routes() void
        -_proxy(target, pathFilter) ProxyMiddleware
        +cleanup() Promise
    }

    class AuthMiddleware {
        -authServiceUrl: string
        +verifyToken(req, res, next) void
        -_callAuthVerify(token) Promise~UserData~
        +cleanup() Promise
    }

    App --> AuthMiddleware : injects
```

**TDD Döngüsü — Dispatcher:**

Dispatcher, TDD (Red-Green-Refactor) prensibiyle geliştirilmiştir. Test dosyalarının commit zaman damgası fonksiyonel koddan öndedir.

```
RED   → dispatcher/__tests__/auth.test.js   (401 dönsün, henüz uygulama yok)
RED   → dispatcher/__tests__/proxy.test.js  (proxy yönlendirme, 503 bekleniyor)
GREEN → dispatcher/src/app.js oluşturuldu
GREEN → dispatcher/src/middlewares/auth.js oluşturuldu
REFACTOR → proxyTimeout eklendi, hata kodları düzeltildi
```

**Auth Middleware Sequence Diyagramı:**

```mermaid
sequenceDiagram
    participant C as İstemci
    participant D as Dispatcher
    participant A as auth-service
    participant S as Mikroservis

    C->>D: GET /api/events\n(Authorization: Bearer <token>)

    alt /api/auth yolu → bypass
        D->>S: direkt proxy
    else Diğer tüm yollar
        D->>A: GET /api/auth/verify\n(Authorization: Bearer <token>)

        alt Token geçerli
            A-->>D: 200 {username, role}
            D->>D: x-user-role header'ı ekle
            D->>S: Proxy isteği (x-user-role ile)
            S-->>D: Yanıt
            D-->>C: Yanıt
        else Token geçersiz
            A-->>D: 401 Unauthorized
            D-->>C: 401 {error: "Invalid or expired token"}
        else Auth servisi erişilemez
            A-->>D: timeout / ECONNREFUSED
            D-->>C: 503 {error: "Authentication service unavailable"}
        end
    end
```

### 3.4 Auth Service — Sınıf Diyagramı

```mermaid
classDiagram
    class AuthService {
        -repository: AuthRepository
        +register(username, password, role) void
        +login(username, password) string
        +verifyToken(token) UserData
        -_generateAndSaveToken(username, role) string
    }

    class AuthRepository {
        -redisClient: Redis
        +saveToken(token, username, role, ttl) void
        +getTokenData(token) UserData
        +saveUser(username, password, role) void
        +getUserData(username) UserData
    }

    class AuthController {
        -service: AuthService
        +register(req, res) void
        +login(req, res) void
        +verify(req, res) void
    }

    AuthController --> AuthService : injects
    AuthService --> AuthRepository : injects
    AuthRepository --> Redis[(Redis)]
```

**Login Akış Diyagramı:**

```mermaid
flowchart TD
    Start([POST /api/auth/login]) --> Check{username\nve password\nvarlık kontrolü}
    Check -->|Eksik| E1[400 MissingCredentials]
    Check -->|Tam| GetUser[Redis'ten kullanıcı getir]
    GetUser --> Exists{Kullanıcı var?}
    Exists -->|Yok| E2[401 InvalidCredentials]
    Exists -->|Var| MatchPass{Şifre eşleşiyor?}
    MatchPass -->|Hayır| E2
    MatchPass -->|Evet| GenToken[crypto.randomBytes 32 hex token üret]
    GenToken --> SaveRedis[Redis'e 1 saat TTL ile kaydet]
    SaveRedis --> Return[200 OK token döndür]
```

### 3.5 Event Service — Sınıf Diyagramı

```mermaid
classDiagram
    class EventService {
        -repository: EventRepository
        -axios: AxiosInstance
        -notificationServiceUrl: string
        +getAllEvents() Event[]
        +getEventById(id) Event
        +createEvent(data) Event
        +updateEvent(id, data) Event
        +deleteEvent(id) Event
        +deleteAllEvents() void
    }

    class EventRepository {
        -model: MongooseModel
        +findAll() Event[]
        +findById(id) Event
        +create(data) Event
        +updateById(id, data) Event
        +deleteById(id) Event
        +deleteAll() void
    }

    class EventController {
        -service: EventService
        +getAllEvents(req, res)
        +getEventById(req, res)
        +createEvent(req, res)
        +updateEvent(req, res)
        +deleteEvent(req, res)
        +deleteAllEvents(req, res)
    }

    class EventRouter {
        -router: Router
        -controller: EventController
        +initializeRoutes() void
        +getRouter() Router
    }

    EventRouter --> EventController : injects
    EventController --> EventService : injects
    EventService --> EventRepository : injects
    EventRepository --> MongoDB1[(MongoDB event-db)]
```

**Etkinlik Oluşturma Sequence Diyagramı:**

```mermaid
sequenceDiagram
    participant C as İstemci (Admin)
    participant D as Dispatcher
    participant E as event-service
    participant N as notification-service
    participant U as user-profile-service

    C->>D: POST /api/events\n{name, date, capacity, type}
    D->>D: Token doğrula → role=admin kontrol
    D->>E: POST /api/events

    E->>E: Validasyon\n(name, date, capacity, type)
    E->>E: MongoDB'ye kaydet

    E-->>D: 201 Created {event, _links}
    D-->>C: 201 Created

    Note over E,U: Fire-and-forget (asenkron)
    E--)N: POST /api/notifications\n{type: NEW_EVENT, eventId, eventType}
    N->>U: GET /api/users/by-type/concert
    U-->>N: [ilgili kullanıcılar, affinityScore ile sıralı]
    N->>N: Toplu bildirim oluştur (createMany)
```

### 3.6 Ticket Service — Sınıf Diyagramı

```mermaid
classDiagram
    class TicketService {
        -repository: TicketRepository
        -axios: AxiosInstance
        +createTicket(data) Ticket
        +getTicketById(id) Ticket
        +getAllTickets() Ticket[]
        +updateTicket(id, data) Ticket
        +deleteTicket(id) void
        +deleteAllTickets() void
    }

    class TicketController {
        -service: TicketService
        +createTicket(req, res)
        +getTicketById(req, res)
        +getAllTickets(req, res)
        +updateTicket(req, res)
        +deleteTicket(req, res)
        +deleteAllTickets(req, res)
    }

    class TicketRepository {
        -model: MongooseModel
        +findAll() Ticket[]
        +findById(id) Ticket
        +create(data) Ticket
        +updateById(id, data) Ticket
        +deleteById(id) void
        +deleteAll() void
    }

    class TicketRouter {
        -router: Router
        -controller: TicketController
        +initializeRoutes() void
        +getRouter() Router
    }

    class Ticket {
        +_id: ObjectId
        +user_id: String
        +event_id: String
        +createdAt: Date
        +updatedAt: Date
        +_links: Object
    }

    TicketRouter --> TicketController : injects
    TicketController --> TicketService : injects
    TicketService --> TicketRepository : injects
    TicketRepository --> MongoDB2[(MongoDB ticket-db)]
    TicketRepository ..> Ticket : returns
```

**Bilet Satın Alma Sequence Diyagramı:**

```mermaid
sequenceDiagram
    participant C as İstemci
    participant D as Dispatcher
    participant T as ticket-service
    participant E as event-service
    participant U as user-profile-service
    participant N as notification-service

    C->>D: POST /api/tickets\n{event_id, user_id, price}
    D->>D: Token doğrula
    D->>T: POST /api/tickets

    T->>T: user_id, event_id validasyon
    T->>E: GET /api/events/:event_id
    E-->>T: {capacity, type, name}

    alt capacity <= 0
        T-->>D: 400 CapacityError
        D-->>C: 400
    else Kapasite uygun
        T->>T: MongoDB'ye bilet kaydet
        T-->>D: 201 Created {ticket, _links}
        D-->>C: 201 Created

        Note over T,N: Fire-and-forget (asenkron)
        T--)U: PUT /api/users/:userId\n{eventType, price}
        T--)N: POST /api/notifications\n{type: TICKET_PURCHASED}
    end
```

### 3.7 Notification Service — Sınıf Diyagramı

```mermaid
classDiagram
    class NotificationService {
        -repository: NotificationRepository
        -axios: AxiosInstance
        +createTicketNotification(data) Notification
        +createNewEventNotifications(data) Notification[]
        +getAllNotifications() Notification[]
        +getNotificationById(id) Notification
        +deleteNotification(id) void
        +deleteAllNotifications() void
    }

    class NotificationController {
        -service: NotificationService
        +createNotification(req, res)
        +getAllNotifications(req, res)
        +getNotificationById(req, res)
        +deleteNotification(req, res)
        +deleteAllNotifications(req, res)
    }

    class NotificationRepository {
        -model: MongooseModel
        +findAll() Notification[]
        +findById(id) Notification
        +create(data) Notification
        +createMany(dataArray) Notification[]
        +deleteById(id) void
        +deleteAll() void
    }

    class NotificationRouter {
        -router: Router
        -controller: NotificationController
        +initializeRoutes() void
        +getRouter() Router
    }

    class Notification {
        +_id: ObjectId
        +userId: String
        +eventId: String
        +ticketId: String
        +type: TICKET_PURCHASED|NEW_EVENT
        +eventType: String
        +message: String
        +status: SENT|PENDING
        +_links: Object
    }

    NotificationRouter --> NotificationController : injects
    NotificationController --> NotificationService : injects
    NotificationService --> NotificationRepository : injects
    NotificationRepository --> MongoDB3[(MongoDB notification-db)]
    NotificationRepository ..> Notification : returns
```

### 3.8 User Profile Service — Sınıf Diyagramı

```mermaid
classDiagram
    class UserProfileService {
        -repository: UserProfileRepository
        +getAllProfiles() Profile[]
        +getProfileByUserId(userId) Profile
        +getUsersByPurchasedType(eventType, minScore) Profile[]
        +addPurchasedType(userId, eventType, price) void
        +deleteProfile(userId) void
        -_recencyScore(date) int
        -_frequencyScore(total) int
        -_monetaryScore(spent) int
        -_calculateRFM(profile) RFMScore
        -_weightedInterestScore(profile, type) float
    }

    class UserProfile {
        +userId: String
        +purchasedTypes: String[]
        +totalTickets: Number
        +totalSpent: Number
        +lastPurchaseDate: Date
        +typeStats: TypeStat[]
        +rfmScore: RFMScore
    }

    class TypeStat {
        +type: String
        +count: Number
        +lastPurchaseDate: Date
        +totalSpent: Number
    }

    class RFMScore {
        +recency: Number
        +frequency: Number
        +monetary: Number
        +total: Number
    }

    UserProfileService --> UserProfile
    UserProfile *-- TypeStat
    UserProfile *-- RFMScore
```

### 3.9 Veritabanı Şema Diyagramı (NoSQL E-R)

Her servis kendi izole MongoDB veritabanını kullanır. Koleksiyonlar arası ilişkiler referans (ID) bazlıdır; JOIN yoktur.

```mermaid
erDiagram
    EVENT {
        ObjectId _id PK
        String name
        Date date
        Number capacity
        String type "concert|theater|opera|festival|sports"
        Date createdAt
        Date updatedAt
    }

    TICKET {
        ObjectId _id PK
        String user_id
        String event_id FK
        Date createdAt
        Date updatedAt
    }

    NOTIFICATION {
        ObjectId _id PK
        String userId
        String eventId FK
        String ticketId FK
        String type "TICKET_PURCHASED|NEW_EVENT"
        String eventType
        String message
        String status "SENT|PENDING"
        Date createdAt
    }

    USERPROFILE {
        ObjectId _id PK
        String userId UK
        Array purchasedTypes
        Number totalTickets
        Number totalSpent
        Date lastPurchaseDate
    }

    TYPESTAT {
        String type
        Number count
        Date lastPurchaseDate
        Number totalSpent
    }

    RFMSCORE {
        Number recency "1-5"
        Number frequency "1-5"
        Number monetary "1-5"
        Number total "3-15"
    }

    AUTH_TOKEN {
        String token PK "64-char hex"
        String username
        String role "admin|user"
        Number ttl "3600s"
    }

    USER_CREDENTIAL {
        String username PK
        String password
        String role "admin|user"
    }

    EVENT ||--o{ TICKET : "event_id referansı"
    EVENT ||--o{ NOTIFICATION : "eventId referansı"
    TICKET ||--o{ NOTIFICATION : "ticketId referansı"
    USERPROFILE ||--|{ TYPESTAT : "typeStats embed"
    USERPROFILE ||--|| RFMSCORE : "rfmScore embed"
    USER_CREDENTIAL ||--o{ AUTH_TOKEN : "oturum açınca üretilir"
```

> **Not:** `EVENT ↔ TICKET` ve `TICKET ↔ NOTIFICATION` ilişkileri farklı MongoDB instance'larında tutulur; servis sınırı boyunca referans bütünlüğü servis katmanında (TicketService, NotificationService) kod ile korunur.

### 3.10 Docker Altyapı ve Network İzolasyon Diyagramı

```mermaid
graph TD
    Internet((İnternet\n:3000)) -->|Tek giriş| Dispatcher

    subgraph internal["Docker Bridge Network — internal"]
        Dispatcher["Dispatcher\n:3000"]

        subgraph services["Mikroservisler (dışarıya kapalı)"]
            AuthSvc["auth-service"]
            EventSvc["event-service"]
            TicketSvc["ticket-service"]
            NotifSvc["notification-service"]
            UserSvc["user-profile-service"]
        end

        subgraph dbs["Veri Katmanı (dışarıya kapalı)"]
            RedisA[("Redis\nauth-redis")]
            RedisD[("Redis\ndispatcher-redis")]
            MongoE[("MongoDB\nevent-db")]
            MongoT[("MongoDB\nticket-db")]
            MongoN[("MongoDB\nnotification-db")]
            MongoU[("MongoDB\nuserprofile-db")]
        end

        subgraph obs["Gözlemlenebilirlik"]
            Prometheus["Prometheus\n:9090"]
        end
    end

    Grafana["Grafana\n:3001"] -->|Dashboard| Internet

    Dispatcher -->|Token doğrula| AuthSvc
    Dispatcher -->|Proxy| EventSvc
    Dispatcher -->|Proxy| TicketSvc
    Dispatcher -->|Proxy| NotifSvc
    Dispatcher -->|Proxy| UserSvc
    Dispatcher -->|/metrics scrape| Prometheus
    Prometheus --> Grafana

    AuthSvc --- RedisA
    Dispatcher --- RedisD
    EventSvc --- MongoE
    TicketSvc --- MongoT
    NotifSvc --- MongoN
    UserSvc --- MongoU

    EventSvc -.->|NEW_EVENT async| NotifSvc
    TicketSvc -.->|TICKET_PURCHASED async| NotifSvc
    TicketSvc -.->|RFM güncelle async| UserSvc
    NotifSvc -.->|İlgili kullanıcılar| UserSvc
```

### 3.11 Notification Service — Tam Akış Diyagramları

**TICKET_PURCHASED Bildirimi Sequence Diyagramı:**

```mermaid
sequenceDiagram
    participant T as ticket-service
    participant N as notification-service
    participant DB as MongoDB (notification-db)

    Note over T,N: Fire-and-forget — bilet oluşturulduktan sonra asenkron
    T--)N: POST /api/notifications\n{userId, eventId, ticketId, eventType, type:"TICKET_PURCHASED"}

    N->>N: Validasyon (userId zorunlu)
    N->>DB: notifications.insertOne({...})
    DB-->>N: {_id, userId, type, status:"SENT"}

    N-->>T: 201 Created\n{notification, _links:{self, event, ticket}}
    Note over T: Yanıt beklenmez — timeout'ta devam eder
```

**NEW_EVENT Toplu Bildirim Sequence Diyagramı:**

```mermaid
sequenceDiagram
    participant E as event-service
    participant N as notification-service
    participant U as user-profile-service
    participant DB as MongoDB (notification-db)

    Note over E,DB: Fire-and-forget — etkinlik kaydedildikten sonra asenkron
    E--)N: POST /api/notifications\n{type:"NEW_EVENT", eventId, eventType:"concert"}

    N->>U: GET /api/users/by-type/concert
    U->>U: typeStats.type="concert" filtreleme\naffinityScore hesaplama\nscore ≥ 1.5 filtresi\naffinity'ye göre sıralama
    U-->>N: [{userId:"alice", score:4.2}, {userId:"bob", score:2.1}, ...]

    alt Kullanıcı listesi boş değil
        N->>DB: notifications.insertMany([...])
        DB-->>N: Toplu kayıt tamamlandı
        Note over N: Her kullanıcıya ayrı bildirim kaydı
    else Kullanıcı bulunamadı (affinityScore < 1.5)
        Note over N: Bildirim atlanır, uyarı loglanır
    end
```

**RFM Güncelleme Sequence Diyagramı (Bilet Sonrası):**

```mermaid
sequenceDiagram
    participant T as ticket-service
    participant U as user-profile-service
    participant DB as MongoDB (userprofile-db)

    Note over T,DB: Fire-and-forget — ticket kaydı sonrası asenkron
    T--)U: PUT /api/users/:userId\n{eventType:"theater", price:150}

    U->>DB: userprofiles.findOne({userId})

    alt Profil var
        U->>U: typeStats güncelle (count++, totalSpent+=price)
        U->>U: totalTickets++, totalSpent+=price\nlastPurchaseDate = now
        U->>U: _calculateRFM(profile)\n→ recency + frequency + monetary skoru
        U->>DB: userprofiles.findByIdAndUpdate({...rfmScore})
        DB-->>U: Güncellenen profil
        U-->>T: 200 OK {profile, _links}
    else Profil yok — yeni kullanıcı
        U->>DB: userprofiles.create({userId, typeStats:[...], rfmScore:{1,1,1,3}})
        DB-->>U: Yeni profil
        U-->>T: 200 OK {profile, _links}
    end
    Note over T: Yanıt beklenmez — timeout'ta devam eder
```

### 3.12 Network İzolasyon Kanıtı

Aşağıdaki `docker ps` çıktısı, **yalnızca dispatcher'ın** (`0.0.0.0:3000`) ve izleme araçlarının dış ağa port açtığını; tüm mikroservislerin ve veritabanlarının yalnızca Docker iç ağında (`3000/tcp`, `6379/tcp`, `27017/tcp`) çalıştığını kanıtlar:

```
CONTAINER                               PORTS
event-gate-dispatcher-1                 0.0.0.0:3000->3000/tcp   ← TEK DIŞ GİRİŞ
event-gate-grafana-1                    0.0.0.0:3001->3000/tcp   ← İzleme UI
event-gate-event-mongo-express-1        0.0.0.0:8081->8081/tcp   ← DB yönetim UI
event-gate-ticket-mongo-express-1       0.0.0.0:8082->8081/tcp   ← DB yönetim UI
event-gate-redis-commander-1            0.0.0.0:8083->8081/tcp   ← Redis UI
event-gate-notification-mongo-express-1 0.0.0.0:8084->8081/tcp   ← DB yönetim UI
event-gate-userprofile-mongo-express-1  0.0.0.0:8085->8081/tcp   ← DB yönetim UI

event-gate-auth-service-1               3000/tcp     ← SADECE İÇ AĞ
event-gate-event-service-1              3000/tcp     ← SADECE İÇ AĞ
event-gate-ticket-service-1             3000/tcp     ← SADECE İÇ AĞ
event-gate-notification-service-1       3000/tcp     ← SADECE İÇ AĞ
event-gate-user-profile-service-1       3000/tcp     ← SADECE İÇ AĞ
event-gate-redis-1                      6379/tcp     ← SADECE İÇ AĞ
event-gate-dispatcher-redis-1           6379/tcp     ← SADECE İÇ AĞ
event-gate-event-mongo-1                27017/tcp    ← SADECE İÇ AĞ
event-gate-ticket-mongo-1               27017/tcp    ← SADECE İÇ AĞ
event-gate-notification-mongo-1         27017/tcp    ← SADECE İÇ AĞ
event-gate-userprofile-mongo-1          27017/tcp    ← SADECE İÇ AĞ
```

**Doğrudan erişim denemesi (dış ağdan event-service'e):**

```bash
# Dışarıdan event-service'e doğrudan bağlanma girişimi
$ curl http://localhost:4001/api/events
curl: (7) Failed to connect to localhost port 4001: Connection refused

# Dispatcher üzerinden aynı istek — başarılı
$ curl -H "Authorization: Bearer <token>" http://localhost:3000/api/events
[{"_id":"...","name":"Rock Fest",...}]
```

Mikroservislerin herhangi bir host portuna bağlı olmaması, `docker-compose.yml`'de `ports:` tanımının yalnızca dispatcher için yapılmış olmasından kaynaklanır. Dış dünyaya yalnızca `dispatcher:3000` açıktır.

---

## 4. Modüller ve Yapılar

### 4.1 Proje Dizin Yapısı

```
event-gate/
├── dispatcher/                # API Gateway
│   ├── src/
│   │   ├── app.js             # Express + proxy kurulumu
│   │   ├── server.js          # HTTP sunucu başlatma
│   │   └── middlewares/
│   │       └── auth.js        # Token doğrulama middleware
│   └── __tests__/
│       ├── auth.test.js       # TDD RED: yetkilendirme testleri
│       ├── proxy.test.js      # TDD RED: proxy yönlendirme testleri
│       └── new-services.test.js
│
├── auth-service/              # Kimlik Doğrulama
│   └── src/
│       ├── repositories/AuthRepository.js
│       ├── services/AuthService.js
│       ├── controllers/AuthController.js
│       └── routes/AuthRouter.js
│
├── event-service/             # Etkinlik Yönetimi
│   └── src/
│       ├── models/Event.js
│       ├── repositories/EventRepository.js
│       ├── services/EventService.js
│       ├── controllers/EventController.js
│       └── routes/EventRouter.js
│
├── ticket-service/            # Bilet Satışı
│   └── src/  (aynı katman yapısı)
│
├── notification-service/      # Bildirim Yönetimi
│   └── src/  (aynı katman yapısı)
│
├── user-profile-service/      # Kullanıcı Profili + RFM
│   └── src/  (aynı katman yapısı)
│
├── prometheus/
│   └── prometheus.yml         # Scrape konfigürasyonu
├── grafana/
│   ├── dashboards/            # 10 panelli dashboard JSON
│   └── provisioning/          # Otomatik datasource/dashboard yükleme
├── load-test.js               # k6 performans testi (4 senaryo)
├── load-test-error.js         # k6 hata senaryoları
└── docker-compose.yml         # Tam sistem orkestrasyonu
```

### 4.2 Katmanlı Mimari (Her Serviste Aynı Yapı)

```mermaid
graph LR
    Client([HTTP İstek]) --> Router
    Router --> Controller
    Controller --> Service
    Service --> Repository
    Repository --> DB[(NoSQL Veritabanı)]

    Service -.->|Dış Servis Çağrısı| Axios[Axios HTTP Client]
```

| Katman | Sorumluluk | SOLID |
|---|---|---|
| **Router** | URL ve HTTP metod eşleştirmesi | S — tek sorumluluk |
| **Controller** | HTTP req/res dönüşümü, hata kodları | S — sunum mantığı |
| **Service** | İş kuralları, validasyon, servislerarası iletişim | S, D — inject edilmiş bağımlılıklar |
| **Repository** | Veritabanı CRUD işlemleri | S, O — sadece veri erişimi |

### 4.3 SOLID Prensipleri Uygulaması

**Single Responsibility (S):**
Her sınıf tek bir değişme nedenine sahiptir. `EventRepository` veritabanı sorgularından, `EventService` iş kurallarından, `EventController` HTTP arayüzünden sorumludur.

**Open/Closed (O):**
Repository sınıfları yeni sorgular için `extends` ile genişletilebilir; var olan metodlar değiştirilmez. `UserProfileRepository.findByPurchasedType()` bu prensiple eklendi.

**Liskov Substitution (L):**
Jest testlerinde `mockRepo` nesnesi gerçek `EventRepository`'nin yerine geçebilir; test kodu servis kodunu etkilemez.

**Interface Segregation (I):**
`NotificationService` yalnızca `createTicketNotification` ve `createNewEventNotifications` metodlarını dışarıya açar. Repository'nin `findAll`, `findById` gibi ayrıntıları servis dışında görünmez.

**Dependency Inversion (D):**
Tüm bağımlılıklar constructor üzerinden enjekte edilir:

```js
// Bağımlılıklar dışarıdan verilir — sınıf içinde new() çağrısı yok
class EventService {
  constructor(eventRepository, axiosInstance, notificationServiceUrl) {
    this.repository = eventRepository;        // inject
    this.axios = axiosInstance;               // inject
    this.notificationServiceUrl = notificationServiceUrl || /* fallback */;
  }
}

// Composition Root — app.js
const repository = new EventRepository(Event);
const service    = new EventService(repository, axios, notificationUrl);
const controller = new EventController(service);
```

### 4.4 Veri Modelleri (NoSQL Şemaları)

**Event (MongoDB):**
```
name: String (required)
date: Date (required)
capacity: Number (min: 1)
type: Enum[concert, theater, opera, festival, sports]
```

**Ticket (MongoDB):**
```
user_id: String (required)
event_id: String (required)
```

**Notification (MongoDB):**
```
userId: String, eventId: String, ticketId: String
type: Enum[TICKET_PURCHASED, NEW_EVENT]
eventType: Enum[concert, theater, opera, festival, sports]
message: String
status: Enum[SENT, PENDING]
```

**UserProfile (MongoDB):**
```
userId: String (unique)
purchasedTypes: String[]
totalTickets: Number, totalSpent: Number, lastPurchaseDate: Date
typeStats: [{type, count, lastPurchaseDate, totalSpent}]
rfmScore: {recency, frequency, monetary, total}
```

**Auth / Token (Redis):**
```
auth:<token>  →  JSON{username, role}  [TTL: 3600s]
users hash    →  {<username>: JSON{password, role}}
```

### 4.5 Kritik Fonksiyonların Detaylı Açıklaması

#### `AuthMiddleware.verifyToken(req, res, next)`

```
GİRDİ : HTTP isteği (Authorization header)
ÇIKTI : next() — token geçerliyse | 401/503 — geçersizse

1. Public endpoint mi? (/api/auth/*, /metrics)
   → Evet: doğrudan next() çağır
   → Hayır: devam et

2. Authorization header var mı?
   → Hayır: 401 "No authorization token provided"

3. "Bearer <token>" formatı doğru mu?
   → Hayır: 401 "Invalid token format"

4. auth-service'e GET /api/auth/verify isteği gönder (timeout: 3s)
   → 200: {username, role} → header'a ekle → next()
   → 401: 401 "Invalid or expired token"
   → Timeout/ECONNREFUSED: 503 "Authentication service unavailable"
```

#### `TicketService.createTicket(data)`

```
GİRDİ : {user_id, event_id, price}
ÇIKTI : Ticket nesnesi | Error

1. user_id ve event_id varlık kontrolü
   → Eksik: ValidationError fırlat

2. event-service'den etkinlik bilgisi çek
   GET /api/events/:event_id (axios)
   → 404: EventNotFound fırlat
   → Bağlantı hatası: EventServiceConnectionError fırlat

3. event.capacity > 0 kontrolü
   → capacity <= 0: CapacityError fırlat

4. MongoDB'ye bilet kaydı: {user_id, event_id}

5. [Fire-and-forget] user-profile güncelle:
   PUT /api/users/:user_id {eventType, price}

6. [Fire-and-forget] bildirim oluştur:
   POST /api/notifications {userId, eventId, ticketId, type:"TICKET_PURCHASED"}

7. Ticket nesnesini döndür (adım 4'ten)
   → Adım 5-6 hataları sistemi durdurmaz
```

#### `UserProfileService.getUsersByPurchasedType(eventType, minScore=1.5)`

```
GİRDİ : eventType (string), minScore (float, varsayılan 1.5)
ÇIKTI : [{userId, affinityScore}, ...] — affinityScore'a göre azalan

1. Validasyon: eventType geçerli enum değeri mi?

2. MongoDB sorgusu: {purchasedTypes: eventType} içeren profiller
   → O(n) — typeStats.type indeksi varsa O(log n + m)

3. Her profil için affinityScore hesapla:
   typeRatio    = (typeCount / totalTickets) × 5        [0-5]
   typeRecency  = _recencyScore(typeLastPurchaseDate)   [1-5]
   score        = (typeRatio × 0.6) + (typeRecency × 0.4)

4. minScore filtreleme: score >= 1.5 olanları al

5. Azalan sıralama: score'a göre sort

6. Sonuç listesi döndür
```

### 4.6 Abstraksiyon ve Interface Tasarımı

JavaScript formal interface tanımını desteklemese de projede **duck-typing** ile tutarlı bir sözleşme uygulanmıştır. Tüm Repository sınıfları aynı metod imzasını taşır:

```js
// Gayri resmi Repository Interface Sözleşmesi
// Her *Repository sınıfı bu metodları implemente etmek zorundadır:

class IRepository {
  async findAll()              // → Entity[]
  async findById(id)           // → Entity | null
  async create(data)           // → Entity
  async updateById(id, data)   // → Entity | null
  async deleteById(id)         // → Entity | null (silinen)
  async deleteAll()            // → void
}
```

Bu sözleşme aşağıdaki avantajları sağlar:

1. **Test edilebilirlik:** Jest testlerinde `mockRepo = { findAll: jest.fn(), ... }` ile gerçek repository yerine geçebilir — Liskov Substitution Principle
2. **Değiştirilebilirlik:** MongoDB yerine PostgreSQL kullanılmak istense yalnızca Repository katmanı değişir, Service katmanı etkilenmez — Dependency Inversion Principle
3. **Tutarlılık:** 5 farklı serviste aynı CRUD şablonu — kod okunabilirliği

**Polimorfizm Örneği:**

```js
// TicketService, NotificationService, EventService — hepsi aynı şablonu kullanır:
class TicketService {
  constructor(ticketRepository) {   // IRepository sözleşmesi
    this.repository = ticketRepository;
  }
  async getAllTickets() {
    return this.repository.findAll(); // Mock veya gerçek — fark yok
  }
}
```

---

## 5. Test Senaryoları ve Sonuçlar

### 5.1 TDD Yaklaşımı

Geliştirme **RED → GREEN → REFACTOR** döngüsüyle yürütülmüştür:

1. **RED:** Önce başarısız test yazılır (`app.js` henüz yoktur, test import hatası verir)
2. **GREEN:** Minimum kodla test geçirilir
3. **REFACTOR:** Kod temizlenir, performans iyileştirilir

**TDD Git Akışı (Red → Green → Refactor):**

```mermaid
gitGraph
   commit id: "initial: proje iskeleti"
   commit id: "RED: dispatcher auth.test.js" type: HIGHLIGHT
   commit id: "RED: dispatcher proxy.test.js" type: HIGHLIGHT
   commit id: "GREEN: app.js + AuthMiddleware"
   commit id: "GREEN: proxy routing"
   commit id: "REFACTOR: OOP katmanları"
   commit id: "REFACTOR: proxyTimeout + hata kodları"
   commit id: "RED: tüm mikroservisler Jest altyapısı" type: HIGHLIGHT
   commit id: "GREEN: birim testler geçti"
   commit id: "feat: k6 yük testi — 4 senaryo"
```

**TDD Commit Zaman Damgaları (Git Log Kanıtı):**

Aşağıdaki tablo, test dosyalarının fonksiyonel koddan **önce** commit edildiğini zaman damgalarıyla kanıtlar:

| Tarih & Saat | Commit Hash | Mesaj | Faz |
|---|---|---|---|
| 2026-03-23 16:22 | `2df0803` | chore(setup): monorepo iskeleti | Başlangıç |
| **2026-03-23 16:25** | **`bf61136`** | **test(dispatcher): RED — auth.test.js (401 senaryoları)** | **🔴 RED** |
| 2026-03-23 16:31 | `015c136` | feat(dispatcher): OOP auth middleware | 🟢 GREEN |
| **2026-03-23 16:33** | **`de26522`** | **test(dispatcher): RED — proxy.test.js (yönlendirme)** | **🔴 RED** |
| 2026-03-23 16:36 | `1418902` | feat(dispatcher): proxy-middleware entegrasyonu | 🟢 GREEN |
| 2026-03-25 10:02 | `1b54d36` | refactor(core): OOP + SOLID + DI tüm servislerde | 🔵 REFACTOR |
| **2026-03-31 19:30** | **`9ca9969`** | **test(dispatcher): RED — notification/user-profile proxy** | **🔴 RED** |
| 2026-03-31 19:34 | `67173e9` | feat: notification-service + user-profile-service eklendi | 🟢 GREEN |
| **2026-04-03 01:04** | **`5455759`** | **test(tüm servisler): RED — tüm mikroservisler Jest altyapısı** | **🔴 RED** |
| 2026-04-03 01:09 | `8ad1a34` | feat(user-profile): GREEN — RFM + affinity algoritması | 🟢 GREEN |
| 2026-04-03 01:13 | `cf9f02f` | fix(testler): GREEN düzeltmeleri | 🟢 GREEN |
| 2026-04-03 01:19 | `4e10885` | fix(dispatcher): tüm testler yeşile alındı | 🟢 GREEN |
| 2026-04-04 03:14 | `4c11ff1` | feat(k6): yük testi 4 senaryo, tüm threshold'lar yeşil | Tamamlandı |

**Dispatcher TDD örneği — RED phase:**

```js
// RED — dispatcher/__tests__/auth.test.js
// Commit: bf61136 — 2026-03-23 16:25
// Bu test yazıldığında app.js henüz YOKTU — test import hatası veriyordu
it('should return 401 when NO authorization token is provided', async () => {
  const response = await request(app).get('/api/events');
  expect(response.status).toBe(401);
  expect(response.body.error).toBe('No authorization token provided');
});
// → GREEN: 2026-03-23 16:31 (015c136) — AuthMiddleware implement edildi
```

### 5.2 Unit Test Kapsamı

Tüm servisler **Jest** framework'ü ile test edilmiştir. Her test dosyası bağımlılıklarını `jest.fn()` ile mock'layarak yalnızca kendi servis mantığını test eder — veritabanı veya HTTP bağlantısı gerektirmez.

| Servis | Test Dosyası | Test Sayısı | Kapsanan Senaryolar |
|---|---|---|---|
| **auth-service** | `auth.test.js` | 7 | register (başarı, eksik alan, mükerrer kullanıcı), login (başarı, yanlış şifre, kullanıcı yok), verifyToken (geçerli/geçersiz) |
| **dispatcher** | `auth.test.js`, `proxy.test.js`, `new-services.test.js` | 22 | 401 (token yok), 401/503 (geçersiz/servis kapalı), proxy yönlendirme, yeni servis rotaları |
| **event-service** | `event.test.js` | 10 | getAllEvents, getById (bulundu/bulunamadı), createEvent (başarı, validasyon, geçersiz type, bildirim tetikleme), updateEvent, deleteEvent |
| **ticket-service** | `ticket.test.js` | 15 | createTicket (başarı, eksik alan, event bulunamadı, kapasite hatası, fire-and-forget, fiyat iletimi), getById, **updateTicket** (başarı, validasyon, bulunamadı), getAllTickets, deleteTicket |
| **notification-service** | `notification.test.js` | 8 | createTicketNotification (başarı, eksik userId, isteğe bağlı ticketId), createNewEventNotifications (kullanıcılı/kullanıcısız), getAllNotifications, getById, delete |
| **user-profile-service** | `userprofile.test.js` | 12 | addPurchasedType (validasyon, yeni/var olan profil), RFM skoru (5 recency + 5 frequency + 5 monetary eşiği), affinityScore algoritması, getUsersByPurchasedType (yüksek/düşük skor filtresi), deleteProfile |
| **Toplam** | — | **74** | — |

**Servis bazlı test sonuçları:**

```
auth-service     → PASS  7/7   tests
dispatcher       → PASS  22/22 tests
event-service    → PASS  10/10 tests
ticket-service   → PASS  15/15 tests  (updateTicket dahil)
notification-service → PASS  8/8  tests
user-profile-service → PASS  12/12 tests
─────────────────────────────────────
TOPLAM           → PASS  74/74 tests — %100 başarı
```

**Test çalıştırma (her servis dizininde):**
```bash
cd dispatcher         && npm test
cd auth-service       && npm test
cd event-service      && npm test
cd ticket-service     && npm test
cd notification-service   && npm test
cd user-profile-service   && npm test
```

**Mock Stratejisi — Dependency Injection'ın Test Avantajı:**

```js
// ticket.test.js — gerçek MongoDB veya HTTP bağlantısı yok
const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),   // updateTicket testi için
  deleteById: jest.fn(),
};
const mockAxios = {
  get: jest.fn(),          // event-service çağrısı mock
  post: jest.fn().mockResolvedValue({}),
  put: jest.fn().mockResolvedValue({})
};
service = new TicketService(mockRepo, mockAxios);
// → Servis izole, hızlı, deterministic
```

Constructor Injection sayesinde testlerde gerçek bağımlılıklar sahte nesnelerle değiştirilebilir. Bu, SOLID'in Dependency Inversion prensibinin test edilebilirlik üzerindeki doğrudan faydası.

### 5.3 k6 Yük Testi

#### Test Ortamı ve Araçlar

| Araç | Versiyon | Çalıştırma Yöntemi |
|---|---|---|
| **k6** | Grafana k6 (Docker image) | `docker compose --profile testing run --rm k6` |
| **Test Dosyası** | `load-test.js` | Docker iç ağı üzerinden dispatcher'a bağlanır |
| **Hedef URL** | `http://dispatcher:3000` | Internal Docker DNS — dış ağ bypass yok |

#### Test Mimarisi ve Senaryo Tasarımı

```
k6 (Docker container — internal network)
  └── BASE_URL = http://dispatcher:3000
        │
        ├── Senaryo 1 — load_50:   50 VU × 30s  (başlangıç: 0s)
        ├── Senaryo 2 — load_100: 100 VU × 30s  (başlangıç: 35s)
        ├── Senaryo 3 — load_200: 200 VU × 30s  (başlangıç: 70s)
        └── Senaryo 4 — load_500: 500 VU × 30s  (başlangıç: 105s)
```

Her VU iterasyonu sırasıyla şu istekleri gönderir:

| Adım | Endpoint | Servis Zinciri |
|---|---|---|
| 1 | `POST /api/auth/register` (setup) | Dispatcher → auth-service → Redis |
| 2 | `POST /api/auth/login` (setup) | Dispatcher → auth-service → Redis |
| 3 | `POST /api/events` (setup) | Dispatcher → event-service → MongoDB |
| 4 | `GET /api/events` | Dispatcher → event-service → MongoDB |
| 5 | `POST /api/tickets` | Dispatcher → ticket-service → event-service + user-profile-service + notification-service |
| 6 | `GET /api/users/:userId` | Dispatcher → user-profile-service → MongoDB _(50/100 VU'da)_ |

> **Kritik:** `POST /api/tickets` en ağır endpoint'tir — 3 mikroservisi senkron/asenkron olarak çağırır. Bu senaryo gerçek bir konser biletleme durumunu simüle eder.

#### Threshold (Eşik) Tanımları

```javascript
thresholds: {
  'http_req_duration':    ['p(95)<5500'],   // Tüm istekler geneli
  'server_error_rate':    ['rate<0.05'],    // 5xx + bağlantı hatası < %5
  'response_time_50vus':  ['p(95)<500'],    // 50 VU senaryosu
  'response_time_100vus': ['p(95)<750'],    // 100 VU senaryosu
  'response_time_200vus': ['p(95)<1500'],   // 200 VU senaryosu
  'response_time_500vus': ['p(95)<3500'],   // 500 VU senaryosu
}
```

#### Test Sonuçları

| Senaryo | EZ Kullanıcı | Ortalama | Medyan | p(90) | p(95) | Eşik | Sonuç |
|---|---|---|---|---|---|---|---|
| load_50 | 50 VU | 39.19 ms | 29.51 ms | 72.54 ms | **95.67 ms** | < 500 ms | ✅ PASS |
| load_100 | 100 VU | 102.64 ms | 103.85 ms | 173.85 ms | **188.31 ms** | < 750 ms | ✅ PASS |
| load_200 | 200 VU | 179.53 ms | 167.22 ms | 226.88 ms | **263.14 ms** | < 1500 ms | ✅ PASS |
| load_500 | 500 VU | 1.00 s | 1.00 s | 1.07 s | **1.09 s** | < 3500 ms | ✅ PASS |
| http_req_duration (genel) | — | 433.99 ms | 126.36 ms | 1.91 s | **1.99 s** | < 5500 ms | ✅ PASS |
| http_req_failed | — | — | — | — | **0.00%** | — | ✅ PASS |
| server_error_rate | — | — | — | — | **0.00%** | < 5% | ✅ PASS |

**Toplam İstatistikler:**

| Metrik | Değer |
|---|---|
| Toplam HTTP İsteği | **35,154** |
| Toplam İterasyon | **15,538** |
| Throughput | **255.6 req/s** |
| İterasyon Hızı | **112.9 iter/s** |
| Alınan Veri | 21 MB |
| Gönderilen Veri | 10 MB |
| Ortalama İterasyon Süresi | 1.68 s |

**k6 Resmi Çıktı (THRESHOLDS özeti):**

```
  █ THRESHOLDS

    http_req_duration
    ✓ 'p(95)<5500' p(95)=1.99s

    response_time_100vus
    ✓ 'p(95)<750' p(95)=188.31ms

    response_time_200vus
    ✓ 'p(95)<1500' p(95)=263.14ms

    response_time_500vus
    ✓ 'p(95)<3500' p(95)=1.09s

    response_time_50vus
    ✓ 'p(95)<500' p(95)=95.67ms

    server_error_rate
    ✓ 'rate<0.05' rate=0.00%
```

> **Not:** Testler Docker iç ağında çalıştırılmıştır. Windows TCP port tükenmesi (TIME_WAIT) nedeniyle 500 VU testi Docker iç ağı üzerinden gerçekleştirilmiştir. 500 VU'da `POST /api/tickets` yanıt süresi softcheck'i (%89 pass, 1661 iterasyon > 2s) resmi threshold değil; tüm resmi eşikler yeşil kaldı.

#### Hata Senaryosu Testi (`load-test-error.js`)

Sistemin hatalı girdilere karşı davranışı ayrı bir test dosyasıyla doğrulanmıştır. Bu testlerin amacı `200 OK + {error: true}` anti-pattern'inin olmadığını kanıtlamaktır.

| Test Senaryosu | Gönderilen İstek | Beklenen HTTP Kodu | Gerçekleşen | Sonuç |
|---|---|---|---|---|
| Token olmadan istek | `GET /api/events` (header yok) | 401 | 401 | ✅ |
| Geçersiz/süresi dolmuş token | `GET /api/events` (yanlış token) | 401 | 401 | ✅ |
| Olmayan event ile bilet | `POST /api/tickets` (geçersiz event_id) | 404 | 404 | ✅ |
| Eksik alanla etkinlik oluşturma | `POST /api/events` (name yok) | 400 | 400 | ✅ |
| Admin yetkisi gereken işlem | `DELETE /api/events` (user rolü) | 403 | 403 | ✅ |

### 5.4 Grafana Gözlemlenebilirlik Dashboard'u

Dispatcher servisinden toplanan Prometheus metrikleri 10 panelli bir Grafana dashboard'unda gerçek zamanlı görselleştirilir. Dashboard'a `http://localhost:3001` adresinden `admin / admin` kimlik bilgileriyle erişilir.

**Prometheus Scrape Konfigürasyonu:**
```yaml
scrape_configs:
  - job_name: 'dispatcher-logs'
    static_configs:
      - targets: ['dispatcher:3000']
    scrape_interval: 15s
    metrics_path: /metrics
```

**Dışa Aktarılan Metrikler (dispatcher `/metrics` endpoint'i):**

| Metrik Adı | Tür | Etiketler | Açıklama |
|---|---|---|---|
| `http_requests_total` | Counter | method, route, status | Kümülatif istek sayısı |
| `http_request_duration_milliseconds` | Histogram | method, route, status | Yanıt süresi dağılımı |
| Bucket sınırları | — | — | 50, 100, 200, 300, 400, 500, 750, 1000 ms |

---

#### Dashboard Görünümü — KPI ve Zaman Serisi Paneller

![Grafana Genel Bakış](docs/grafana-overview.png)

Yukarıdaki ekran görüntüsü yük testi sonrasında alınmıştır. Dashboard şu panelleri içermektedir:

**KPI İstatistik Panelleri (üst satır):**

| Panel | Test Sonrası Değer | Yük Testi Sırasındaki Pik |
|---|---|---|
| İstek Hızı (req/s) | 0.0667 req/s | ~80+ req/s (500 VU anında) |
| Toplam İstek | **21.2K** (bu ekran görüntüsü önceki test) | Test başına 35K+ |
| Hata Oranı | **%0** | Test boyunca sıfır kaldı |
| P95 Yanıt Süresi | 47.5 ms | 500 VU'da 1.09s |

**Rota Bazlı İstek Dağılımı (Time Series):**

Grafik, senaryolar ilerledikçe `/api/events` ve `/api/tickets` rotalarının dominant olduğunu gösterir. `GET /api/users/*` rotaları 50 ve 100 VU senaryolarında ek yük oluşturmuş, 200+ VU'da proxy timeout riskini azaltmak için devre dışı bırakılmıştır.

**HTTP Durum Kodu Dağılımı (Bar Chart):**

Yalnızca `200 OK` ve `201 Created` kodları görünür — 4xx/5xx hiç oluşmamıştır. Bu, hem auth middleware'in hem de iş mantığı validasyonlarının doğru çalıştığını kanıtlar.

---

#### Dashboard Görünümü — Yanıt Süresi Persentilleri ve Log Tablosu

![Grafana Yanıt Süresi ve Log Tablosu](docs/grafana-overview2.png)

**Yanıt Süresi Persentilleri (Time Series):**

| Persentil | Değer (test sonrası) | Anlam |
|---|---|---|
| P50 (medyan) | ~25 ms | İsteklerin yarısı bu sürenin altında yanıtlandı |
| P90 | ~45 ms | İsteklerin %90'ı bu sürenin altında |
| P95 | ~47.5 ms | Resmi eşik metriği — yük altında 1.09s (500 VU) |
| P99 | ~60 ms | Uç durum yanıt süresi |

**4xx/5xx Hata Trendi:**

Grafik boyunca düz sıfır çizgisi — sistemde hiç sunucu hatası oluşmamıştır. Bu, hata yönetiminin ve mikroservis iletişiminin sağlıklı çalıştığını gösterir.

**HTTP Metod Dağılımı:**

GET ve POST metodları yaklaşık eşit dağılım göstermiştir:
- `GET`: `/api/events` listesi + `/api/users/:id` profil sorguları
- `POST`: `/api/tickets` bilet oluşturma istekleri

---

#### İstek Log Tablosu (Detaylı)

![Grafana İstek Log Tablosu](docs/grafana-log-table.png)

Bu tablo, Prometheus'un `sum by(method, route, status)(http_requests_total)` sorgusuyla üretilir ve dispatcher'dan geçen her isteğin method/rota/durum bazında dökümünü verir.

| Method | Rota | HTTP Durum | İstek Sayısı | Yorum |
|---|---|---|---|---|
| GET | `/api/events` | 200 | ~17.5K | Tüm senaryolarda her iterasyonda çalıştı |
| POST | `/api/tickets` | 201 | ~17.5K | 3-servis zinciri — tüm senaryolarda başarılı |
| GET | `/api/users/load_user_*` | 200 | ~1.5K | Yalnızca 50 ve 100 VU senaryolarında |
| GET | `/metrics` | 200 | ~20 | Prometheus'un 15s'de bir scrape isteği |
| POST | `/api/auth/register` | 201 | 1 | k6 setup() aşamasında admin kaydı |
| POST | `/api/auth/login` | 200 | 1 | k6 setup() aşamasında token alımı |
| POST | `/api/events` | 201 | 1 | k6 setup() aşamasında test etkinliği |

> Tablodaki sıfır 4xx/5xx satırı, yük testi boyunca kimlik doğrulama, yönlendirme ve iş mantığı katmanlarında hata üretilmediğini kanıtlar.

**Dashboard Panel → Prometheus Sorgu Eşleştirmesi:**

| Panel | Panel Tipi | Prometheus Sorgusu |
|---|---|---|
| İstek Hızı (req/s) | Stat | `rate(http_requests_total[1m])` |
| Toplam İstek | Stat | `sum(http_requests_total)` |
| Hata Oranı | Stat | `sum(rate(http_requests_total{status=~"[45].."}[1m]))` |
| P95 Yanıt Süresi | Stat | `histogram_quantile(0.95, rate(http_request_duration_milliseconds_bucket[1m]))` |
| Rota Bazlı Dağılım | Time Series | `sum by(route)(rate(http_requests_total[1m]))` |
| Yanıt Süresi P50/P90/P95/P99 | Time Series | `histogram_quantile(0.X, rate(...bucket[1m]))` |
| HTTP Durum Kodu | Bar Chart | `sum by(status)(http_requests_total)` |
| 4xx/5xx Hata Trendi | Time Series | `sum(rate(http_requests_total{status=~"[45].."}[1m]))` |
| HTTP Metod Dağılımı | Time Series | `sum by(method)(rate(http_requests_total[1m]))` |
| İstek Log Tablosu | Table | `sum by(method,route,status)(http_requests_total)` |

### 5.5 Servis Portları ve Araçlar

| Servis | Port | Açıklama |
|---|---|---|
| Dispatcher (API) | `3000` | Tek dış erişim noktası |
| Grafana | `3001` | Prometheus dashboard |
| Event MongoDB Express | `8081` | Veritabanı UI |
| Ticket MongoDB Express | `8082` | Veritabanı UI |
| Redis Commander | `8083` | Redis UI (auth + dispatcher) |
| Notification Mongo | `8084` | Veritabanı UI |
| UserProfile Mongo | `8085` | Veritabanı UI |

---

## 6. Sonuç ve Tartışma

### Başarılar

**RMM Level 3 eksiksiz tamamlandı (+5 puan):**
Tüm POST/GET yanıtları `_links` hipermedia bağlantıları içeriyor. Liste yanıtları (`getAllTickets`, `getAllNotifications`) ve toplu oluşturma yanıtları (`createNewEventNotifications`) dahil HATEOAS sözleşmesi tam uygulandı.

**SOLID prensipleri tutarlı biçimde uygulandı:**
6 servis, 24+ sınıf boyunca constructor injection kullanıldı. `EventService` constructor'ı `notificationServiceUrl` parametresi kabul ederek D prensibini `process.env` doğrudan kullanımından kurtardı.

**TDD döngüsü tamamlandı:**
Dispatcher için RED testler (commit `8603e14`) fonksiyonel koddan önce yazıldı. 80+ test tümü başarıyla geçiyor.

**500 VU altında sıfır hata:**
3 servis zinciri içeren `POST /api/tickets` (event-service + user-profile-service + notification-service) 500 eş zamanlı kullanıcı altında `p(95) = 963ms`, `server_error_rate = 0.00%` ile çalıştı.

**Gözlemlenebilirlik:**
Prometheus metrikleri + 10 panelli Grafana dashboard ile istek hızı, hata oranı ve yanıt süresi persentilleri canlı izlenebiliyor.

**Network izolasyonu:**
Mikroservislere doğrudan dış erişim kapalı; yalnızca dispatcher 3000 portunu dışarıya açıyor.

### Sınırlılıklar

**Düz metin şifre depolama:**
`AuthRepository` şifreleri plaintext olarak Redis'te saklar. Üretim ortamı için `bcrypt` veya `argon2` ile hashleme gereklidir.

**Kapasite atomic değil:**
`ticket-service` event kapasitesini okuyup azaltmıyor; yoğun eş zamanlı satışta aynı koltuk birden fazla kez satılabilir. MongoDB transactions veya Redis `DECR` ile çözülebilir.

**Fire-and-forget retry yok:**
Bildirim ve profil güncelleme çağrıları başarısız olduğunda yeniden deneme mekanizması yoktur; yalnızca konsola uyarı yazılır.

**Opak token, JWT değil:**
`crypto.randomBytes(32)` ile üretilen tokenlar Redis'e bağımlıdır. JWT kullanılsaydı auth-service'e her istekte round-trip gerekmezdi.

### Ölçeklenebilirlik Analizi

Mevcut sistem 500 eş zamanlı kullanıcıda sıfır hatayla çalışmıştır. Daha büyük ölçeklerde öngörülen darboğazlar:

| Ölçek | Beklenen Davranış | Gerekli Ek Yapı |
|---|---|---|
| 500 EK (mevcut) | p(95) = 1.09s, hata = 0% | — |
| 2.000 EK | ticket-service zinciri (3 servis) darboğaz | Ticket-service yatay ölçekleme |
| 10.000 EK | Auth Redis tek nokta arızası riski | Redis Cluster veya JWT |
| 100.000 EK | MongoDB yazma kapasitesi sınırı | Sharding, okuma replikası |
| 1M+ EK | Dispatcher tek instance'ı yetersiz | Nginx/L7 LB önüne dispatcher cluster |

### Öğrenilen Dersler

1. **Fire-and-forget doğru seçimdi:** Bilet satışı anında user-profile ve notification güncellemelerini senkron yapmak p(95)'i ~3x artırırdı. Asenkron tasarım 500 VU'da 1.09s'de tuttu.
2. **Docker iç ağı stres testini kolaylaştırdı:** Windows'ta dış ağ üzerinden 500 VU testi TCP port tükenmesine yol açarken Docker bridge üzerinden sorunsuz çalıştı.
3. **DI (Dependency Injection) test süresini kısalttı:** 74 test, MongoDB/Redis bağlantısı gerektirmeden çalışır — CI/CD pipeline maliyeti minimumdur.
4. **RMM Level 3 geç eklendi:** HATEOAS `_links` baştan planlanmış olsaydı client-navigation testleri de yazılabilirdi.

### Geliştirme Önerileri

1. **Bcrypt ile şifre hashleme** — `AuthService.register()` içinde güvenli hash
2. **JWT ile stateless auth** — Redis round-trip ortadan kalkar, yatay ölçekleme kolaylaşır
3. **Atomic kapasite kontrolü** — MongoDB transactions ile double-booking engeli
4. **Message Queue (RabbitMQ/Kafka)** — Fire-and-forget yerine garantili mesaj teslimi ve dead-letter queue
5. **API rate limiting** — Dispatcher üzerinde IP başına istek sınırı (express-rate-limit)
6. **Distributed tracing** — OpenTelemetry ile trace ID'nin tüm servis zincirine yayılması

---

---

## 7. Gereksinimlerin Kontrol Listesi

| # | Gereksinim | Durum | Kanıt / Konum |
|---|---|---|---|
| 1 | Min 4 bağımsız servis | ✅ | dispatcher + auth + event + ticket + notification + user-profile = **6 servis** |
| 2 | Dispatcher tek giriş noktası | ✅ | Yalnızca `0.0.0.0:3000` dışarıya açık (Bölüm 3.12) |
| 3 | Yetkilendirme Dispatcher'da merkezi | ✅ | `AuthMiddleware.verifyToken()` tüm istekleri filtreler (Bölüm 3.3) |
| 4 | NoSQL'de yetki bilgileri | ✅ | Redis: `auth:<token>` ve `users` hash (Bölüm 4.4) |
| 5 | Uygun HTTP hata kodları (200+error yok) | ✅ | 401/403/404/503 — hata senaryosu tablosu (Bölüm 5.3) |
| 6 | Min 2 fonksiyonel mikroservis | ✅ | event, ticket, notification, user-profile = **4 mikroservis** |
| 7 | Her servise izole NoSQL DB | ✅ | 4 MongoDB + 2 Redis instance (Bölüm 3.9 ER diyagramı) |
| 8 | JSON veri transferi | ✅ | Axios `Content-Type: application/json`, tüm servis arası iletişim |
| 9 | Auth yalnızca Dispatcher'da, Network Isolation | ✅ | `docker ps` kanıtı (Bölüm 3.12) |
| 10 | OOP + SOLID zorunlu | ✅ | 4 katman + DI (Bölüm 4.2, 4.3, 4.6) |
| 11 | Dockerized — `docker-compose up` | ✅ | 19 container, tek komutla (Bölüm 3.10) |
| 12 | TDD + Jest (test önce commit) | ✅ | Git zaman damgaları kanıtı (Bölüm 5.1) |
| 13 | RMM Level 2 | ✅ | GET/POST/PUT/DELETE + doğru status kodları (Bölüm 2.2) |
| 14 | RMM Level 3 (+5 puan) | ✅ | `_links` tüm response'larda (Bölüm 2.2, 3.5-3.8) |
| 15 | Gerçek NoSQL DB (JSON dosya değil) | ✅ | MongoDB 6 + Redis 7 (Bölüm 4.4) |
| 16 | Dispatcher DB diğerlerinden izole | ✅ | `dispatcher-redis` ayrı instance (Bölüm 3.9) |
| 17 | Grafana görselleştirme + log tablosu | ✅ | 10 panelli dashboard + istek log tablosu (Bölüm 5.4) |
| 18 | k6 yük testi (50/100/200/500 EK) | ✅ | Tüm threshold'lar yeşil (Bölüm 5.3) |
| 19 | Yük testi sonuçları raporda ve UI'da | ✅ | Tablo (5.3) + Grafana ekran görüntüleri (5.4) |

---

## 8. Kaynaklar

### Mimari ve Tasarım

1. **Fowler, M.** (2010, 18 Mart). *Richardson Maturity Model: steps toward the glory of REST.* martinfowler.com.
   [https://martinfowler.com/articles/richardsonMaturityModel.html](https://martinfowler.com/articles/richardsonMaturityModel.html)
   — Projede uygulanan RMM Level 0-3 açıklaması için birincil kaynak. HATEOAS uygulamasının teorik zemini.

2. **Fielding, R. T.** (2000). *Architectural Styles and the Design of Network-based Software Architectures* (Doktora tezi). University of California, Irvine. Bölüm 5: REST.
   [https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
   — REST mimarisini ve HATEOAS (Hypermedia As The Engine Of Application State) kısıtını tanımlayan temel akademik kaynak.

3. **Newman, S.** (2021). *Building Microservices: Designing Fine-Grained Systems* (2. baskı). O'Reilly Media. ISBN: 978-1-492-03402-5.
   [https://samnewman.io/books/building_microservices/](https://samnewman.io/books/building_microservices/)
   — Mikroservis mimarisi, API Gateway deseni, servis izolasyonu ve network boundary kararları.

4. **Richardson, C.** (t.y.). *Pattern: API Gateway / Backends for Frontends.* microservices.io.
   [https://microservices.io/patterns/apigateway.html](https://microservices.io/patterns/apigateway.html)
   — Dispatcher'ın tasarımında referans alınan API Gateway pattern dokümantasyonu.

5. **Martin, R. C.** (2000). *Design Principles and Design Patterns.* objectmentor.com.
   — SOLID prensiplerini (SRP, OCP, LSP, ISP, DIP) tanımlayan orijinal makale. Projede 4 katmanlı OOP mimarisinin (Router-Controller-Service-Repository) teorik dayanağı.

### Test-Driven Development

6. **Beck, K.** (2002). *Test Driven Development: By Example.* Addison-Wesley Professional. ISBN: 978-0-321-14653-3.
   — TDD Red-Green-Refactor döngüsü ve unit test prensipleri. Projede dispatcher geliştirilirken uygulanan metodoloji.

### RFM Analizi

7. **Wansbeek, T., & Bult, J. R.** (1995). *Optimal Selection for Direct Mail.* Marketing Science, 14(4), 378–394.
   — RFM modelinin (Recency, Frequency, Monetary) akademik literatürdeki ilk formülasyonlarından biri. Projede `UserProfileService._calculateRFM()` metodunun teorik dayanağı.

8. **Hosseini, M. S., Maleki, A., & Gholamian, M. R.** (2010). *Cluster analysis using data mining approach to develop CRM methodology to assess the customer loyalty.* Expert Systems with Applications, 37(7), 5259–5264.
   [https://www.tandfonline.com/doi/full/10.1080/23311916.2022.2162679](https://www.tandfonline.com/doi/full/10.1080/23311916.2022.2162679)
   — RFM skorlamasının müşteri segmentasyonunda kullanımını inceleyen akademik çalışma. Affinity score algoritmasının literatür dayanağı.

### Gözlemlenebilirlik ve Performans

9. **Turnbull, J.** (2018). *Monitoring with Prometheus.* ISBN: 978-0-988-82028-9.
   — Prometheus metrik türleri (Counter, Histogram), PromQL ve Grafana entegrasyonu. Projede `http_requests_total` ve `http_request_duration_milliseconds` metriklerinin tasarımında referans alındı.

10. **Grafana Labs.** (2024). *Grafana Documentation — Dashboard Provisioning.* grafana.com.
    [https://grafana.com/docs/grafana/latest/administration/provisioning/](https://grafana.com/docs/grafana/latest/administration/provisioning/)
    — Dashboard ve datasource otomatik provisioning konfigürasyonu (`grafana/provisioning/` dizini).

11. **Grafana k6.** (2024). *k6 Documentation — Scenarios and Thresholds.* k6.io.
    [https://grafana.com/docs/k6/latest/](https://grafana.com/docs/k6/latest/)
    — VU (Virtual User) senaryoları, threshold tanımları ve custom trend/rate metric kullanımı. `load-test.js` dosyasının teknik dayanağı.

### Altyapı ve Veri Katmanı

12. **Merkel, D.** (2014). *Docker: Lightweight Linux containers for consistent development and deployment.* Linux Journal, 2014(239), 2.
    [https://arxiv.org/pdf/1410.0846](https://arxiv.org/pdf/1410.0846)
    — Container teknolojisi ve Docker'ın servis izolasyonundaki rolü. Projenin `docker-compose.yml` ve network isolation tasarımının akademik dayanağı.

13. **MongoDB Inc.** (2024). *MongoDB Documentation — Data Modeling Introduction.* mongodb.com.
    [https://www.mongodb.com/docs/manual/core/data-modeling-introduction/](https://www.mongodb.com/docs/manual/core/data-modeling-introduction/)
    — Gömülü belge (embedded document: `typeStats`, `rfmScore`) ve referans tabanlı ilişki tasarımı (event_id, userId cross-service references).

14. **Redis Ltd.** (2024). *Redis Documentation — Data Types: Hashes and Strings.* redis.io.
    [https://redis.io/docs/latest/develop/data-types/](https://redis.io/docs/latest/develop/data-types/)
    — Auth token depolama (`auth:<token>` key, TTL:3600s) ve kullanıcı hash yapısı (`users` hash) için referans.

### Kütüphane Dokümantasyonları

15. **OpenJS Foundation.** (2024). *Express.js 5.x API Reference.* expressjs.com.
    [https://expressjs.com/en/5x/api.html](https://expressjs.com/en/5x/api.html)
    — Router, middleware zinciri, hata yönetimi. Tüm mikroservislerin HTTP katmanında kullanıldı.

16. **Axios Contributors.** (2024). *Axios Documentation.* axios-http.com.
    [https://axios-http.com/docs/intro](https://axios-http.com/docs/intro)
    — Servisler arası HTTP iletişimi (event-service → notification-service gibi). Fire-and-forget pattern'inde timeout ve hata yönetimi.

---

## Hızlı Başlangıç

```bash
# Tüm sistemi başlat
docker compose up --build

# Yük testi (50/100/200/500 VU)
docker compose --profile testing run --rm k6

# Unit testler (her servis için)
cd dispatcher && npm test
```

---

