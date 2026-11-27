# kaliwaru.net movie — versi GitHub Pages / satu file

Upload **`index.html`** ke GitHub Pages (repo → Settings → Pages → Deploy from a branch). Itu saja sudah cukup untuk sebagian besar film.

## Kenapa sebagian film tidak bisa diputar di GitHub Pages?

- Film **MP4 / video langsung** (sebagian besar playlist) **bisa diputar** karena browser tidak memerlukan CORS untuk memutar video lintas-origin.
- Film **HLS (`.m3u8`)** gagal dengan `manifestLoadError` karena host `stream.playcdn.de` **tidak mengirim header `Access-Control-Allow-Origin`**. GitHub Pages adalah hosting statis HTTPS, jadi tidak ada cara mengubah header tersebut dari HTML saja.

Perbaikan di `index.html`:
- Sumber diurutkan ulang: **MP4 didahulukan**, HLS diletakkan terakhir.
- Jika satu sumber gagal, pemutar otomatis mencoba sumber berikutnya.
- Ada pengaturan proxy opsional di menu **ⓘ**.

Dari 380 film, sekitar **366 film bisa langsung diputar** hanya dengan satu file. ~14 film yang hanya punya HLS memerlukan proxy di bawah.

## Kenapa beberapa film tidak bisa diputar?

Pemeriksaan terhadap 436 tautan di playlist menunjukkan empat penyebab:

| Penyebab | Jumlah | Penanda di kartu | Solusi |
|---|---|---|---|
| HLS tanpa CORS | 14 film | `Perlu proxy HLS` | Pasang proxy Cloudflare di bawah |
| Format MKV/AVI | 17 film | `Format MKV · pemutar eksternal` | Tombol **Buka langsung** → VLC / pemutar lain |
| Link mati / berubah (404) | sebagian kecil | — | Otomatis coba sumber berikutnya; perbarui playlist dari `s.id/vod27` |
| Entri tanpa URL | 2 film | `Belum ada link stream` | Tidak bisa diputar sampai playlist diperbarui |

Selain itu, host `ohflix.workers.dev` kadang **timeout** saat ramai. Ini bersifat sementara — coba tombol **Coba lagi** atau **Buka langsung**.

Filter **HLS**, **MP4 / Langsung**, dan **Favorit** bisa dipakai untuk melihat kelompok film tersebut.

## Proxy HLS gratis (opsional, untuk 14 film HLS-only)

1. Buka https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. Beri nama, misalnya `kaliwaru-proxy`. Klik **Deploy**.
3. Klik **Edit code**, hapus semua kode default, tempel isi `proxy-worker.js`, lalu klik **Deploy**.
4. Catat URL worker, misalnya `https://kaliwaru-proxy.<akun>.workers.dev`.
5. Di halaman kaliwaru.net movie, buka menu **ⓘ**, tempel URL itu ke kolom **Proxy HLS**, klik **Simpan**.

Proxy ini meneruskan manifest dan segmen, menulis ulang URL relatif, memperbaiki MIME segmen `.pict` menjadi `video/mp2t`, serta menambahkan header CORS. Pengaturan tersimpan di browser Anda (`localStorage`).

## Catatan

- `index.html` sudah mandiri: playlist dan hls.js tertanam di dalamnya. Tidak perlu `playlist.js` maupun `hls.min.js`.
- Tetap gunakan konten sesuai izin yang Anda miliki. Host stream adalah pihak ketiga.
- Mix-content HTTPS juga bisa memblokir sumber ber-`http://`; gunakan tombol **Buka langsung** bila perlu.
