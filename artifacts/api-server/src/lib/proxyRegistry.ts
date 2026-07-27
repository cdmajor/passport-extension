// Passport — Country Proxy Registry
// Each entry maps an ISO 3166-1 alpha-2 country code to a proxy server config.
// Populate via environment variables (see .env.example).

export interface ProxyEntry {
  host: string;
  port: number;
  protocol: "socks5" | "http" | "https";
  name: string;
  flagEmoji: string;
}

const registry: Record<string, ProxyEntry> = {
  US: {
    host: process.env.PROXY_US_HOST ?? "REPLACE_WITH_US_PROXY_HOST",
    port: parseInt(process.env.PROXY_US_PORT ?? "1080"),
    protocol: "socks5",
    name: "United States",
    flagEmoji: "🇺🇸",
  },
  GB: {
    host: process.env.PROXY_GB_HOST ?? "REPLACE_WITH_GB_PROXY_HOST",
    port: parseInt(process.env.PROXY_GB_PORT ?? "1080"),
    protocol: "socks5",
    name: "United Kingdom",
    flagEmoji: "🇬🇧",
  },
  CA: {
    host: process.env.PROXY_CA_HOST ?? "REPLACE_WITH_CA_PROXY_HOST",
    port: parseInt(process.env.PROXY_CA_PORT ?? "1080"),
    protocol: "socks5",
    name: "Canada",
    flagEmoji: "🇨🇦",
  },
  AU: {
    host: process.env.PROXY_AU_HOST ?? "REPLACE_WITH_AU_PROXY_HOST",
    port: parseInt(process.env.PROXY_AU_PORT ?? "1080"),
    protocol: "socks5",
    name: "Australia",
    flagEmoji: "🇦🇺",
  },
  DE: {
    host: process.env.PROXY_DE_HOST ?? "REPLACE_WITH_DE_PROXY_HOST",
    port: parseInt(process.env.PROXY_DE_PORT ?? "1080"),
    protocol: "socks5",
    name: "Germany",
    flagEmoji: "🇩🇪",
  },
  FR: {
    host: process.env.PROXY_FR_HOST ?? "REPLACE_WITH_FR_PROXY_HOST",
    port: parseInt(process.env.PROXY_FR_PORT ?? "1080"),
    protocol: "socks5",
    name: "France",
    flagEmoji: "🇫🇷",
  },
  JP: {
    host: process.env.PROXY_JP_HOST ?? "REPLACE_WITH_JP_PROXY_HOST",
    port: parseInt(process.env.PROXY_JP_PORT ?? "1080"),
    protocol: "socks5",
    name: "Japan",
    flagEmoji: "🇯🇵",
  },
  KR: {
    host: process.env.PROXY_KR_HOST ?? "REPLACE_WITH_KR_PROXY_HOST",
    port: parseInt(process.env.PROXY_KR_PORT ?? "1080"),
    protocol: "socks5",
    name: "South Korea",
    flagEmoji: "🇰🇷",
  },
  BR: {
    host: process.env.PROXY_BR_HOST ?? "REPLACE_WITH_BR_PROXY_HOST",
    port: parseInt(process.env.PROXY_BR_PORT ?? "1080"),
    protocol: "socks5",
    name: "Brazil",
    flagEmoji: "🇧🇷",
  },
  IN: {
    host: process.env.PROXY_IN_HOST ?? "REPLACE_WITH_IN_PROXY_HOST",
    port: parseInt(process.env.PROXY_IN_PORT ?? "1080"),
    protocol: "socks5",
    name: "India",
    flagEmoji: "🇮🇳",
  },
  SG: {
    host: process.env.PROXY_SG_HOST ?? "REPLACE_WITH_SG_PROXY_HOST",
    port: parseInt(process.env.PROXY_SG_PORT ?? "1080"),
    protocol: "socks5",
    name: "Singapore",
    flagEmoji: "🇸🇬",
  },
  NL: {
    host: process.env.PROXY_NL_HOST ?? "REPLACE_WITH_NL_PROXY_HOST",
    port: parseInt(process.env.PROXY_NL_PORT ?? "1080"),
    protocol: "socks5",
    name: "Netherlands",
    flagEmoji: "🇳🇱",
  },
  MX: {
    host: process.env.PROXY_MX_HOST ?? "REPLACE_WITH_MX_PROXY_HOST",
    port: parseInt(process.env.PROXY_MX_PORT ?? "1080"),
    protocol: "socks5",
    name: "Mexico",
    flagEmoji: "🇲🇽",
  },
  ZA: {
    host: process.env.PROXY_ZA_HOST ?? "REPLACE_WITH_ZA_PROXY_HOST",
    port: parseInt(process.env.PROXY_ZA_PORT ?? "1080"),
    protocol: "socks5",
    name: "South Africa",
    flagEmoji: "🇿🇦",
  },
};

export default registry;
