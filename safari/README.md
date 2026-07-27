# Passport for Safari

Safari Web Extension for **Whop membership**, **country preference**, and **page translation**.

Safari cannot set PAC proxies (`chrome.proxy` is unsupported). **IP / geo routing** on Mac is handled by the [Passport Mac menu-bar app](../mac/README.md) that sets the system proxy.

The **Chrome** build is unchanged:

| Path | Browser |
|------|---------|
| `../passport-extension.zip` | Packaged **Chrome** extension (unchanged) |
| `../safari-extension.zip` | Packaged **Safari** extension (separate file) |
| `../chrome-extension/` | Unpacked Chrome source (PAC proxy + translate) |
| `./extension/` | Safari source (no PAC; translate + Whop) |

## Convert & install (Mac + Xcode)

```bash
cd safari
xcrun safari-web-extension-converter ./extension \
  --project-location ./SafariPassport \
  --app-name "Passport" \
  --bundle-identifier com.passport.safari
```

1. Open the generated Xcode project and run it once (My Mac).
2. Enable **Passport** under **Safari → Settings → Extensions**.
3. Grant access to the sites you want translated.
4. Activate with a Whop membership (same flow as Chrome).
5. Turn on **Auto-translate** in the popup; set your language under **Settings**.

`API_BASE` in `extension/background.js` already points at the live Replit API (`https://git-hub-publisher.replit.app/api`).

## What works in Safari vs Chrome

| Feature | Chrome | Safari |
|---------|--------|--------|
| Whop checkout / restore | Yes | Yes |
| Auto page translate | Yes | Yes |
| Country PAC proxy in-browser | Yes | No — use system proxy / Mac app |
| Selecting a country in the popup | Applies proxy + bills session | Saves preference only (no `/proxy/config`) |

## Develop without converting

You can edit files under `safari/extension/` the same way as Chrome. After changes, re-run the converter or rebuild the Xcode wrapper app so Safari picks up the new resources.
