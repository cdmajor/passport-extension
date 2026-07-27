# Passport — Browse the Internet from Anywhere

A Chrome & Safari extension that routes your traffic through a country of your choice and translates pages into your native language.

## How It Works

1. User clicks the Passport toolbar icon and picks a country
2. The extension sets a PAC-script proxy via `chrome.proxy.settings.set()` — all tab traffic is rerouted through a country-specific SOCKS5/HTTP proxy
3. Sites see a foreign IP and serve geo-appropriate content (region-locked video, local search results, country pricing, etc.)
4. The content script optionally translates the page text into the user's preferred language (same approach as Ekosee)

## Repo Structure

```
passport-extension/
├── extension/              # Browser extension (Chrome MV3 / Safari)
│   ├── manifest.json
│   ├── background.js       # Proxy switching logic (chrome.proxy API)
│   ├── content.js          # Optional page translation
│   ├── popup/              # Country picker UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/            # Settings: native language, auto-translate toggle
│   │   ├── options.html
│   │   └── options.js
│   └── icons/
├── server/                 # Node.js API server
│   ├── index.js            # Express entry point
│   ├── routes/
│   │   ├── proxy.js        # GET /api/proxy/countries, GET /api/proxy/config/:countryCode
│   │   └── translate.js    # POST /api/translate (GPT-4o-mini, same as Ekosee)
│   └── proxies/
│       └── registry.js     # Country → proxy server mapping
└── landing/                # React + Vite landing/download page
    └── src/
        ├── App.tsx
        ├── index.css
        └── main.tsx
```

## Proxy Architecture

The extension uses Chrome's built-in `chrome.proxy` API with a PAC (Proxy Auto-Config) script:

```js
// background.js
const pac = `
  function FindProxyForURL(url, host) {
    return "SOCKS5 ${proxyHost}:${proxyPort}";
  }
`;
chrome.proxy.settings.set({
  value: { mode: "pac_script", pacScript: { data: pac } },
  scope: "regular"
});
```

This routes **all** browser traffic (not just one tab) through the proxy. To scope it per-tab you'd need a separate proxy per tab, which requires a different architecture — see the `per-tab` branch notes in `extension/background.js`.

### Proxy Registry

`server/proxies/registry.js` maps ISO country codes to proxy server configs:

```js
module.exports = {
  US: { host: "us-proxy.example.com", port: 1080, protocol: "socks5" },
  FR: { host: "fr-proxy.example.com", port: 1080, protocol: "socks5" },
  JP: { host: "jp-proxy.example.com", port: 1080, protocol: "socks5" },
  // ... one entry per supported country
};
```

**You need to supply proxy server credentials.** Options:
- Self-host with [Outline](https://getoutline.org/) or [3proxy](https://3proxy.ru/) on a VPS per country
- Buy wholesale residential proxies from a provider (Bright Data, Oxylabs, Smartproxy) and map their endpoints here
- Use a commercial SOCKS5 API and call their endpoint per country selection

### Server API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/proxy/countries` | Returns list of available countries with names + codes |
| GET | `/api/proxy/config/:countryCode` | Returns proxy host/port for the given country (served over HTTPS only) |
| POST | `/api/translate` | Translates page text (GPT-4o-mini) |

The extension fetches `/api/proxy/config/:countryCode` and uses the returned host/port to build its PAC script. Credentials are never stored in the extension itself — they are resolved server-side and injected into the PAC script response.

## Setup

### Server

```bash
cd server
npm install
cp .env.example .env   # fill in proxy credentials + OpenAI key
npm run dev
```

Environment variables:
```
OPENAI_API_KEY=
SERVER_PORT=3000
# Add per-country proxy credentials as needed — see proxies/registry.js
```

### Extension

1. Set `API_BASE` in `extension/background.js` to your server URL (or use the landing page download button — it bakes it in at download time)
2. Open `chrome://extensions` → Developer Mode → Load Unpacked → select `extension/`
3. Safari: use Xcode → File → New → Target → Safari Web Extension → import

### Landing Page

```bash
cd landing
npm install
npm run dev
```

## Permissions

The extension requires these Chrome permissions:
- `proxy` — to set the country proxy
- `storage` — to persist the selected country and language preferences
- `activeTab` — for the content script translation feature
- `scripting` — to inject the translation content script on demand

## Known Limitations

- `chrome.proxy.settings.set()` applies to the **entire browser profile**, not a single tab. All tabs change country simultaneously.
- VPNs and system proxies can conflict with the extension proxy setting.
- Safari's proxy API support is more limited than Chrome's — test thoroughly on Safari.
- Some streaming services (Netflix, Disney+) detect and block datacenter proxies. Residential proxies work better for those.
