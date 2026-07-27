# Passport for Safari

Safari companion extension for **page translation**. Country routing on Mac is handled by the [Passport Mac menu bar app](../mac/README.md), because Safari cannot set PAC proxies like Chrome.

## Install (Mac + Xcode)

```bash
xcrun safari-web-extension-converter ./extension \
  --project-location ./SafariPassport \
  --app-name "Passport Translation" \
  --bundle-identifier com.passport.safari
```

Open the generated project, run it once, then enable **Passport Translation** under **Safari → Settings → Extensions**.

Set `API_BASE` in `extension/background.js` to your server (e.g. `http://localhost:3000/api`) before converting, or edit the resource after conversion.

## Usage

1. Launch **Passport** from the Mac menu bar and connect to a country
2. Enable this Safari extension
3. Choose your native language in extension settings and turn on auto-translate
4. Pages translate with no API key — same Google-powered server endpoint as Chrome
