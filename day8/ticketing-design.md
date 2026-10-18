# TicketHub Design

TicketHub is a website that sells tickets for concerts and events. Most days it is quiet, but when a very popular concert goes on sale, a huge crowd arrives at once and every person wants a seat. The design has to work on both kinds of day, and it must never sell the same seat twice.

## 1. Requirements

### Functional
- Users can register, log in and browse events.
- Users can see an event's seat map and which seats are free.
- A user can **hold** seats for 10 minutes while they pay.
- A user can **pay** for the held seats and receive tickets.
- A user can view their tickets.

### Non-functional
- **Speed:** browsing answers in under 300 ms, even during a sale.
- **Correctness:** a seat is never sold twice, and a user is never charged without getting a ticket.
- **Fairness:** during a sale, people are served in the order they arrived, and bots cannot jump the line.
- **Availability:** the site must stay up during a sale, which is when it matters most.
- **Security:** all traffic uses HTTPS, card details go only to the payment provider, and users only see their own tickets.

## 2. Estimates

**Facts:** 2 million registered users. On a normal day, 50,000 people visit and each views 10 pages, and 5,000 tickets are sold. In a big sale, 200,000 people try to buy 20,000 seats within 10 minutes (600 seconds).

| | Normal day | Big sale (first 10 minutes) |
|---|---|---|
| Page views | 50,000 × 10 = 500,000 per day, so about **6 per second** (30 at 5× peak) | 200,000 × 10 = 2,000,000 in 600 s, so about **3,300 per second** |
| Purchases | 5,000 per day, so about **0.06 per second** | at most 20,000 in 600 s, so **33 per second** |
| Seat hold attempts | negligible | about 3 attempts each, so 600,000 in 600 s, or **1,000 per second** |

**Comparison:** the sale is about **550 times** the normal average load (and over 100 times the normal peak). It also has a strange shape: 200,000 people compete for 20,000 seats, so 9 out of 10 will fail. About 1,000 hold attempts arrive each second, and only about 33 per second can succeed. A normal day is read-heavy (about 100 page views for each purchase), while the sale is a rush of reads *and* a contest for the same rows. The system must be designed for the sale and not for the average day.

## 3. API

| # | Method | Path | Description | Success |
|---|--------|------|-------------|---------|
| 1 | GET | `/events` | Browse upcoming events. | 200 |
| 2 | GET | `/events/{id}` | Get one event's details. | 200 |
| 3 | GET | `/events/{id}/seats` | View the seat map and which seats are free. | 200 |
| 4 | POST | `/holds` | Hold seats for 10 minutes. Body: `{ "event_id": 7, "seat_ids": [101, 102] }` | 201 |
| 5 | DELETE | `/holds/{id}` | Release a hold early. | 204 |
| 6 | POST | `/orders` | Pay for a hold. Body: `{ "hold_id": 55, "payment_token": "tok_123" }`, with an `Idempotency-Key` header. | 201 |
| 7 | GET | `/me/tickets` | View my tickets. | 200 |

**Errors:** `400` invalid request, `401` not logged in, `404` event or hold not found, `409 Conflict` a seat was just taken by someone else, `410 Gone` the hold has expired, and `402` payment failed. The `Idempotency-Key` header means that if a payment request is sent twice (for example after a network retry), the customer is charged only once.

## 4. Data model

```sql
CREATE TABLE users (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  venue      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  on_sale_at TEXT NOT NULL
);

CREATE TABLE seats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id        INTEGER NOT NULL REFERENCES events(id),
  section         TEXT NOT NULL,
  row_label       TEXT NOT NULL,
  seat_number     INTEGER NOT NULL,
  price_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'held', 'sold')),
  held_by         INTEGER REFERENCES users(id),
  hold_expires_at TEXT,
  UNIQUE (event_id, section, row_label, seat_number)
);

CREATE TABLE orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  total_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  INTEGER NOT NULL REFERENCES orders(id),
  seat_id   INTEGER NOT NULL UNIQUE REFERENCES seats(id),
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Relationships**
- **events to seats: one-to-many.** An event has thousands of seats, and each seat belongs to one event.
- **users to orders: one-to-many.** A user can place many orders, and each order belongs to one user.
- **orders to tickets: one-to-many.** An order can contain several tickets.
- **seats to tickets: one-to-one.** A seat can have at most one ticket (enforced by `UNIQUE (seat_id)`).
- **users to seats (holds):** `held_by` records who is currently holding a seat.

## 5. How the design prevents two people buying the same seat

The rule is: **the database decides who gets a seat, never the cache and never the app server.** Three layers protect each seat.

**Layer 1: an atomic "claim" (the hold).** To hold a seat, the app runs one `UPDATE` that only succeeds if the seat is still free:

```sql
UPDATE seats
SET status = 'held', held_by = 5, hold_expires_at = datetime('now', '+10 minutes')
WHERE id = 101
  AND (status = 'available'
       OR (status = 'held' AND hold_expires_at < datetime('now')));
