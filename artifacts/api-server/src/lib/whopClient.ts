import Whop from '@whop/sdk';

let clientPromise: Promise<Whop> | null = null;

async function initWhopClient(): Promise<Whop> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      'Missing Replit environment variables. ' +
        'Ensure the Whop integration is connected via the Integrations tab.',
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=whop`,
    {
      headers: { Accept: 'application/json', 'X-Replit-Token': xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Whop credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = await resp.json() as { items?: Array<{ settings?: { api_key?: string } }> };
  const settings = data.items?.[0]?.settings;

  if (!settings?.api_key) {
    throw new Error(
      'Whop integration not connected or missing credentials. ' +
        'Connect Whop via the Integrations tab first.',
    );
  }

  return new Whop({ apiKey: settings.api_key });
}

export function getWhopClient(): Promise<Whop> {
  if (!clientPromise) {
    clientPromise = initWhopClient().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }

  return clientPromise;
}

// Returns the raw API key for endpoints not yet covered by the SDK.
export async function getWhopApiKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) throw new Error('Missing Replit env vars');

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=whop`,
    { headers: { Accept: 'application/json', 'X-Replit-Token': xReplitToken }, signal: AbortSignal.timeout(10_000) },
  );
  if (!resp.ok) throw new Error(`Failed to fetch Whop credentials: ${resp.status}`);
  const data = await resp.json() as { items?: Array<{ settings?: { api_key?: string } }> };
  const key = data.items?.[0]?.settings?.api_key;
  if (!key) throw new Error('Whop API key not found in connection settings');
  return key;
}
