import type { KitEventType, Networks, StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";

type WalletKit = {
  kit: typeof StellarWalletsKit;
  KitEventType: typeof KitEventType;
};

let walletKit: Promise<WalletKit> | undefined;

export class WrongNetworkError extends Error {
  constructor(readonly walletNetworkPassphrase: string) {
    super("La wallet está en otra red.");
    this.name = "WrongNetworkError";
  }
}

// SEP-43 code that Varial and Albedo use when the user rejects a request.
const USER_REJECTED = -4;

export function isUserRejection(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === USER_REJECTED;
}

// The kit reads window and localStorage at import time, so it must only load in the browser.
export function loadWalletKit(networkPassphrase: string): Promise<WalletKit> {
  walletKit ??= (async () => {
    const [{ StellarWalletsKit, KitEventType }, { AlbedoModule }, { VarialModule }] = await Promise.all([
      import("@creit-tech/stellar-wallets-kit"),
      import("@creit-tech/stellar-wallets-kit/modules/albedo"),
      import("@creit-tech/stellar-wallets-kit/modules/varial"),
    ]);
    StellarWalletsKit.init({
      // D3: Albedo for the jury (web, nothing to install), Varial (ex Freighter) for the team.
      modules: [new AlbedoModule(), new VarialModule()],
      network: networkPassphrase as Networks,
    });
    return { kit: StellarWalletsKit, KitEventType };
  })().catch((error: unknown) => {
    walletKit = undefined;
    throw error;
  });
  return walletKit;
}
