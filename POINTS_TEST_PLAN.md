# Test Plan Poin

## Checklist
1) Award 1 level:
   - Submit worksheet sukses -> response berisi `points.added` > 0 & `total_points` meningkat.
   - Firestore: `points_log` bertambah satu, `user_stats.total_points` bertambah.
2) Coba submit level yang sama 2x:
   - `points.added` = 0 pada percobaan kedua, `total_points` tidak bertambah.
3) Student profile menampilkan total poin & riwayat terbaru.
4) Moderator summary:
   - Rentang tanggal mempengaruhi total.
   - Per-kursus akurat.
5) Rules:
   - User A tidak bisa baca `user_stats` B.
   - Moderator bisa baca semuanya.
6) (Opsional) Sheets: Baris log tampil.

## Acceptance Criteria
- Endpoint:
  * `POST /api/points/claim` (200, idempoten)
  * `GET /api/points/me` (200, schema benar)
  * `GET /api/points/logs` (pagination ok)
  * `GET /api/mod/points/summary` (role check)
  * `GET /api/mod/points/user/:uid` (role check)
- Zero unhandled promise rejections.
- Tidak ada write langsung dari client ke Firestore terkait poin.
