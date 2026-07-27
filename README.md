# Passport — Browse the Internet from Anywhere

A **Chrome extension** and **Mac app** (with Safari translation companion) that routes your traffic through a country of your choice and translates pages into your language — **no API keys required**.

## How It Works

1. Pick a country in the Chrome extension or Mac menu bar app
2. Traffic is routed through that country’s proxy (Chrome PAC script, or macOS system proxy for Safari and all Mac apps)
3. Sites see a foreign IP and serve geo-appropriate content
4. Optional auto-translate rewrites page text into your native language via Google Translate’s public endpoint (no API key)

## Platforms

| Platform | What you get |
|----------|----------------|
| **Chrome** | Full extension: country proxy + page translation |
| **Mac** | Menu bar app sets system proxy (Safari, Chrome, apps) |
| **Safari** | Translation extension; pair with the Mac app for routing |

## Repo Structure

```
passport-extension/
├── extension/              # Chrome MV3 extension
├── safari/                 # Safari Web Extension (translation companion)
├── mac/                    # Native macOS menu bar app (SwiftUI)
├── server/                 # Node.js API (proxy configs + translation)
│   ├── languages.js        # 134 translation target languages
│   ├── routes/
│   │   ├── proxy.js
│   │   └── translate.js    # Google Translate (client=gtx), no API key
│   └── proxies/registry.js
└── README.md
```

## Translation

- **134 languages** (same list in Chrome settings, Safari settings, Mac settings, and `GET /api/languages`)
- Powered by Google’s public `translate.googleapis.com` endpoint — **no API key for you or your users**
- Quality is far stronger than MyMemory for everyday web pages

### Server API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` or `/api/health` | Health check |
| GET | `/api/languages` | Supported translation languages |
| GET | `/api/proxy/countries` | Available countries |
| GET | `/api/proxy/config/:countryCode` | Proxy host/port for a country |
| POST | `/api/translate` | Translate texts (no API key) |
| POST | `/api/detect` | Detect sample language |

## Setup

### Server

```bash
cd server
npm install
cp .env.example .env   # fill in proxy hosts
npm run dev
```

Environment variables:
```
PORT=3000
# Per-country proxy hosts — see proxies/registry.js / .env.example
```

### Chrome extension

1. Set `API_BASE` in `extension/background.js` to your server URL including `/api` (e.g. `http://localhost:3000/api`)
2. Open `chrome://extensions` → Developer Mode → Load Unpacked → select `extension/`

### Mac app

See [`mac/README.md`](mac/README.md). Short version:

```bash
brew install xcodegen
cd mac && xcodegen generate && open Passport.xcodeproj
```

Run Passport, set the API base URL in Settings, pick a country. System proxy now covers Safari and other apps.

### Safari translation extension

See [`safari/README.md`](safari/README.md). Convert with `xcrun safari-web-extension-converter`, enable in Safari Settings → Extensions, and use the Mac app for country routing.

## Proxy Architecture

### Chrome

Uses `chrome.proxy` with a PAC script:

```js
function FindProxyForURL(url, host) {
  return "SOCKS5 ${proxyHost}:${proxyPort}";
}
```

### Mac / Safari

The Mac app calls `networksetup` to set the active service’s SOCKS or HTTP proxy system-wide. Safari has no PAC API equivalent, so this is the supported path on Apple platforms.

### Proxy Registry

`server/proxies/registry.js` maps ISO country codes to proxy servers. Supply your own hosts (self-hosted VPS, residential providers, etc.) via env vars — see `.env.example`.

## Permissions

**Chrome:** `proxy`, `storage`, `activeTab`, `scripting`

**Mac app:** network client; sandbox off so it can run `networksetup`

**Safari extension:** `storage`, `activeTab`, `scripting` (no proxy permission — Mac app handles routing)

## Known Limitations

- Chrome’s `chrome.proxy` applies to the whole browser profile, not a single tab
- Safari country routing requires the Mac menu bar app
- The Google web translate endpoint is undocumented and rate-limited; fine for personal use, not a billed SLA
- Some streaming services block datacenter proxies — residential proxies work better
- macOS may prompt for admin approval when changing system proxy settings
