// Passport — Country Proxy Registry
//
// Uses a single Smartproxy endpoint. Country is selected by encoding it into
// the proxy username:  user-country-{CODE}-sessionduration-10
//
// Required env vars (set once, all countries work):
//   PROXY_HOST      e.g. gate.smartproxy.com
//   PROXY_PORT      e.g. 7000
//   PROXY_USER      your Smartproxy username (base, without country suffix)
//   PROXY_PASS      your Smartproxy password
//
// Sign up at: https://smartproxy.com  (Residential Proxies plan)

export interface ProxyEntry {
  host: string;
  port: number;
  protocol: "http" | "socks5" | "https";
  username: string;
  password: string;
  name: string;
  flagEmoji: string;
}

const HOST = process.env.PROXY_HOST ?? "";
const PORT = parseInt(process.env.PROXY_PORT ?? "7000");
const USER = process.env.PROXY_USER ?? "";
const PASS = process.env.PROXY_PASS ?? "";

const COUNTRIES: Record<string, { name: string; flagEmoji: string }> = {
  US: { name: "United States",   flagEmoji: "🇺🇸" },
  GB: { name: "United Kingdom",  flagEmoji: "🇬🇧" },
  CA: { name: "Canada",          flagEmoji: "🇨🇦" },
  AU: { name: "Australia",       flagEmoji: "🇦🇺" },
  DE: { name: "Germany",         flagEmoji: "🇩🇪" },
  FR: { name: "France",          flagEmoji: "🇫🇷" },
  JP: { name: "Japan",           flagEmoji: "🇯🇵" },
  KR: { name: "South Korea",     flagEmoji: "🇰🇷" },
  BR: { name: "Brazil",          flagEmoji: "🇧🇷" },
  IN: { name: "India",           flagEmoji: "🇮🇳" },
  SG: { name: "Singapore",       flagEmoji: "🇸🇬" },
  NL: { name: "Netherlands",     flagEmoji: "🇳🇱" },
  MX: { name: "Mexico",          flagEmoji: "🇲🇽" },
  ZA: { name: "South Africa",    flagEmoji: "🇿🇦" },
  IT: { name: "Italy",           flagEmoji: "🇮🇹" },
  ES: { name: "Spain",           flagEmoji: "🇪🇸" },
  SE: { name: "Sweden",          flagEmoji: "🇸🇪" },
  NO: { name: "Norway",          flagEmoji: "🇳🇴" },
  CH: { name: "Switzerland",     flagEmoji: "🇨🇭" },
  PL: { name: "Poland",          flagEmoji: "🇵🇱" },
  TR: { name: "Turkey",          flagEmoji: "🇹🇷" },
  PT: { name: "Portugal",        flagEmoji: "🇵🇹" },
  AR: { name: "Argentina",       flagEmoji: "🇦🇷" },
  ID: { name: "Indonesia",       flagEmoji: "🇮🇩" },
  PH: { name: "Philippines",     flagEmoji: "🇵🇭" },
  TH: { name: "Thailand",        flagEmoji: "🇹🇭" },
  VN: { name: "Vietnam",         flagEmoji: "🇻🇳" },
  NZ: { name: "New Zealand",     flagEmoji: "🇳🇿" },
  NG: { name: "Nigeria",         flagEmoji: "🇳🇬" },
  RO: { name: "Romania",         flagEmoji: "🇷🇴" },
};

function buildEntry(code: string): ProxyEntry {
  const { name, flagEmoji } = COUNTRIES[code];
  return {
    host: HOST,
    port: PORT,
    protocol: "http",
    // Smartproxy country-targeting username format
    username: USER ? `${USER}-country-${code.toLowerCase()}-sessionduration-10` : "",
    password: PASS,
    name,
    flagEmoji,
  };
}

const registry: Record<string, ProxyEntry> = Object.fromEntries(
  Object.keys(COUNTRIES).map((code) => [code, buildEntry(code)])
);

export function isProxyConfigured(): boolean {
  return !!(HOST && USER && PASS);
}

export default registry;
