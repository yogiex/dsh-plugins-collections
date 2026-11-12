# Kebutuhan plugin Remotion v2 — Studio Video Deklaratif (agen-first)

> Status: **analisis kebutuhan**, belum implementasi. Dokumen ini melanjutkan
> `REQUIREMENTS.md` (v1: ketahanan, keamanan, UX panel). v1 tetap berlaku kecuali
> dinyatakan digantikan di sini.
>
> Keputusan pengguna yang mengunci arah: **studio deklaratif** (scene JSON + pustaka
> template, bukan agen menulis TSX) dan **agen sebagai pemakai utama** (tool), panel
> Web UI sebagai pendamping.

## Ringkasan eksekutif

v1 membuktikan alur prompt → render → putar. Itu cukup untuk satu jenis video: teks
kinetik dari sebuah prompt. v2 mengubah plugin menjadi **mesin produksi video yang bisa
dioperasikan agen tanpa menulis kode**: proyek video adalah berkas JSON di workspace,
setiap adegan memakai template yang sudah ada, dan render membaca JSON itu sebagai
`inputProps` dari **satu komposisi generik**.

Tiga keputusan yang menentukan seluruh dokumen:

1. **Satu komposisi generik (`SceneVideo`)** dengan `calculateMetadata`. Bundel tidak
   pernah di-rebuild karena isi proyek berubah; mengganti scene = mengganti props.
   Ini menghapus biaya bundling 10–25 dtk dari setiap iterasi.
2. **Proyek sebagai berkas** (`.dsh-video/<slug>/project.json` + `assets/`). Agen bisa
   membaca, mengedit, dan memverifikasinya dengan tool file yang sudah ada; manusia bisa
   me-review lewat diff. Tidak ada state tersembunyi di storage Host.
3. **Stills-first**: verifikasi visual memakai beberapa frame PNG dalam satu sesi browser
   (`renderFrames({ frames, outputDir })`), bukan render mp4 penuh. Render penuh hanya
   untuk hasil akhir.

Yang **tidak** diselesaikan v2: kebebasan desain di luar template (escape-hatch TSX),
editor timeline, dan TTS/voiceover. Ketiganya dicatat sebagai fase lanjutan.

## 1. Konteks dan bukti

### 1.1 Kondisi kode saat ini

| Fakta | Bukti |
|---|---|
| Entry point proyek hardcode ke `remotion/index.tsx` | `lib/render.js:23` |
| Bundel di-cache selama proses Host, tanpa invalidasi | `lib/render.js:143-161` |
| Hanya dua komposisi: `PromptVideo` (1920×1080) dan `HelloWorld` | `remotion/Root.tsx` |
| Prompt dipotong 60 kata tanpa memberi tahu UI | `remotion/PromptVideo.tsx` |
| Validasi props tidak ada; props diteruskan mentah | `index.js:462` |
| Render tool menulis ke `<cwd>/remotion/`, tidak terdaftar di panel | `index.js:388-403` |
| Tidak ada aset, audio, riwayat, atau antrean persisten | seluruh plugin |
| Satu antrean global, satu Chrome | `lib/render.js:256-265` |

### 1.2 Bukti kebutuhan dari proyek nyata

`videos/japanese-te-kudasai` adalah video 15 dtk / 450 frame / 1080×1920 yang dibuat
manual: 1 `Root.tsx`, 1 `MainVideo.tsx`, 5 komponen adegan, 1 `theme.ts`, dan 1 skrip
render. Untuk membuat video seperti itu, agen harus menulis ~700 baris TSX. Pola yang
dipakai semuanya bisa dinyatakan sebagai data: judul + subjudul, satu blok penjelasan,
satu adegan contoh (kata/kana/arti), dan outro. Itulah bukti bahwa pustaka template
menutup sebagian besar kebutuhan nyata tanpa kehilangan hasil.

### 1.3 Fakta teknis yang sudah diverifikasi (versi terpasang)

| Klaim | Sumber |
|---|---|
| `calculateMetadata` boleh mengembalikan `width`, `height`, `fps`, `durationInFrames`, `props`, `defaultCodec` | `node_modules/remotion/dist/cjs/Composition.d.ts:16-35` |
| `renderStill` hanya satu `frame` per panggilan | `node_modules/@remotion/renderer/dist/render-still.d.ts:51-56` |
| `renderFrames` menerima `frames: number[]`, `outputDir`, `imageFormat` | `node_modules/@remotion/renderer/dist/render-frames.d.ts:70-107` |
| `bundle()` menerima `entryPoint` + `publicDir` | `node_modules/@remotion/bundler/dist/bundle.d.ts:50-60` |
| Opsi `renderMedia`: `codec`, `crf`, `audioCodec`, `muted`, `videoBitrate`, `audioBitrate`, `numberOfGifLoops` | `node_modules/@remotion/renderer/dist/options/options-map.d.ts` |
| `@remotion/player` mengekspor `Player`, `Thumbnail` | `node_modules/@remotion/player/dist/esm/index.mjs:4083-4087` |
| `@remotion/media` mengekspor `Audio` dan `Video` | `node_modules/@remotion/media/dist/index.d.ts:68-74` |
| ffmpeg/ffprobe tersedia di paket compositor | `@remotion/compositor-win32-x64-msvc/{ffmpeg,ffprobe}.exe` |
| zod 4.6.7 dan esbuild 0.28.1 tersedia di `node_modules` | `node_modules/zod`, `node_modules/esbuild` |
| Semua paket Remotion seragam 4.0.542 | `package.json` |

