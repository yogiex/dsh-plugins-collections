# Kebutuhan plugin Remotion (`@local/dsh-remotion`)

> **Arah berikutnya:** `REQUIREMENTS-V2.md` menganalisis studio video deklaratif
> (proyek JSON + pustaka template, agen-first). Dokumen v2 menggantikan sebagian
> kebutuhan di bawah (validasi, visibilitas hasil, panel) dan menunda sisanya; dokumen
> ini tetap menjadi backlog ketahanan, keamanan, dan UX untuk v1.

Hasil sintesis 5 analisis paralel: UX produk, arsitektur/ketahanan, integrasi agen,
gap fitur vs Remotion, dan QA/lingkungan. Semua temuan merujuk implementasi saat ini di
folder ini (Host `index.js`, `lib/render.js`, Client `client.js`, proyek `remotion/`).

## Ringkasan

Plugin sudah membuktikan alur inti: prompt → render → putar video di panel. Yang belum
matang bukan fiturnya, melainkan **kebenaran state, keamanan input, dan keterlihatan
hasil**. Tiga hal yang paling sering muncul di kelima analisis:

1. **Video hasil tool agen tidak pernah terlihat di panel.** Tool menulis ke
   `<cwd>/remotion/`, sedangkan route media dan daftar render hanya melayani
   `media/renders`. Tujuan pengguna ("lihat hasil prompt") gagal untuk jalur agen.
2. **Input belum tepercaya.** `compositionId` dipakai langsung sebagai nama file, `output`
   absolut diterima apa adanya, body API tak dibatasi dengan benar, route tanpa auth, dan
   `props` diteruskan mentah ke Remotion tanpa validasi.
3. **Cache bundel tidak pernah di-invalidasi.** Edit `remotion/*.tsx` tidak berpengaruh
   sampai Host restart; klaim lama di README bahwa render berikutnya otomatis re-bundle
   sudah dikoreksi.

## Temuan fakta yang mengubah prioritas

- `serveUrlPromise` (lib/render.js) dan `compositionsCache` (index.js) tidak punya jalur
  invalidasi; `refresh` hanya mengosongkan daftar komposisi, bukan bundel.
- Job UI dan tool berbagi satu antrean `enqueue`, tetapi hanya job UI yang punya penanda
  `activeJobId`; tool bisa "mencuri" antrean sementara UI menampilkan job yang sebenarnya
  belum berjalan.
- Tidak ada timeout/abort render. Render yang menggantung memblokir antrean selamanya
  (timeout tool 600 dtk hanya membatasi tool, bukan renderer).
- `serveMedia` menulis body untuk `HEAD`, dan `createReadStream(...).pipe(res)` tanpa
  handler error.
- `PromptVideo` memotong prompt pada 60 kata tanpa memberi tahu UI; `fontSizeFor` dan
  padding 86 mengasumsikan 1920×1080 sehingga 9:16 akan overflow.
- Panel memakai `autoplay` tanpa menghormati `prefers-reduced-motion`; `job.status ===
  'failed'` tidak pernah dirender, dan polling hanya berhenti kalau job berubah status.

## Kebutuhan fungsional

### Must (harus ada sebelum plugin dianggap selesai)

