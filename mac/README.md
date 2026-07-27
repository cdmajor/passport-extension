# Passport for Mac

Native **menu bar app** for macOS 13+ that routes Mac traffic (Safari, Chrome, apps) through a country proxy. Pair it with the [Safari Web Extension](../safari/README.md) for page translation.

## Why a Mac app?

Safari does not support Chrome’s `chrome.proxy` / PAC API. The Mac app sets the **system proxy** via `networksetup`, so Safari and every other app pick up the country route automatically.

| Piece | Role |
|-------|------|
| **Passport.app** (this folder) | Country picker + system HTTP/SOCKS proxy |
| **Safari extension** (`../safari/extension`) | Whop + auto-translate of page text |
| **Chrome extension** (`../chrome-extension`) | In-browser PAC proxy + translate (unchanged) |
| **API** | Live: `https://git-hub-publisher.replit.app/api` |

## Build

Requires a Mac with Xcode 15+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
brew install xcodegen
cd mac
xcodegen generate
open Passport.xcodeproj
```

Then in Xcode: select the **Passport** scheme → **My Mac** → Run.

## First run

1. Open Passport from the menu bar
2. **Settings** → confirm API base URL (`https://git-hub-publisher.replit.app/api`)
3. Paste your Whop **membership ID** (`mem_…`) — same as the browser extension
4. Pick a country — macOS may prompt for admin rights the first time `networksetup` changes proxy settings
5. Browse in Safari; enable the Safari extension for translation

## Safari translation extension

```bash
xcrun safari-web-extension-converter ../safari/extension \
  --project-location ./SafariPassport \
  --app-name "Passport" \
  --bundle-identifier com.passport.safari
```

Enable the extension in **Safari → Settings → Extensions**. Country **routing** still comes from this menu bar app.

## Permissions

App Sandbox is **off** so Passport can call `/usr/sbin/networksetup`. Network client access is enabled for talking to the Passport API.
