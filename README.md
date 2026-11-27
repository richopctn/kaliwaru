# kaliwaru.net movie — versi GitHub Pages / satu file

Upload **`movie.html`** ke GitHub Pages (repo → Settings → Pages → Deploy from a branch). Itu saja sudah cukup untuk sebagian besar film.

> Catatan: `index.html` di repo ini adalah portal layanan WiFi, **bukan** pemutar VOD. File pemutar yang dipakai APK online dan alamat `kaliwarunet.my.id/movie.html` adalah `movie.html`.

## Kenapa sebagian film tidak bisa diputar di GitHub Pages?

- Film **MP4 / video langsung** (sebagian besar playlist) **bisa diputar** karena browser tidak memerlukan CORS untuk memutar video lintas-origin.
- Film **HLS (`.m3u8`)** gagal dengan `manifestLoadError` karena host `stream.playcdn.de` **tidak mengirim header `Access-Control-Allow-Origin`**. GitHub Pages adalah hosting statis HTTPS, jadi tidak ada cara mengubah header tersebut dari HTML saja.

Perbaikan di `movie.html`:
- Sumber diurutkan ulang: **MP4 didahulukan**, HLS diletakkan terakhir.
- Jika satu sumber gagal, pemutar otomatis mencoba sumber berikutnya.
- HLS native lewat `<video>` didahulukan sebelum `hls.js` (Safari/iOS/Android TV tidak kena CORS).
- Ada pengaturan proxy di menu **ⓘ**, dan `DEFAULT_HLS_PROXY` bisa diisi supaya aktif default untuk semua pengunjung.

Dari 380 film, sekitar **366 film bisa langsung diputar** hanya dengan satu file. ~14 film yang hanya punya HLS memerlukan proxy di bawah.

## Kenapa beberapa film tidak bisa diputar?

Pemeriksaan terhadap 436 tautan di playlist menunjukkan empat penyebab:

| Penyebab | Jumlah | Penanda di kartu | Solusi |
|---|---|---|---|
| HLS tanpa CORS | 14 film | `Perlu proxy HLS` | Pasang proxy Cloudflare di bawah |
| Format MKV/AVI | 17 film | `Format MKV · pemutar eksternal` | Tombol **Buka langsung** → VLC / pemutar lain |
| Link mati / berubah | sebagian kecil | — | Otomatis coba sumber berikutnya; perbarui playlist dari `s.id/vod27` |
| Entri tanpa URL | 2 film | `Belum ada link stream` | Tidak bisa diputar sampai playlist diperbarui |

Selain itu, host `ohflix.workers.dev` kadang **timeout** saat ramai. Ini bersifat sementara — coba tombol **Coba lagi** atau **Buka langsung**.

Filter **HLS**, **MP4 / Langsung**, dan **Favorit** bisa dipakai untuk melihat kelompok film tersebut.

## Proxy HLS gratis (untuk 14 film HLS-only)

Proxy sudah aktif di `https://kaliwaru-proxy.richokaliwaru.workers.dev`. `movie.html` sudah memakai URL itu lewat:

```js
const DEFAULT_HLS_PROXY = 'https://kaliwaru-proxy.richokaliwaru.workers.dev';
```

Jadi proxy langsung aktif untuk semua pengunjung tanpa perlu disimpan manual di menu **ⓘ**. Source worker ada di `proxy-worker.js`; `wrangler.toml` disertakan supaya bisa deploy ulang dari Git/CLI:

```powershell
npx wrangler deploy proxy-worker.js --name kaliwaru-proxy
```

Alternatif: buka menu **ⓘ**, tempel URL worker lain ke kolom **Proxy HLS**, klik **Simpan**. Pengaturan ini tersimpan di `localStorage` browser, jadi bisa hilang saat data aplikasi dihapus.

Proxy ini meneruskan manifest dan segmen, menulis ulang URL relatif, memperbaiki MIME segmen `.pict` menjadi `video/mp2t`, serta menambahkan header CORS.

## APK

- **APK online** (`kaliwarunet-movie-online-apk`) membuka `https://kaliwarunet.my.id/movie.html` di WebView. Perubahan harus di-commit ke GitHub supaya APK ikut terbarui.
- **APK offline** (`kaliwaru-net-movie-apk`) menyimpan pemutar di `assets/index.html`. Jika mengubah `movie.html`, samakan juga file itu lalu rebuild APK.

## Catatan

- `movie.html` sudah mandiri: playlist dan hls.js tertanam di dalamnya. Tidak perlu `playlist.js` maupun `hls.min.js`.
- Tetap gunakan konten sesuai izin yang Anda miliki. Host stream adalah pihak ketiga.
- Mix-content HTTPS juga bisa memblokir sumber ber-`http://`; gunakan tombol **Buka langsung** bila perlu.
