# Passport for Mac

Native **menu bar app** for macOS 13+ that routes all Mac traffic (Safari, Chrome, apps) through a country proxy. Pair it with the Safari Web Extension for optional page translation.

## Why a Mac app?

Safari does not support Chrome’s `chrome.proxy` / PAC API. The Mac app sets the **system proxy** via `networksetup`, so Safari and every other app pick up the country route automatically.

| Piece | Role |
|-------|------|
| **Passport.app** (this folder) | Country picker + system SOCKS/HTTP proxy |
| **Safari extension** (`../safari/extension`) | Optional auto-translate of page text |
| **API server** (`../server`) | Country proxy configs + translation (no API keys) |

## Build

Requires a Mac with Xcode 15+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
brew install xcodegen
cd mac
xcodegen generate
open Passport.xcodeproj
```

Then in Xcode: select the **Passport** scheme → **My Mac** → Run.

Or from the command line:

```bash
xcodebuild -scheme Passport -configuration Release -derivedDataPath build
# App: build/Build/Products/Release/Passport.app
```

## First run

1. Start the Passport API server (`cd server && npm start`)
2. Open Passport from the menu bar
3. **Settings** → set API base URL (default `http://localhost:3000/api`)
4. Pick a country — macOS may prompt for admin rights the first time `networksetup` changes proxy settings
5. Browse in Safari (or any app); traffic uses that country’s proxy

## Safari translation extension

```bash
# On a Mac, convert the Safari extension folder (or open it in an Xcode Safari Web Extension app):
xcrun safari-web-extension-converter ../safari/extension --project-location ./SafariPassport --app-name "Passport Translation"
```

Enable the extension in **Safari → Settings → Extensions**. Set your native language in the extension options. Country **routing** still comes from the menu bar app.

## Permissions

App Sandbox is **off** so Passport can call `/usr/sbin/networksetup`. Network client access is enabled for talking to your Passport API.
