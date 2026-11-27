import { Asset, Keypair, Operation, rpc, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import type { DeployConfig } from "@/lib/data";
import { rpcServer, type WalletSignTransaction } from "@/lib/stellar";

export type OnboardingState = {
  funded: boolean;
  hasTrustline: boolean;
  xlm: bigint;
  usdc: bigint;
};

function keys(deploy: DeployConfig, address: string) {
  const keypair = Keypair.fromPublicKey(address);
  const asset = new Asset(deploy.usdc.code, deploy.usdc.issuer);
  return {
    asset,
    account: xdr.LedgerKey.account(new xdr.LedgerKeyAccount({ accountId: keypair.xdrPublicKey() })),
    trustline: xdr.LedgerKey.trustline(
      new xdr.LedgerKeyTrustLine({ accountId: keypair.xdrAccountId(), asset: asset.toTrustLineXdrObject() }),
    ),
  };
}

export async function getOnboardingState(deploy: DeployConfig, address: string): Promise<OnboardingState> {
  const { account, trustline } = keys(deploy, address);
  const { entries } = await rpcServer(deploy).getLedgerEntries(account, trustline);
  const accountEntry = entries.flatMap(({ val }) => (val.type === "account" ? [val.account] : []))[0];
  const trustlineEntry = entries.flatMap(({ val }) => (val.type === "trustline" ? [val.trustLine] : []))[0];
  return {
    funded: Boolean(accountEntry),
    hasTrustline: Boolean(trustlineEntry),
    xlm: accountEntry?.balance ?? BigInt(0),
    usdc: trustlineEntry?.balance ?? BigInt(0),
  };
}

export async function fundWithFriendbot(deploy: DeployConfig, address: string): Promise<void> {
  const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`, { method: "GET" });
  if (!response.ok) {
    const state = await getOnboardingState(deploy, address);
    if (!state.funded) throw new Error("Friendbot no pudo activar la cuenta. Probá de nuevo en unos segundos.");
  }
}

export async function createUsdcTrustline(
  deploy: DeployConfig,
  address: string,
  signTransaction: WalletSignTransaction,
): Promise<string> {
  const server = rpcServer(deploy);
  const source = await server.getAccount(address);
  const asset = new Asset(deploy.usdc.code, deploy.usdc.issuer);
  const transaction = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: deploy.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(180)
    .build();
  const { signedTxXdr } = await signTransaction(transaction.toXDR(), {
    networkPassphrase: deploy.networkPassphrase,
    address,
  });
  const signed = TransactionBuilder.fromXDR(signedTxXdr, deploy.networkPassphrase);
  const sent = await server.sendTransaction(signed);
  if (sent.status !== "PENDING" && sent.status !== "DUPLICATE") {
    throw new Error("La red rechazó la trustline. Revisá que la wallet esté en Testnet.");
  }
  const final = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("La trustline no se confirmó. Probá de nuevo.");
  }
  return sent.hash;
}