### 1.4 Batas verifikasi DSH

`cordis_inspect_query` dengan argumen `input` gagal (`"input" must be an object`) pada
runtime ini, sehingga kontrak per-Service (mis. `storageDomain`) belum bisa dibaca
langsung. Katalog Service/Slot sudah dikumpulkan; detail tipe harus dibaca dari `.d.ts`
paket saat implementasi. Dicatat sebagai risiko R10, bukan asumsi.

## 2. Batasan v1 terhadap kebutuhan agen

| Dimensi | v1 | Akibat bagi agen |
|---|---|---|
| Model konten | Prompt → teks kinetik | Tidak bisa membuat video penjelasan/adegan |
| Penulis konten | Agen menulis TSX | Lambat, berisiko merusak `Root.tsx`, butuh tsc |
| Validasi | Tidak ada | Gagal setelah bundling/Chrome, pesan tidak actionable |
| Iterasi | Render mp4 penuh 15–25 dtk | Mahal untuk mengecek satu frame |
| Hasil | Path file di `<cwd>/remotion/` | Tidak bisa diputar di chat/panel |
| Aset | Tidak ada | Tidak ada gambar, musik, atau video klip |
| Durasi/rasio | Hardcode 1920×1080/120 frame | Shorts 9:16 tidak didukung |
| Riwayat | Nama file | Tidak ada provenance, tidak bisa dibandingkan |
| Antrean | Serial, tanpa timeout/cancel | Render panjang memblokir semuanya |
| Bundel | Cache tanpa invalidasi | Perubahan template tidak terlihat |

## 3. Analisis kesulitan

Bagian ini menjawab "apa yang membuat v2 sulit", bukan sekadar daftar fitur.

### 3.1 Ekspresivitas skema vs keandalan agen

Semakin kaya props template, semakin besar peluang agen salah mengisi. Solusi: skema
sempit dengan **tipe dan batas eksplisit** (mis. `title` ≤ 60 karakter), satu template
untuk satu maksud, dan katalog template yang menyertakan skema props di output tool.
Validasi harus menolak sebelum Chrome dinyalakan. Konsekuensi: permintaan yang tidak bisa
dinyatakan dengan template harus gagal dengan saran, bukan diam-diam didegradasi.

### 3.2 Aset dinamis tanpa re-bundle

`bundle()` menyalin `publicDir` saat bundling; menaruh aset proyek di sana berarti setiap
ganti aset harus bundling ulang (10–25 dtk). Solusinya: aset tidak ikut bundel. Aset
dilayani Host lewat route bertoken, dan komposisi menerima URL absolut di props. Ini
menuntut: route dengan `Accept-Ranges`, CORS, URL stabil per aset (hash), dan komposisi
yang tidak bergantung pada `staticFile()` untuk aset dinamis. Font tetap statis di
`publicDir` karena tidak berubah per proyek.

### 3.3 Preview murah

`renderStill` membuka browser per panggilan; 6 still = 6 kali start Chrome. `renderFrames`
menerima daftar frame dan direktori output dalam satu sesi browser. Karena itu pratinjau
v2 adalah **beberapa frame PNG dalam satu panggilan**, bukan enam panggilan tool. Biaya
masih lebih besar dari nol, jadi template harus deterministik dan tidak membutuhkan
pratinjau di setiap perubahan teks.

### 3.4 Determinisme

Video yang sama harus menghasilkan frame yang sama. Larangan: `Math.random`, `Date.now`,
animasi berbasis waktu nyata, font dari jaringan, URL aset yang berubah tiap render.
Warna aksen yang diturunkan dari hash (pola v1) harus memakai hash stabil dari id scene.

### 3.5 Satu Chrome, satu antrean

Remotion satu proses; dua render paralel lebih sering gagal daripada lebih cepat.
Antrean tetap serial. Yang berubah: prioritas (pratinjau < 10 dtk didahulukan), timeout
per fase, dan pembatalan yang benar-benar menutup browser.

### 3.6 Kualitas pesan error

Agen hanya bisa memperbaiki apa yang dijelaskan error. Error wajib memuat: kode, path
dalam proyek, nilai yang diterima, batas yang dilanggar, dan bentuk yang benar.
Contoh: `SCHEMA_INVALID scenes[2].props.items[1]: string max length 80 (got 96)`.

### 3.7 Player di panel

`@remotion/player` ada di `node_modules`, tetapi panel DSH memuat `client.js` sebagai
modul polos tanpa build. Menampilkan Player berarti menambahkan langkah build client
(esbuild) yang membundel Player + komponen template untuk browser. Ini pekerjaan
terpisah dari mesin render dan tidak boleh menjadi prasyarat agen. Karena itu Player
adalah Should dengan gate keputusan (bagian 11), bukan Must.

## 4. Opsi arsitektur

