# dsh-plugins-collections

Koleksi plugin [DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness) yang dipakai di
perangkat ini, disimpan sebagai sumber kode — bukan sekadar daftar nama. Tujuannya: satu `git clone`
cukup untuk memasang ulang semuanya di mesin lain.

Diuji pada DSH `0.2.1-rc.5`, pnpm `12.18.0`, Node `24.22.2`, profil `web`.

## Isi

| Paket | Versi | Status di profil `web` | Dependency npm |
|---|---|---|---|
| [`packages/dsh-bg-gradient`](packages/dsh-bg-gradient) | 0.1.0 | terpasang (via `insert` patch) | — |
| [`packages/usrsoda-gif`](packages/usrsoda-gif) | 1.2.0 | terpasang | — |
| [`packages/opencode-go-usage`](packages/opencode-go-usage) | 0.1.0 | terpasang | — |
| `dsh-peak-hours` | ^1.13.20 | terpasang (dari npm, tidak di-vendor) | — |
| [`packages/dsh-situ-ticket`](packages/dsh-situ-ticket) | 0.2.5 | belum | — |
| [`packages/dsh-remotion`](packages/dsh-remotion) | 1.0.0 | belum | Remotion ~470 MB |
| [`packages/dsh-agent-orchestration`](packages/dsh-agent-orchestration) | 1.0.0 | belum | — |

`dsh-peak-hours` sengaja tidak disalin; paket itu publik di npm (`MIT`, oleh
[run666888](https://github.com/run666888/dsh-peak-hours)) dan cukup dipin versinya.

## Struktur

```
.
├─ packages/           # satu folder per plugin, berisi sumber lengkap
└─ profile/            # snapshot konfigurasi profil DSH "web"
   ├─ package.json     # dependencies + dsh.profile.bundles (link: relatif)
   └─ cordis.patch.yml # lapisan patch: insert dsh-bg-gradient
```

## Cara pasang

### 1. Clone

```bash
git clone https://github.com/yogiex/dsh-plugins-collections.git
```

### 2. Daftarkan ke profil

Plugin DSH dipasang ke sebuah **profil** (`~/.dsh/profiles/<nama>`), bukan ke CLI global.
Bandingkan dulu `profile/package.json` di repo ini dengan milik Anda, lalu tambahkan
entri `link:` yang sesuai — path-nya relatif terhadap folder profil:

```json
"dependencies": {
  "@local/usrsoda-gif": "link:../../../dsh-playground/dsh-plugins-collections/packages/usrsoda-gif"
}
```

`dsh-bg-gradient` **jangan** dimasukkan ke `dsh.profile.bundles`. Dia dipasang lewat
entri `insert` di lapisan patch (lihat [`profile/cordis.patch.yml`](profile/cordis.patch.yml)).
Loader tidak melakukan dedupe `id`, jadi mendaftarkannya di dua tempat membuat plugin
ter-mount dua kali.

### 3. Install & verifikasi

```bash
dsh plugin --profile web install        # tambahkan --no-frozen-lockfile bila lockfile basi
```

Verifikasi yang benar (bukan `--dump-config`, karena perintah itu hanya mengomposisi
patch tanpa import modul):

```bash
cd ~/.dsh/profiles/web
readlink -f node_modules/@local/*
node -e "const{createRequire}=require('module');const r=createRequire(process.cwd()+'/package.json');console.log(r.resolve('@local/usrsoda-gif'))"
```

Lalu restart `dsh web` dan muat ulang Web GUI.

## Catatan per plugin

### dsh-situ-ticket

Membaca tiket & task Service Desk Telkom University (Situ) lewat tool `situ_ticket`
(read-only) plus panel sidebar. Kredensial **tidak** disimpan di repo: isi lewat
`~/.dsh/situ-credentials.json`, env `SITU_USERNAME`/`SITU_PASSWORD`, atau `credentialsFile`.

### dsh-remotion

Render video Remotion dari dalam DSH. Sebelum dipakai:

```bash
cd packages/dsh-remotion && npm install     # ±470 MB
```

Butuh Chrome/Edge (atau biarkan Remotion mengunduh headless shell saat render pertama).
**Lisensi Remotion bukan MIT** — gratis untuk individu dan perusahaan ≤3 orang, di atas
itu perlu lisensi komersial: https://www.remotion.dev/pricing

### opencode-go-usage

Mencatat pemakaian OpenCode Go dari stream LLM DSH. Plugin ini **membaca**
`~/.dsh/sessions` dan `~/.local/share/opencode/opencode.db`, lalu **menulis**
`~/.dsh/opencode-go-usage.json`. Tidak ada data yang dikirim keluar.

Diketahui belum sempurna: 831 event tercatat tetapi seluruh `tokens` bernilai `0`,
jadi hook usage belum menangkap angka token.

### dsh-bg-gradient

Latar gradien untuk Web GUI + baris di Settings. Preset disimpan di
`~/.dsh/dsh-bg-gradient.json` (state runtime, tidak masuk repo).

## Atribusi & hak cipta

- **`packages/usrsoda-gif`** memuat GIF/video dari unggahan [@usrsoda](https://x.com/usrsoda)
  di X. Hak cipta tetap milik pembuatnya; berkas media ikut di sini untuk keperluan
  pemakaian pribadi, bukan lisensi bebas. `client.js` meng-embed media tersebut sebagai
  base64, jadi menghapus folder `media/` saja tidak menghilangkan asetnya dari bundle.
- Plugin lain di repo ini berlisensi MIT kecuali disebutkan lain (Remotion, lihat di atas).

## Yang tidak disimpan di repo

`node_modules/`, hasil render (`media/renders/`), cache, log, kredensial
(`.credentials.yaml`, `situ-credentials.json`), dan data pemakaian
(`opencode-go-usage.json`, `dsh-bg-gradient.json`) — semuanya masuk `.gitignore`.
