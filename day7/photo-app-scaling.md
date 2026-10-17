# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from the people they follow. This plan estimates the load and designs a system that can handle it.

## 1. Assumptions

- There are **10,000,000 registered users**, and **10% are active each day**.
- Each active user **uploads 1 photo per day** and **views 50 feed pages per day**.
- An average photo is **2 MB**, and each photo also gets a **50 KB thumbnail**.
- Each feed page view is one request to the server.
- Activity is spread evenly over the 24 hours of the day for the average. **Peak traffic is 5 times the average**.
- A day has 86,400 seconds, a year has 365 days, and 1 TB is 1,000,000 MB.
- Photos are kept forever, and there is no video.

### Daily active users

10,000,000 registered users × 10% = **1,000,000 daily active users**.

## 2. Estimates

### Uploads per second
- Uploads per day: 1,000,000 users × 1 photo = 1,000,000 photos.
- Average: 1,000,000 ÷ 86,400 ≈ **12 uploads per second**.
- Peak: 12 × 5 ≈ **58 uploads per second**.

### Feed views per second
- Feed views per day: 1,000,000 users × 50 = 50,000,000 views.
- Average: 50,000,000 ÷ 86,400 ≈ **579 feed views per second**.
- Peak: 579 × 5 ≈ **2,900 feed views per second**.

### Photo storage per year
- Originals: 1,000,000 × 2 MB = 2,000,000 MB = 2 TB per day, so 2 TB × 365 = **730 TB per year**.
- Thumbnails: 1,000,000 × 50 KB = 50 GB per day, so 50 GB × 365 ≈ **18.25 TB per year**.
- Total: about **748 TB per year**.

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are about 50 feed views for every upload (579 views per second against 12 uploads per second), so reads outnumber writes roughly 50 to 1.

What this means for the design:
- Make reads fast and cheap. Use a **CDN** and a **cache** so most requests never reach the database.
- Add a **read replica** so feed queries run on a copy and do not slow down writes.
- Writes still need to be reliable and quick for the user, but there are far fewer of them. Slow work, such as making thumbnails, is moved to a background queue.

## 4. Why photos are not stored in the database

A photo is a large file, and a database is built for small, structured records. Storing 748 TB of images in a database would make it huge, slow its backups and its copying to replicas, and cost much more per GB than file storage. It would also use up database capacity that the feed queries need.

Instead, photo files go in **object storage**, which is designed to hold huge numbers of large files cheaply and reliably. The database stores only **metadata** (photo id, owner, caption, upload time, and the URL of the file). The CDN then serves the files from object storage straight to users.

## 5. Architecture diagram

```
          Users (phones and browsers)
             |                    |
      photo files             API requests
             v                    v
        +---------+       +---------------+
        |   CDN   |       | Load balancer |
        +----+----+       +-------+-------+
             |                    |
      (cache miss)                v
             |             +--------------+
             |             | App servers  |
             |             +--+---+----+--+
             |                |   |    |
             |      +---------+   |    +----------+
             |      v             v               v
             |  +-------+   +-----------+    +---------+
             |  | Cache |   | Database  |    |  Queue  |
             |  +-------+   | (primary) |    +----+----+
             |              +-----+-----+         |
             |                    | copies        v
             |                    v          +-----------+
             |             +-------------+   | Thumbnail |
             |             | Read replica|   |  worker   |
             |             +-------------+   +-----+-----+
             |                                     |
             v                                     |
      +----------------+  <------------------------+
      | Object storage |   (worker reads the original
      | (photo files)  |    and saves the thumbnail)
      +----------------+
```

The app servers also save each uploaded original straight into object storage. That arrow is left out to keep the diagram readable. Feed reads go to the cache first, then to the read replica. Writes go to the primary database.

## 6. Components, one sentence each

- **CDN:** it keeps copies of photos and thumbnails close to users, so images load quickly and most of the heavy read traffic never reaches our servers.
- **Load balancer:** it spreads incoming requests across many app servers, so no single server is overloaded and one failure does not take the app down.
- **App servers:** they run the application logic (login, upload, feed building) and can be added or removed as traffic changes.
- **Cache:** it holds frequently requested data, such as popular feeds and photo details, in memory so the database is asked far less often.
- **Database (primary):** it is the reliable source of truth for users, follows and photo metadata, and it handles all the writes.
- **Read replica:** it is a live copy of the database that answers read queries, so the 2,900 peak feed views per second do not slow down the primary.
- **Object storage:** it stores the photo files, around 748 TB per year, cheaply and durably, which a database could not do well.
- **Queue:** it holds background jobs, so an upload can finish quickly while slower work waits its turn.
- **Thumbnail worker:** it takes jobs from the queue and creates the 50 KB thumbnails, so users never wait for image processing.

## 7. Upload flow, step by step

1. The user picks a photo in the app and taps upload.
2. The request reaches the **load balancer**, which sends it to one of the **app servers**.
3. The app server checks that the user is logged in and that the file is a valid image of an allowed size.
4. The app server saves the **original photo (about 2 MB) in object storage** and gets back its URL.
5. The app server writes a **metadata row** (photo id, owner, caption, time, URL) to the **primary database**.
6. The app server puts a **"create thumbnail" job** on the **queue**.
7. The app server replies "upload successful" to the user straight away. The user does not wait for the thumbnail.
8. The **thumbnail worker** takes the job from the queue, reads the original from object storage and creates the **50 KB thumbnail**.
9. The worker saves the thumbnail in object storage and updates the database row with the thumbnail URL.
10. The relevant cached feeds are cleared, so followers see the new photo. The **CDN** then serves the thumbnail to them. If the job fails, it stays in the queue and is retried.

## 8. Trade-offs

- **Speed versus fresh data (cache and read replica).** Caching and a read replica make the feed fast, but the data can be a few seconds old. A new photo might not show in a follower's feed immediately. For a photo feed this delay is acceptable, but it would not be acceptable for something like a bank balance.
- **Fast uploads versus instant thumbnails (queue).** Creating thumbnails in the background keeps uploads quick, but the thumbnail appears a moment after the upload finishes. The app can show a placeholder or the original until it is ready. The system also becomes more complex, because it now needs a queue, a worker and retries.
- **Cost versus performance (CDN and storage).** A CDN and extra copies of data make the app faster and more reliable, but they add cost. Storing 748 TB per year of photos will become expensive, so older or rarely viewed photos could later be moved to cheaper storage, at the cost of slower access to them.
- **More servers versus simplicity.** Adding more app servers, replicas and caches lets the system handle peak load, but each extra part must be run, monitored and kept in sync.