| Kriteria | A. Agen menulis TSX | B. Deklaratif murni (dipilih) | C. Hybrid |
|---|---|---|---|
| Keamanan | Rendah (kode arbitrer di bundel) | Tinggi (data tervalidasi) | Sedang |
| Kecepatan iterasi | Bundling tiap perubahan | Ganti props, bundel tetap | Cepat untuk umum, lambat untuk kasus khusus |
| Fleksibilitas desain | Tak terbatas | Terbatas pada template | Tinggi |
| Reliabilitas agen | Butuh tsc + rollback | Satu skema, satu putaran perbaikan | Dua jalur, dua mode gagal |
| Biaya perawatan | Tinggi | Rendah | Tinggi |
| Preview | Butuh render | Stills murah | Campuran |

**Rekomendasi: B untuk v2.** Opsi A ditolak karena risiko R1 v1 (agen merusak
`Root.tsx`) dan biaya tsc; opsi C ditunda sampai template terbukti kurang (keputusan D1).

## 5. Model domain

### 5.1 Entitas

| Entitas | Penyimpanan | Keterangan |
|---|---|---|
| `Project` | `.dsh-video/<slug>/project.json` | Sumber kebenaran; bisa dibaca agen |
| `Scene` | di dalam project | `template` + `props` + durasi |
| `Asset` | `.dsh-video/<slug>/assets/<name>-<hash8>.<ext>` | Gambar/audio/klip, diimpor dari workspace |
| `RenderJob` | memori Host + `<project>/renders/jobs.jsonl` | Status, progres, error, artefak |
| `Artifact` | `<project>/renders/<slug>-<hash8>-<stamp>.<fmt>` | Output final/pratinjau |

Tidak ada database. Indeks proyek dibangun dengan memindai `.dsh-video/*/project.json`
saat dibutuhkan (cache 2 dtk).

### 5.2 Skema project v1

```json
{
  "version": 1,
  "id": "promo-produk",
  "title": "Promo Produk",
  "aspect": "9:16",
  "fps": 30,
  "theme": {
    "background": "#1a1a1a",
    "text": "#ffffff",
    "accent": "#ffb7c5",
    "accentAlt": "#7fe3d4",
    "font": "inter"
  },
  "scenes": [
    {
      "id": "s1",
      "template": "title",
      "durationInFrames": 90,
      "props": {
        "kicker": "Pola Kalimat JLPT N5",
        "title": "～てください",
        "subtitle": "Tolong…"
      }
    },
    {
      "id": "s2",
      "template": "example",
      "durationInFrames": 210,
      "props": {
        "term": "ちょっと待ってください",
        "transcription": "Chotto matte kudasai",
        "meaning": "Tolong tunggu sebentar.",
        "note": "kata kerja bentuk て + ください"
      }
    },
    {
      "id": "s3",
      "template": "outro",
      "durationInFrames": 90,
      "props": {
        "headline": "Like & Subscribe",
        "subheadline": "untuk pola kalimat lainnya!",
        "footnote": "JLPT N5 · ～てください"
      }
    }
  ],
  "audio": [],
  "assets": {}
}
```

Aturan:

- `version` wajib; versi tak dikenal ditolak dengan pesan yang menyebut versi didukung.
- `id` = slug direktori, `[a-z0-9][a-z0-9-]{1,48}`.
- `aspect` ∈ `16:9` (1920×1080), `9:16` (1080×1920), `1:1` (1080×1080), `4:5` (1080×1350).
- `fps` ∈ {24, 25, 30, 60}; default 30.
- `durationInFrames` per scene: 15–900; total ≤ 1800 (60 dtk) untuk render sinkron.
- `scenes` 1–30; `props` divalidasi skema template; properti tak dikenal ditolak.
- `theme` opsional; hanya kunci yang dikenal.

### 5.3 Waktu dan ukuran

`calculateMetadata` mengembalikan `width`, `height`, `fps`, dan
`durationInFrames = Σ scenes + trailing`. Semua template membaca
`useVideoConfig()` dan menskalakan tata letak dari `width`/`height`; tidak boleh ada
angka piksel absolut untuk font atau padding. Safe area 8% setiap sisi.

### 5.4 Referensi aset

Aset dirujuk dengan `assetId` (kunci di `assets`), bukan path. Host mengubahnya menjadi
URL absolut saat render. Referensi yang tidak ada = error validasi, bukan render kosong.

```json
"assets": {
  "bgm": { "file": "assets/bgm-1a2b3c4d.mp3", "kind": "audio", "durationInSeconds": 42.1 },
  "logo": { "file": "assets/logo-9f8e7d6c.png", "kind": "image", "width": 512, "height": 512 }
}
```

### 5.5 Model error

Semua kegagalan yang bisa diperbaiki agen memakai format:

```
<CODE> <path>: <pesan> (got <nilai>; expected <bentuk/rentang>)
```

