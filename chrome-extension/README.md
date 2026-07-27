# Passport — Chrome extension (source)

Unpacked source for the **Chrome** build. The packaged zip at the repo root (`passport-extension.zip`) is left intact for download / Replit publish.

| Path | Role |
|------|------|
| `../passport-extension.zip` | Packaged **Chrome** extension (separate from Safari) |
| `../safari-extension.zip` | Packaged **Safari** extension (separate file) |
| `./` (this folder) | Unpacked Chrome MV3 source |
| `../safari/extension/` | Safari variant (no PAC proxy) |

## Load unpacked (Chrome / Chromium / Edge)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. **Load unpacked** → select this `chrome-extension/` folder

`API_BASE` in `background.js` / `popup/popup.js` points at `https://git-hub-publisher.replit.app/api`.

## Safari

Do not load this folder in Safari’s converter if you need the Safari-specific behavior. Use `../safari/extension/` instead (see `../safari/README.md`).
