# Passport browser builds

Two **separate** downloads — do not mix folders.

| File / folder | Browser | Install |
|---------------|---------|---------|
| `passport-extension.zip` | **Chrome** (also Edge/Brave) | Unzip → Load unpacked → select the inner `extension/` folder |
| `safari-extension.zip` | **Safari** | Unzip → convert on a Mac (see `safari/README.md`) |
| `chrome-extension/` | Chrome source (same as the zip) | Load unpacked as-is |
| `safari/extension/` | Safari source (same as the safari zip) | Convert with `safari-web-extension-converter` |
| `mac/` | Mac menu-bar app | System proxy for Safari IP routing |

Chrome keeps PAC proxy. Safari does not — use `mac/` for geo routing.