| Kode | Kapan | Tindakan agen |
|---|---|---|
| `PROJECT_NOT_FOUND` | id tidak ada | `remotion_project list` |
| `SCHEMA_INVALID` | tipe/batas/path | perbaiki path yang disebut |
| `TEMPLATE_UNKNOWN` | template tidak terdaftar | `remotion_templates` |
| `ASSET_MISSING` | `assetId` tidak ada | `remotion_asset import` |
| `ASSET_REJECTED` | MIME/ukuran/durasi | ganti berkas |
| `PROJECT_EXISTS` | slug bentrok | pilih id lain / `duplicate` |
| `RENDER_BUSY` | antrean penuh | tunggu / `remotion_job` |
| `RENDER_FAILED` | Chrome/ffmpeg | baca fase + stderr tail |
| `RENDER_TOO_LONG` | > 60 dtk (sinkron) | gunakan `wait: false` |
| `OUTPUT_EXISTS` | nama bentrok | ganti nama / `force` |
| `BROWSER_MISSING` | tidak ada Chrome | pasang / atur env |
| `TIMEOUT` | melewati batas | perkecil durasi/frame |

## 6. Pustaka template v1

Delapan template, semuanya responsif terhadap rasio. Batas teks adalah bagian dari
kontrak, bukan saran.

| Template | Props wajib | Props opsional | Batas | Catatan tata letak |
|---|---|---|---|---|
| `title` | `title` | `kicker`, `subtitle`, `highlight` | kicker ≤ 40, title ≤ 40, subtitle ≤ 80 | Judul terpusat, masuk dengan spring |
| `bullets` | `title`, `items[]` | `footnote` | title ≤ 40, item ≤ 80, maks 6 item | Muncul berurutan |
| `quote` | `text` | `attribution` | text ≤ 200, attribution ≤ 60 | Tanda kutip aksen |
| `example` | `term`, `transcription`, `meaning` | `note`, `label` | masing-masing ≤ 80 | Untuk bahasa: kana/romaji/arti |
| `image` | `assetId` | `caption`, `fit` | caption ≤ 80; `fit` ∈ cover/contain | Latar penuh + caption |
| `code` | `code` | `language`, `filename` | code ≤ 1200 karakter, 18 baris | Monospace, tanpa highlight dinamis |
| `lower-third` | `label`, `value` | `accent` | label ≤ 24, value ≤ 48 | Kartu di bawah kiri |
| `outro` | `headline` | `subheadline`, `footnote` | headline ≤ 40, sub ≤ 60, foot ≤ 60 | Pulsing halus |

Aturan umum: properti tak dikenal ditolak; string kosong ditolak kecuali dinyatakan
opsional; `assetId` wajib ada di `project.assets`; tidak ada HTML/JSX di dalam teks.

Tema warna: hanya kunci `background`, `text`, `accent`, `accentAlt`, `font`; nilai warna
`#rrggbb`. `font` ∈ {`inter`, `noto-sans-jp`, `mono`}. Font dikirim di `publicDir` paket
(tanpa fetch jaringan).

## 7. Kontrak tool (agen-first)

### 7.1 Prinsip

1. **Validasi dulu, render kemudian.** Tidak ada proses Chrome sebelum proyek valid.
2. **Error yang bisa diperbaiki** — lihat 5.5.
3. **Hasil selalu punya URL yang bisa diputar** (relatif terhadap `webServer.getOrigin()`).
4. **Idempoten** — proyek sama + pengaturan sama menghasilkan artefak yang sama; hash
   mencegah render ulang yang tidak perlu.
5. **Satu operasi, dua pemanggil** — logika ada di service Host; tool dan panel memanggil
   service yang sama.

### 7.2 Daftar tool

| Tool | Tujuan | Parameter inti | Catatan |
|---|---|---|---|
| `remotion_templates` | Katalog + skema props | — | Sekali panggil, murah |
| `remotion_project` | create/get/list/delete | `action`, `id`, `title`, `aspect` | `create` menulis `project.json` |
| `remotion_scene` | add/update/remove/move | `project`, `action`, `scene` | Validasi penuh sebelum tulis |
| `remotion_asset` | import/list/remove | `project`, `action`, `path` | Copy + hash + ffprobe |
| `remotion_preview` | Pratinjau stills | `project`, `frames[]`/`at[]` | Satu sesi browser |
| `remotion_render` | Render akhir | `project`, `format`, `aspect`, `quality` | Tetap kompatibel v1 |
| `remotion_job` | status/cancel/list | `id`, `action` | Untuk `wait: false` |

Kedua tool v1 (`remotion_compositions`, `remotion_render` dengan `props.prompt`)
dipertahankan.

### 7.3 Skema parameter

`remotion_scene` (ringkas; `additionalProperties: false`):

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["project", "action"],
  "properties": {
    "project": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]{1,48}$" },
    "action": { "type": "string", "enum": ["add", "update", "remove", "move"] },
    "sceneId": { "type": "string", "description": "Wajib untuk update/remove/move." },
    "index": { "type": "integer", "minimum": 0, "description": "Untuk add/move." },
    "scene": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]{0,30}$" },
        "template": { "type": "string" },
        "durationInFrames": { "type": "integer", "minimum": 15, "maximum": 900 },
        "props": { "type": "object" }
      },
      "required": ["template", "props"]
    }
  }
}
```

`remotion_render` (v2, superset v1):

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "project": { "type": "string", "description": "Id proyek; mode v2." },
    "composition_id": { "type": "string", "description": "Mode v1/komposisi kustom." },
    "format": { "type": "string", "enum": ["mp4", "webm", "gif", "png"] },
    "aspect": { "type": "string", "enum": ["16:9", "9:16", "1:1", "4:5"] },
    "quality": { "type": "string", "enum": ["draft", "standard", "high"] },
    "frame": { "type": "integer", "minimum": 0 },
    "output": { "type": "string" },
    "force": { "type": "boolean" },
    "wait": { "type": "boolean", "description": "false: kembalikan jobId segera." },
    "props": { "type": "object" }
  }
}
```

