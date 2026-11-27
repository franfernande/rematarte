import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { getDeploy } from "@/lib/data";

const GRANT_USDC = "100.0000000";
const MARKER_VALUE = "100";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requests = new Map<string, { count: number; since: number }>();

function limited(request: Request): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  for (const [key, entry] of requests) {
    if (now - entry.since >= WINDOW_MS) requests.delete(key);
  }
  const current = requests.get(ip);
  if (!current || now - current.since >= WINDOW_MS) {
    requests.set(ip, { count: 1, since: now });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function marker(address: string): string {
  return `u:${address}`;
}

async function alreadyClaimed(server: Horizon.Server, distributor: string, address: string): Promise<boolean> {
  const account = await server.loadAccount(distributor);
  return Object.hasOwn(account.data_attr, marker(address));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (limited(request)) {
    return Response.json({ error: "Demasiados intentos. Esperá un minuto." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { address?: unknown } | null;
  const address = typeof body?.address === "string" ? body.address : "";
  if (!StrKey.isValidEd25519PublicKey(address)) {
    return Response.json({ error: "La cuenta Stellar no es válida." }, { status: 400 });
  }

  const secret = process.env.USDC_DISTRIBUTOR_SECRET;
  if (!secret) {
    return Response.json({ error: "La entrega de USDC todavía no está configurada." }, { status: 503 });
  }

  let distributor: Keypair;
  try {
    distributor = Keypair.fromSecret(secret);
  } catch {
    return Response.json({ error: "La entrega de USDC está mal configurada." }, { status: 503 });
  }

  const deploy = getDeploy();
  const server = new Horizon.Server(HORIZON_URL);
  const publicKey = distributor.publicKey();
  try {
    const source = await server.loadAccount(publicKey);
    if (Object.hasOwn(source.data_attr, marker(address))) {
      return Response.json({ alreadyClaimed: true, amount: GRANT_USDC });
    }

    const transaction = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: deploy.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: address,
          asset: new Asset(deploy.usdc.code, deploy.usdc.issuer),
          amount: GRANT_USDC,
        }),
      )
      // Atomic with the payment: this public marker enforces one grant per account without a database.
      .addOperation(Operation.manageData({ name: marker(address), value: MARKER_VALUE }))
      .setTimeout(60)
      .build();
    transaction.sign(distributor);
    const result = await server.submitTransaction(transaction);
    return Response.json({ alreadyClaimed: false, amount: GRANT_USDC, txHash: result.hash });
  } catch {
    // A concurrent request may have won with the same sequence number; check the durable marker before failing.
    if (await alreadyClaimed(server, publicKey, address).catch(() => false)) {
      return Response.json({ alreadyClaimed: true, amount: GRANT_USDC });
    }
    return Response.json(
      { error: "No pudimos entregar USDC. Verificá la trustline o probá de nuevo en unos segundos." },
      { status: 409 },
    );
  }
}
