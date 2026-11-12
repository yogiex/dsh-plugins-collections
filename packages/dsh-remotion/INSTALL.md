# Install @local/dsh-remotion (v1.0.0)

Plugin Remotion untuk DSH: panel view "Remotion" di conversation + tool
`remotion_render` / `remotion_compositions`.

## 1. Prasyarat

- Node.js 20+ dan npm (untuk memasang dependency plugin).
- DSH dengan akses ke folder profil (`~/.dsh/profiles/desktop` di default).
- Chrome atau Edge terpasang (atau biarkan Remotion mengunduh Chrome Headless Shell
  saat render pertama). Override lewat env `REMOTION_BROWSER_EXECUTABLE`.
- Koneksi internet saat `npm install` (dependency Remotion ~470 MB).

## 2. Ekstrak

Ekstrak zip ini ke folder permanen, misalnya:

```
C:\Users\<ANDA>\dsh-plugins\dsh-remotion
```

Jangan pindahkan folder setelah plugin di-install (profil memakai link ke path ini).

## 3. Pasang dependency

```powershell
cd C:\Users\<ANDA>\dsh-plugins\dsh-remotion
npm install
```

`node_modules/` (~670 MB) tidak disertakan di zip supaya file kecil; `npm install`
akan membuatnya.

## 4. Daftarkan ke DSH

Cara A - Plugin Manager DSH: `install_bundle` dengan target folder absolut
`C:\Users\<ANDA>\dsh-plugins\dsh-remotion`.

Cara B - manual, edit `~/.dsh/profiles/desktop/package.json`:

```json
"dependencies": {
  "@local/dsh-remotion": "link:C:/Users/<ANDA>/dsh-plugins/dsh-remotion"
},
"dsh": {
  "profile": {
    "bundles": [ "...", "@local/dsh-remotion" ]
  }
}
```

lalu jalankan `pnpm install` di folder profil dan restart DSH.

## 5. Verifikasi

- Restart DSH, buka Web UI, cek view **Remotion** muncul di conversation.
- Panggil tool `remotion_compositions`; render pertama butuh ~10-20 detik
  (bundling + start Chrome).

## Catatan

- Folder `.cache/` dan `media/renders/` akan dibuat ulang saat dipakai.
- Lisensi Remotion bukan MIT: gratis untuk individu / perusahaan <= 3 orang,
  selain itu perlu lisensi komersial (https://www.remotion.dev/pricing).
