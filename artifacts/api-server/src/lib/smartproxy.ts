// Smartproxy User+Password gateway auth
// No IP-fetch API call needed — credentials are static, country is encoded
// in the username. Extension handles proxy auth via onAuthRequired.
//
// Gateway: gate.smartproxy.com:10000
// Username format: {sub-user}-cc-{CC}   (e.g. user123-cc-US)
// Password: sub-account password

const USER = process.env.SMARTPROXY_USER ?? "";
const PASS = process.env.SMARTPROXY_PASS ?? "";

const GATEWAY_HOST = "gate.smartproxy.com";
const GATEWAY_PORT = 10000;

export interface ProxyConfig {
  host:     string;
  port:     number;
  protocol: "http";
  username: string;
  password: string;
}

export function getProxyForCountry(countryCode: string): ProxyConfig {
  if (!USER || !PASS) throw new Error("SMARTPROXY_USER / SMARTPROXY_PASS not set");
  const cc = countryCode.toUpperCase();
  return {
    host:     GATEWAY_HOST,
    port:     GATEWAY_PORT,
    protocol: "http",
    username: `${USER}-cc-${cc}`,
    password: PASS,
  };
}

export function isSmartproxyConfigured(): boolean {
  return !!(USER && PASS);
}