`quality` memetakan ke opsi encoder: draft = `crf 28`, standard = `crf 23`, high =
`crf 18`; `audioCodec: 'aac'` bila proyek punya audio; `numberOfGifLoops: 0` untuk gif.

### 7.4 Output

```json
{
  "project": "promo-produk",
  "format": "mp4",
  "aspect": "9:16",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationInFrames": 390,
  "durationInSeconds": 13.0,
  "output": "D:/.../.dsh-video/promo-produk/renders/promo-produk-1a2b3c4d-....mp4",
  "url": "http://127.0.0.1:PORT/dsh-remotion/v2/artifact/promo-produk/....mp4",
  "sizeBytes": 2367936,
  "hash": "1a2b3c4d",
  "cached": false,
  "warnings": []
}
```

Teks hasil tool wajib memuat: path, URL putar, dimensi, durasi, ukuran, dan (bila ada)
`warnings`. `cached: true` berarti artefak lama dipakai ulang.

### 7.5 Contoh alur agen

1. `remotion_templates` → pilih `title`, `example`, `outro`.
2. `remotion_project {action:"create", id:"promo-produk", aspect:"9:16"}`.
3. `remotion_scene` tiga kali (atau satu `add` per scene).
4. `remotion_preview {frames:[30, 150, 330]}` → periksa tiga PNG.
5. `remotion_render {project:"promo-produk"}` → URL mp4.

Bila langkah 3 gagal, error menyebut `scenes[1].props.meaning`; agen memperbaiki tanpa
perlu membaca ulang seluruh proyek.

## 8. Mesin render

| Aspek | Keputusan |
|---|---|
| Bundel | Satu bundel per proses; hash entry (`remotion/**` + `publicDir`) disimpan; `remotion_templates` melaporkan `bundleHash` |
| Invalidasi | Perubahan berkas template (mtime/hash) → bundel baru pada panggilan berikutnya; tidak perlu restart Host |
| Props | `inputProps = { project, assetUrls }`; proyek tidak pernah masuk bundel |
| Pratinjau | `renderFrames({ frames, outputDir, imageFormat:'png' })` dalam satu sesi |
| Render | `selectComposition` → `renderMedia`; `calculateMetadata` menentukan dimensi/durasi |
| Antrean | Serial; pratinjau diprioritaskan; dua permintaan render penuh → `RENDER_BUSY` |
| Timeout | Validasi ≤ 5 dtk; pratinjau ≤ 120 dtk; render ≤ 600 dtk; fase dilaporkan |
| Cancel | `makeCancelSignal` + tutup browser; job menjadi `cancelled` |
| Output | `<project>/renders/<slug>-<hash8>-<stamp>.<fmt>`; tulis `.part` lalu rename |
| Retensi | Maks 30 artefak/proyek dan 2 GB total; hapus tertua lebih dulu |
| Temp | `TEMP/TMP` dipin ke `.cache/tmp` paket (sudah ada) |
| Browser | Deteksi Chrome/Edge; `REMOTION_BROWSER_EXECUTABLE`; fallback Chrome Headless Shell |
| Cache | Kunci `projectHash + bundleHash + aspect + format + quality`; `force` melewati |

Progres dilaporkan per fase: `validate → bundle(hit|miss) → select → render(frame n/N) →
encode → done`. Fase dipakai untuk klasifikasi error (`RENDER_FAILED` + fase).

## 9. Pratinjau

- `remotion_preview` menerima `frames` absolut dan/atau `at` relatif (0–1) yang
  dikonversi ke frame.
- Maksimum 8 frame per panggilan; total piksel tetap wajar (frame penskalaan 0.5 untuk
  pratinjau cepat, opsi `scale`).
- Output: daftar `{ frame, url, width, height, bytes }`. Contact sheet (grid PNG) adalah
  Could V2-C2, bukan bagian dari pratinjau v2.
- Pratinjau **tidak** membuat mp4 dan tidak mengisi riwayat artefak final.

## 10. Aset

Alur `remotion_asset {action:"import", project, path}`:

1. Resolve path relatif terhadap workspace; tolak absolut di luar workspace, `..`,
   symlink yang menunjuk keluar, dan berkas > 200 MB.
2. Deteksi jenis dengan ffprobe (`image`, `audio`, `video`); MIME dari hasil probe, bukan
   ekstensi.
3. Batas: gambar ≤ 20 MB / 8000 px; audio ≤ 50 MB / 10 menit; video ≤ 200 MB / 60 dtk.
4. Copy ke `assets/<basename>-<sha1-8>.<ext>`; catat metadata di `project.assets`.
5. URL disajikan `/dsh-remotion/v2/asset/<project>/<file>?t=<token>` dengan
   `Accept-Ranges`, `Cache-Control: private, max-age=3600`, CORS `*`.