```

If two people click the same seat at the same moment, the database processes the two updates one after the other, because each one locks that seat's row. The first one changes it to `held`. When the second one runs, the seat no longer matches the `WHERE` condition, so **0 rows change**. The app sees "0 rows updated" and returns `409 Conflict`. Only one person can win. Expired holds count as free, so seats are never stuck forever.

**Layer 2: a transaction for several seats.** When someone holds several seats, all the updates run inside one transaction, in order of seat id. If any single seat fails, the whole transaction is rolled back, so the user gets either all their seats or none, and no seats stay half-held.

**Layer 3: constraints as a last line of defence.** At payment, one transaction confirms the seats are still held by this user and not expired (`status = 'held' AND held_by = 5 AND hold_expires_at > now`), marks them `sold`, creates the order and inserts the tickets. Even if a bug in the app code got this wrong, `UNIQUE (seat_id)` on `tickets` makes it impossible for one seat to get two tickets, and `UNIQUE (event_id, section, row_label, seat_number)` stops the same physical seat existing twice. If the hold expired while a customer was paying, the order fails and the payment is refunded automatically.

## 6. Architecture

```
        Client (browser or phone)
           |                |
     find the site     send requests
           v                v
        +-----+      +-----------+
        | DNS |      |    CDN    |  static files, event pages
        +-----+      +-----+-----+
                           | API requests
                           v
                   +----------------+
                   | Waiting room   |  lets people in at a fixed rate
                   +-------+--------+
                           v
                   +----------------+
                   | Load balancer  |
                   +-------+--------+
                           v
                 +---------------------+
                 | App servers (many)  |
                 +---+-----+-----+--+--+
                     |     |     |  |
         +-----------+     |     |  +--------------+
         v                 v     v                 v
    +---------+   +----------+  +---------+  +------------------+
    |  Cache  |   | Primary  |  |  Queue  |  | Payment provider |
    +---------+   | database |  +----+----+  | (external)       |
                  +----+-----+       |       +------------------+
                       |             v
                       v         +---------+
                 +-----------+   | Workers |
                 |  Read     |   +---------+
                 |  replica  |
                 +-----------+
```

### Components, one sentence each
- **Client:** shows events and the seat map and sends the user's requests.
- **DNS:** turns the site name into an address, so traffic can be pointed at healthy servers.
- **CDN:** serves static files and event pages from locations near the user, so those requests never reach our servers.
- **Waiting room:** puts the crowd into a fair first-come line and admits people at a rate the system can handle, so 200,000 people cannot flatten the site at the same moment.
- **Load balancer:** spreads requests over the app servers and skips any that are down.
- **App servers:** run the booking logic and keep no state, so many more can be added before a sale.
- **Cache:** stores event details and the seat map for a second or two, so thousands of people looking at seats do not each hit the database.
- **Primary database:** holds all seats, holds, orders and tickets, and is the single place that decides who gets a seat.
- **Read replica:** answers read-only queries such as "my tickets", keeping the primary free for seat claims.
- **Queue and workers:** do slow jobs outside the request, such as emailing tickets, clearing expired holds and handling payment confirmations.
- **Payment provider:** takes card payments, so we never store card details ourselves.

### How it survives the big sale
- The **waiting room** turns a spike of 333 arrivals per second into a steady flow, which also makes the sale fair.
- The **CDN and cache** absorb the roughly 3,300 page views per second, so the database sees only the 1,000 hold attempts per second, and of those only about 33 per second succeed.
- All seat changes go through **one primary database** using the atomic updates in section 5. Failed attempts cost only a quick no-match update.
- **Extra app servers** are added before the sale starts, because the on-sale time is known in advance.
- **Rate limits** per user and per address slow down bots.
- Slow work goes to the **queue**, and several servers of each kind avoid single points of failure.

## 7. Trade-offs

- **Fairness and stability versus speed (waiting room).** The waiting room keeps the site alive and the line fair, but it makes people wait, and it adds a component to build and run. Without it the site would crash, and a crash is worse for everyone.
- **Fresh seat map versus load (cache).** Caching the seat map for a second or two means a user may click a seat that was just taken. The atomic update catches this and returns `409` with a friendly message, so the cost is a little annoyance and the gain is a database that survives.
- **Hold length (10 minutes).** A longer hold gives people time to pay, but seats that are held and never bought stay unavailable to others. A shorter hold frees seats sooner, but customers who pay slowly lose them. Ten minutes is a compromise.
- **Consistency versus write scaling (one primary).** One primary keeps seat decisions simple and correct. Its limit is about 33 sales per second here, which it handles easily. If it ever became too busy, events could be spread over several databases, one event per database, without losing correctness.