| ID | Kebutuhan | Kriteria penerimaan | Status |
|---|---|---|---|
| M1 | **Invalidasi bundel** saat komposisi berubah atau `refresh=1`; jujur di README | `refresh=1` menyusun ulang bundel; komposisi baru terlihat di `remotion_compositions` tanpa restart Host | ❌ (README sudah dikoreksi) |
| M2 | **Hasil tool bisa ditonton di panel**: render tool juga terdaftar (salinan/URL aman) atau tool menulis ke `RENDERS_DIR` | Setelah `remotion_render` sukses, video dapat diputar dari panel tanpa mencari file | ❌ |
| M3 | **Skema props + validasi** per komposisi sebelum bundle/Chrome; error menyebut field, nilai, dan bentuk yang benar | Props invalid ditolak <1 dtk, tanpa proses Chrome; `png` di luar rentang frame ditolak | ❌ |
| M4 | **Sanitasi & batas path**: `compositionId` whitelist `[A-Za-z0-9_-]`; output terkunci ke workspace/`RENDERS_DIR`; tolak overwrite file yang ada | `id="../../x"` → 400; tidak ada tulisan di luar direktori izin | ❌ |
| M5 | **Satu gate render** untuk UI dan tool + status antrean | Dua render bersamaan: satu 409, `/api/state` memuat posisi antrean, maksimal satu render aktif | ❌ |
| M6 | **Timeout + abort + klasifikasi error** per fase (bundle/Chrome/ffmpeg/encode) dan tutup browser | Render >10 menit dibatalkan dengan pesan jelas; tidak ada Chrome/ffmpeg yatim | ❌ |
| M7 | **Output atomik + retensi**: tulis `*.part` lalu rename; prune `.cache/tmp` dan `media/renders` | `listRenders` tak pernah menampilkan file parsial/0 byte; jumlah file dibatasi | ❌ |
| M8 | **Prompt & video terlihat bersamaan**: dua kolom di ≥1024px (video kiri, prompt+aksi kanan), prompt dulu di layar sempit, preview sticky | Pada 1280×800 keduanya terlihat tanpa scroll; urutan fokus = urutan visual | ❌ |
| M9 | **Kegagalan jujur**: tampilkan `job.error` + "Coba lagi" dengan prompt utuh; hentikan polling pada gagal/timeout | Status tidak pernah kembali "siap" saat gagal; retry memakai prompt yang sama | ❌ |
| M10 | **State awal bersih**: prompt berupa placeholder (bukan value), sample diberi label dan tidak tampil sebagai hasil prompt | Teks contoh tidak bisa langsung dirender; empty state muncul bila belum ada render nyata | ⚠️ sebagian |
| M11 | **Aksesibilitas inti**: label video, progressbar semantik (`role="progressbar"`, `aria-valuenow`), tautan "Buka" memuat nama file, hint via `aria-describedby`, hormati `prefers-reduced-motion` | Navigasi keyboard + screen reader mengumumkan status, progres, dan hasil | ❌ |
| M12 | **Auth/CSRF + batas body**: tolak request tanpa sesi/Origin; body >256 KB → 413 dan socket ditutup | Request tanpa sesi 401/403; body besar 413 | ❌ |
| M13 | **Streaming media tahan gagal**: handler `error`/`close` pada read stream; `HEAD` tanpa body; Range suffix & 416 benar | File hilang saat streaming tidak memunculkan uncaught exception; fd stabil | ⚠️ Range OK, HEAD salah |

### Should

| ID | Kebutuhan | Catatan / kriteria |
|---|---|---|
| S1 | `calculateMetadata` + skema zod: durasi mengikuti panjang prompt, `width/height/fps` dari props | Remotion 4 sudah memanggil `calculateMetadata` di `selectComposition`; biaya rendah |
| S2 | Preset rasio 16:9, 9:16, 1:1, 4:5 + pemilih di panel; `PromptVideo` responsif | Render 1080×1920 tidak terpotong (padding & font size relatif) |
| S3 | Registry template + skema parameter: typo, slideshow, subtitle, lower-third | `remotion_compositions` menjadi katalog; `remotion_render` menerima `template` |
| S4 | Riwayat interaktif: klik baris memuat video ke stage, metadata prompt/format/waktu per file, bertahan setelah reload | Butuh penyimpanan metadata di Host, bukan hanya nama file |
| S5 | Still-first: render PNG frame kunci <5 dtk sebelum mp4 penuh | Hemat waktu saat iterasi prompt |
| S6 | Audio & aset lokal: `<Audio>`/`staticFile`, MIME audio, batas ukuran, tanpa akses jaringan saat render | Perlu unggah aset / pemetaan file workspace |
| S7 | Proyek pengguna: `entryPoint` per proyek + cache per path | Saat ini `ENTRY_POINT` hardcode; validasi path wajib |
| S8 | Diagnostik: log JSON per job (id, fase, browser+versi, queue wait, bundle hit/miss, ms, ukuran output, stderr tail 4 KB), endpoint health | Jangan membocorkan isi prompt ke log |
| S9 | Batas prompt transparan: hitungan kata + peringatan pemotongan sebelum render | `PromptVideo` memotong 60 kata |
| S10 | Pilihan format/komposisi di panel; ekspor batch PNG / `frameRange` | Panel saat ini hardcode `PromptVideo` + mp4 |

### Could

- C1 Player interaktif (`@remotion/player`) atau Studio di browser — biaya tinggi, butuh
  build step untuk client bundle.
- C2 Kontrol kualitas render: CRF/bitrate, WebM transparan, audio codec.
- C3 Cache bundel berbasis hash file; WebCodecs; watermark/multi-bahasa.
- C4 Aksi hasil: unduh, hapus, salin path, filter sampel.
- C5 Antrean persisten + cancel/retry dari UI.

## Non-fungsional

- **Keamanan**: route `/dsh-remotion` saat ini tidak memeriksa sesi; path traversal pada
  nama output; `output` absolut bebas; tidak ada rate limit. Prioritas M4 + M12.