6. Token = HMAC(project + file, secret proses) → tidak bisa menebak aset proyek lain.
7. `remove` menolak bila aset masih dirujuk scene; error menyebut scene yang memakai.

Tidak ada unduhan jaringan saat render: semua aset berasal dari proyek.

## 11. Panel Web UI (pendamping)

Status: Should. Agen tetap bisa bekerja tanpanya.

| Permukaan | Isi | Gate |
|---|---|---|
| `conversation.view` (id tetap `remotion`) | Daftar proyek, stage video terakhir, riwayat render + provenance, tombol render | Wajib |
| `tool.call.toolview` | Putar artefak langsung di kartu tool | Perlu konfirmasi props slot saat implementasi |
| `settings.section` | Browser path, retensi, rasio default, batas durasi | Wajib (kecil) |
| Player interaktif | Scrub tanpa render | Butuh build client (esbuild) yang membundel `@remotion/player` + komponen template |

Gate Player: (a) artefak client ≤ 3 MB, (b) waktu muat panel ≤ 1 dtk pada mesin ini,
(c) build reproducible via satu skrip. Bila salah satu gagal, panel memakai `<video>`
hasil render + stills; keputusan dicatat, bukan didiamkan.

Panel tidak boleh menjadi satu-satunya jalan memutar hasil; setiap render harus punya URL
yang bisa dipakai di chat.

## 12. Keamanan

| Ancaman | Kontrol |
|---|---|
| Path traversal / symlink | `realpath` + prefix check terhadap `.dsh-video`; tolak absolute di luar workspace |
| Kode arbitrer dari agen | Tidak ada eval/TSX; hanya data tervalidasi skema |
| Teks raksasa / DoS | Batas panjang per props; total scene ≤ 30; body ≤ 256 KB |
| Aset berbahaya | ffprobe + batas ukuran/durasi; tidak ada eksekusi |
| Token aset bocor | HMAC per proses; URL tidak dapat ditebak; tidak ada listing direktori |
| Route tanpa sesi | Pertahankan pemeriksaan origin/peer bila tersedia; route media read-only |
| Render jaringan | Tidak ada fetch eksternal; font lokal; aset dari proyek |
| Disk penuh | Cek ruang sebelum render; gagal dengan pesan jelas; bersihkan `.part` |
| Kebocoran prompt | Log tidak memuat isi teks scene, hanya hash dan ukuran |

## 13. Non-fungsional

| Area | Target |
|---|---|
| Validasi proyek | < 50 ms, tanpa Chrome |
| Pratinjau 6 frame | < 12 dtk setelah bundel siap |
| Render 15 dtk 9:16 | 40–120 dtk (perkiraan; diukur di QA) |
| Bundel pertama | 10–25 dtk; cache hit 0 |
| Memori | Satu render aktif; frame buffer tidak disimpan |
| Startup plugin | Tidak memuat Remotion sampai tool pertama dipanggil |
| Ukuran paket | Tidak menambah dependensi baru selain yang sudah ada; Player/esbuild hanya untuk build client |
| Kompatibilitas | Node ≥ 18 (mengikuti DSH), Windows/macOS/Linux |
| Lisensi | Remotion gratis untuk individu/perusahaan ≤ 3 orang; dokumen wajib menyebut ini |

## 14. Kompatibilitas dan migrasi v1

- `remotion_render` tanpa `project` berperilaku seperti v1 (komposisi tetap, `props.prompt`
  → `PromptVideo`).
- `remotion_compositions` tetap; output diberi `bundleHash`.
- `props.prompt` pada v2 dipetakan ke proyek satu scene (`title` + `bullets`) di
  `.dsh-video/prompt-<hash>/`, agar hasil lama bisa dibuka dan diedit.
- Artefak v1 di `media/renders` tetap tampil di panel; migrasi tidak menghapus berkas.
- `REQUIREMENTS.md` v1 (M1–M13, S1–S10) tetap menjadi backlog; v2 menggantikan sebagian
  (M2 lewat URL artefak, M3 lewat validasi skema, M8 lewat panel baru) dan menunda sisanya.

## 15. QA dan kriteria penerimaan

| # | Uji | Kriteria |
|---|---|---|
| 1 | Skema project | Versi salah, `aspect` asing, scene kosong, props asing → error dengan path |
| 2 | Template | 8 template dirender di 4 rasio tanpa overflow; teks batas maksimum tetap muat |
| 3 | Tool contract | `cordis_inspect_query Tool` menampilkan skema yang sama dengan dokumen |
| 4 | Alur agen | Dari chat: buat proyek, 3 scene, pratinjau, render, putar URL |
| 5 | Pratinjau | 6 frame satu panggilan; total < 12 dtk; PNG sesuai frame yang diminta |
| 6 | Render | ffprobe: codec, dimensi, fps, durasi sesuai proyek |
| 7 | Rasio | 9:16, 16:9, 1:1, 4:5 menghasilkan dimensi yang benar |
| 8 | Determinisme | Render dua kali → frame identik (piksel) pada frame sampel |
| 9 | Cache | Render kedua `cached: true`; `force` merender ulang |
| 10 | Aset | Import gambar/audio; aset hilang → `ASSET_MISSING`; traversal ditolak |
| 11 | Audio | Proyek dengan audio menghasilkan mp4 dengan track audio |
| 12 | Antrean | Dua render bersamaan → satu `RENDER_BUSY`, tidak ada Chrome yatim |
| 13 | Timeout/cancel | Render dibatalkan → status `cancelled`, tidak ada proses tersisa |
| 14 | Restart Host | Job lama hilang tanpa spinner abadi; artefak tetap bisa diputar |
| 15 | Keamanan | `../`, absolute path, symlink, token aset salah → 400/403 |
| 16 | v1 compat | `props.prompt` dan `remotion_compositions` masih bekerja |

