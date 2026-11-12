# Install @local/dsh-agent-orchestration (v1.0.0)

Plugin papan orchestration live untuk subagent yang didelegasikan, tampil sebagai
view di conversation Web UI DSH. Tanpa dependency npm tambahan.

## 1. Ekstrak

Ekstrak zip ini ke folder permanen, misalnya:

```
C:\Users\<ANDA>\dsh-plugins\dsh-agent-orchestration
```

## 2. Daftarkan ke DSH

Cara A - Plugin Manager DSH: `install_bundle` dengan target folder absolut
`C:\Users\<ANDA>\dsh-plugins\dsh-agent-orchestration`.

Cara B - manual, edit `~/.dsh/profiles/desktop/package.json`:

```json
"dependencies": {
  "@local/dsh-agent-orchestration": "link:C:/Users/<ANDA>/dsh-plugins/dsh-agent-orchestration"
},
"dsh": {
  "profile": {
    "bundles": [ "...", "@local/dsh-agent-orchestration" ]
  }
}
```

lalu jalankan `pnpm install` di folder profil dan restart DSH.

## 3. Verifikasi

Restart DSH, buka Web UI, cek view **Orchestration** muncul dan menampilkan
tree subagent saat ada delegasi.