- **Ketahanan**: tidak ada timeout, retry, atau rollback; kegagalan parsial meninggalkan
  file; state job hilang saat restart sementara klien terus polling (perlu penanda
  `aborted`/`unknown` dan batas 3 kegagalan polling).
- **Performa**: `enqueue` global satu Chrome adalah bottleneck sadar (aman, tetapi UI
  ikut menunggu). `/api/state` melakukan `readdir`+`stat` tiap 900 ms — cache listing
  2–5 dtk. Render 4 dtk 1080p ≈ 15–25 dtk; GIF jauh lebih lama.
- **Operasional**: paket ±550 MB (node_modules ±470 MB), tanpa retensi `media/renders`,
  `.cache/tmp` tak dipangkas; update Chrome dapat mematahkan `chromeMode:
  'chrome-for-testing'`; lisensi Remotion non-MIT (gratis ≤3 orang).

## UX

Ringkas: video dan prompt harus satu pandangan (M8); setiap video yang diputar harus
punya provenance prompt yang menempel (caption + badge sampel/waktu); kegagalan harus
terlihat (M9); contoh bawaan tidak boleh menyamar sebagai hasil prompt (M10); kontrol
harus memakai token tema dan locale DSH, bukan warna hardcode dan `toLocaleTimeString`
bawaan browser.

## Integrasi agen

- Kontrak pemetaan prompt: prompt teks → `PromptVideo`; permintaan scene spesifik → agen
  wajib memanggil `remotion_compositions`, lalu membuat/mengubah komposisi; id tak dikenal
  harus error berisi daftar id valid.
- Jangan biarkan agen "sukses" merender teks mentah ketika user meminta scene.
- Semua parameter baru (rasio, durasi, audio, template) harus masuk skema tool, bukan
  hanya tersedia lewat edit kode.
- Hasil tool wajib memuat path + URL putar + durasi + ukuran (M2).

## Verifikasi & QA

Urutan manual yang efisien (semua memakai bundle yang sama sebelum restart):

1. `node scripts/smoke-client.mjs` (slot + SSR).
2. `remotion_compositions` (bundle + Chrome sekali).
3. Render mp4 prompt pendek.
4. Render PNG frame 45.
5. WebM lalu GIF.
6. Prompt panjang + unicode (emoji, CJK, RTL).
7. Range request (`bytes=0-99`, `-100`, `start>=size`), traversal `../`, `HEAD`.
8. Dua render paralel (tool + UI) → 409/terserialisasi.
9. Restart Host saat render, dan sesudahnya: job lama 404, UI tidak spinner abadi.
10. Simulasi Chrome hilang dan disk penuh.

Otomasi: `node:test` untuk `detectBrowser`, `enqueue`, dan handler Range (perlu ekstraksi
fungsi); uji HTTP ke `http://127.0.0.1:61584` untuk `/api/*` dan `/media/*`; E2E
Playwright opsional (klik Render, tunggu 100%). **Semua render harus berjalan di proses
Host, bukan di sandbox** (spawn esbuild/Chrome/ffmpeg diblokir).

## Risiko

- **R1** Agen menulis komposisi rusak ke `Root.tsx` → semua render (termasuk UI) mati.
  Mitigasi: validasi/tsc, backup file, rollback otomatis.
- **R2** Render panjang memblokir antrean bersama. Mitigasi: still-first, batas durasi,
  antrean terpisah/prioritas.
- **R3** Props skew tanpa validasi → crash setelah bundling mahal (M3).
- **R4** Path traversal / tulis di luar workspace (M4).
- **R5** Cache bundel usang → user melihat komposisi lama (M1).
- **R6** Lisensi Remotion untuk perusahaan >3 orang.
- **R7** Update Chrome mematahkan mode `chrome-for-testing`; sediakan fallback headless
  shell dan uji versi.
- **R8** Disk: paket besar + renders tanpa retensi.

## Urutan implementasi yang disarankan

1. **Fase 1 — kebenaran & keamanan (Must teknis):** M1, M3, M4, M5, M6, M7, M12, M13.
   Tidak menambah fitur, tetapi membuat plugin aman dipakai agen dan stabil.
2. **Fase 2 — UX inti:** M8, M9, M10, M11 + caption provenance.
3. **Fase 3 — jembatan agen→panel:** M2, S4, S8.
4. **Fase 4 — fitur video:** S1, S2, S3, S5, S9, S10.
5. **Fase 5 — audio, proyek pengguna, Player:** S6, S7, C1, C2.

Perkiraan kasar: Fase 1–2 masing-masing 1 sesi kerja fokus; Fase 3 setengah sesi; Fase 4
1–2 sesi; Fase 5 bergantung pada kebutuhan dan biaya build client.