Semua render berjalan di proses Host; sandbox DSH memblokir spawn esbuild/Chrome/ffmpeg.

## 16. Roadmap

| Fase | Isi | Gate | Estimasi |
|---|---|---|---|
| 0 | Skema project + `SceneVideo` + registry template + validasi | 8 template render di 4 rasio | 1 sesi |
| 1 | Tool project/scene/templates/preview/render + output contract | Alur agen lengkap dari chat | 1 sesi |
| 2 | Aset: import, ffprobe, route bertoken, template `image` | Gambar tampil di render | 0,5 sesi |
| 3 | Job async, cancel, riwayat, retensi | Uji 12–14 lulus | 0,5–1 sesi |
| 4 | Panel studio + Player (gate) | Gate 11 lulus | 1–2 sesi |
| 5 | Audio, transisi, batch rasio, TTS (opsional) | Keputusan D2/D3 | 1–2 sesi |

## 17. Risiko

| ID | Risiko | Mitigasi |
|---|---|---|
| R1 | Template kurang ekspresif | Error menyarankan template terdekat; escape-hatch ditinjau setelah 10 video nyata |
| R2 | Player membengkakkan/mematahkan build client | Gate 11; fallback `<video>` + stills |
| R3 | Aset CORS/range gagal di Chrome | Uji render dengan gambar + audio di QA #10–11 |
| R4 | Font tidak deterministik | Font lokal di `publicDir`; uji frame identik |
| R5 | Bundel usang setelah edit template | Hash entry + cek mtime; laporkan `bundleHash` |
| R6 | Satu Chrome jadi bottleneck | Prioritas pratinjau; batas durasi; antrean serial eksplisit |
| R7 | Disk penuh | Retensi + cek ruang + bersihkan `.part` |
| R8 | Path traversal/symlink | `realpath` + prefix check; uji QA #15 |
| R9 | Tool timeout untuk video panjang | `wait:false` + `remotion_job`; batas 60 dtk untuk mode sinkron |
| R10 | `inspect` tidak bisa membaca kontrak Service | Baca `.d.ts` paket; catat asumsi; verifikasi saat implementasi |
| R11 | Lisensi Remotion untuk perusahaan > 3 orang | Sebutkan di README dan hasil tool pertama |
| R12 | Windows: TEMP/ffmpeg permission | Sudah dimitigasi `withRenderTemp`; pertahankan |

## 18. Keputusan terbuka untuk pengguna

| ID | Pertanyaan | Rekomendasi |
|---|---|---|
| D1 | Apakah escape-hatch TSX perlu di v2? | Tidak; tinjau setelah template terbukti kurang |
| D2 | Apakah audio/musik masuk Must? | Should; fase 5, karena render sudah bisa tanpa audio |
| D3 | TTS/voiceover memakai ElevenLabs/Whisper? | Ditunda; butuh kredensial dan keputusan biaya |
| D4 | Lokasi proyek: `.dsh-video/` di workspace atau tersembunyi di paket? | Workspace, agar bisa di-diff dan dibaca agen |
| D5 | Retensi default | 30 artefak/proyek, 2 GB total |
| D6 | Apakah tool v1 dipertahankan selamanya? | Dipertahankan minimal satu versi; beri tanda deprecated |

## Lampiran A — Peta endpoint HTTP

| Method | Path | Fungsi |
|---|---|---|
| GET | `/dsh-remotion/api/state` | Kompatibilitas v1 |
| GET | `/dsh-remotion/v2/projects` | Daftar proyek + hash |
| GET | `/dsh-remotion/v2/projects/:id` | Isi `project.json` |
| POST | `/dsh-remotion/v2/render` | Render dari panel (body JSON) |
| GET | `/dsh-remotion/v2/jobs/:id` | Status job |
| GET | `/dsh-remotion/v2/artifact/:project/:file` | Putar artefak (Range, HEAD) |
| GET | `/dsh-remotion/v2/asset/:project/:file?t=…` | Aset proyek (Range, token) |
| GET | `/dsh-remotion/v2/health` | Browser, bundel, antrean, disk |

Semua route menolak `..`, nama file asing, dan metode selain yang didukung.

## Lampiran B — Referensi

- `index.js`, `lib/render.js`, `client.js` — implementasi v1 yang menjadi baseline.
- `remotion/Root.tsx`, `remotion/PromptVideo.tsx` — komposisi yang ada.
- `videos/japanese-te-kudasai` — bukti kebutuhan template (adegan judul, penjelasan,
  contoh, outro).
