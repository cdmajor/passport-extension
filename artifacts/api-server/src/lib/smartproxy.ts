// Smartproxy IP-fetch service
// Calls the Smartproxy get-ip API to fetch a fresh proxy for a given country.
// Proxies are cached for 25 min (life=30, with 5 min buffer).

const API_KEY = process.env.SMARTPROXY_API_KEY ?? "";
const BASE    = "https://api.smartproxy.org/web_v1/ip/get-ip-v3";
const TTL_MS  = 25 * 60 * 1000; // 25 minutes

interface CachedProxy {
  host: string;
  port: number;
  fetchedAt: number;
}

const cache = new Map<string, CachedProxy>();

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: "http";
}

export async function getProxyForCountry(countryCode: string): Promise<ProxyConfig> {
  const code = countryCode.toUpperCase();
  const cached = cache.get(code);

  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { host: cached.host, port: cached.port, protocol: "http" };
  }

  if (!API_KEY) throw new Error("SMARTPROXY_API_KEY not set");

  const url = new URL(BASE);
  url.searchParams.set("app_key", API_KEY);
  url.searchParams.set("pt",      "9");   // residential rotating
  url.searchParams.set("num",     "1");
  url.searchParams.set("cc",      code);
  url.searchParams.set("life",    "30");
  url.searchParams.set("lb",      "\n");
  url.searchParams.set("format",  "txt");
  url.searchParams.set("protocol","1");   // HTTP

  const res = await fetch(url.toString());
  const text = await res.text().then((t) => t.trim());

  // Error responses are JSON: {"code":114,"msg":"..."}
  if (text.startsWith("{")) {
    const err = JSON.parse(text) as { msg?: string; code?: number };
    throw new Error(err.msg ?? `Smartproxy error ${err.code}`);
  }

  // Success: "ip:port" (one per line, we requested 1)
  const line = text.split("\n")[0].trim();
  const [host, portStr] = line.split(":");
  if (!host || !portStr) throw new Error(`Unexpected proxy format: ${line}`);

  const port = parseInt(portStr, 10);
  cache.set(code, { host, port, fetchedAt: Date.now() });

  return { host, port, protocol: "http" };
}

export function isSmartproxyConfigured(): boolean {
  return !!API_KEY;
}