- `REQUIREMENTS.md` — 13 Must v1 yang masih relevan.
- `@remotion/renderer` `renderFrames`, `render-still`, `options-map` — API yang dipakai.
- `@remotion/player`, `@remotion/media` — dipakai fase 4–5.

## Lampiran C — Register kebutuhan

Status terhadap kode saat ini: ❌ belum, ⚠️ sebagian, ✅ sudah.

### Must

| ID | Kebutuhan | Kriteria penerimaan | Status |
|---|---|---|---|
| V2-M1 | Skema `project.json` v1 + validasi zod (versi, aspect, fps, durasi, scene, tema) | Proyek tidak valid ditolak < 50 ms dengan path yang tepat; proyek valid lolos | ❌ |
| V2-M2 | Komposisi generik `SceneVideo` + `calculateMetadata` menentukan width/height/fps/durasi | Satu `id` komposisi merender 4 rasio dari props | ❌ |
| V2-M3 | Registry 8 template responsif dengan batas teks | Semua template dirender di 4 rasio tanpa overflow | ❌ |
| V2-M4 | Tool `remotion_templates` mengembalikan katalog + skema props | Output memuat `bundleHash` dan skema tiap template | ❌ |
| V2-M5 | Tool `remotion_project` create/get/list/delete, terkonfinemen di workspace | `../` dan path absolut ditolak; proyek muncul di `list` | ❌ |
| V2-M6 | Tool `remotion_scene` add/update/remove/move dengan validasi penuh | Perubahan valid menulis `project.json`; error menyebut `scenes[i]` | ❌ |
| V2-M7 | Tool `remotion_preview` merender 1–8 frame dalam satu sesi browser | 6 frame selesai < 12 dtk setelah bundel; PNG sesuai frame | ❌ |
| V2-M8 | Tool `remotion_render` merender proyek (mp4/webm/gif) + metadata output | Output memuat path, URL, dimensi, durasi, ukuran, hash | ⚠️ (render komposisi ada; proyek belum) |
| V2-M9 | Tidak ada Chrome/bundel sebelum validasi lulus | Proyek invalid: tidak ada proses Chrome (dicek dari log) | ❌ |
| V2-M10 | Bundel di-hash; perubahan template memicu bundel baru tanpa restart Host | `bundleHash` berubah setelah file template diedit | ❌ |
| V2-M11 | Antrean serial, timeout per fase, cancel, klasifikasi error | Dua render → satu `RENDER_BUSY`; cancel menyisakan 0 proses | ❌ |
| V2-M12 | Import aset + validasi ffprobe + route bertoken dengan Range | Gambar/audio tampil di render; traversal/token salah → 403 | ❌ |
| V2-M13 | Output terkunci di `<project>/renders`, tulis atomik, retensi | Tidak ada file `.part` di daftar; retensi berjalan | ⚠️ (menulis, belum atomik/retensi) |
| V2-M14 | Provenance lengkap di hasil tool | Setiap hasil memuat proyek, hash, aspek, durasi, URL | ⚠️ (path + metadata komposisi) |
| V2-M15 | Kompatibilitas v1: `remotion_compositions` + `props.prompt` | Perintah v1 di README tetap bekerja | ⚠️ (tool ada; shim proyek belum) |

### Should

| ID | Kebutuhan | Kriteria penerimaan | Status |
|---|---|---|---|
| V2-S1 | Panel memuat proyek + riwayat + provenance | Panel menampilkan proyek dan artefak terakhir | ⚠️ (view ada, model proyek belum) |
| V2-S2 | Putar artefak di kartu tool (`tool.call.toolview`) | Video tampil di chat tanpa membuka panel | ❌ |
| V2-S3 | `settings.section`: browser, retensi, rasio default, batas durasi | Perubahan tersimpan dan memengaruhi render | ❌ |
| V2-S4 | Preview interaktif Player (gate build client) | Gate §11 lulus; scrub tanpa render | ❌ |
| V2-S5 | Audio per proyek (volume, trim, loop) | mp4 berisi track audio sesuai pengaturan | ❌ |
| V2-S6 | Batch beberapa rasio/kualitas dalam satu job | Satu job menghasilkan > 1 artefak | ❌ |
| V2-S7 | Determinisme: render dua kali identik | Frame sampel identik piksel | ❌ |
| V2-S8 | Job async (`wait:false`) + `remotion_job` | Render 60 dtk mengembalikan jobId segera | ❌ |

### Could

| ID | Kebutuhan | Catatan |
|---|---|---|
| V2-C1 | Transisi antar scene (fade/slide) dengan overlap | Menambah kompleksitas timing; fase 5 |
| V2-C2 | Contact sheet dari frame pratinjau | Bisa ditambahkan ke `remotion_preview` |
| V2-C3 | TTS/voiceover (ElevenLabs/Whisper) | Butuh kredensial + keputusan biaya (D3) |
| V2-C4 | Subtitle otomatis (captions) | Bergantung pada C3 |
| V2-C5 | Escape-hatch TSX untuk scene khusus | Ditinjau setelah template terbukti kurang (D1) |
