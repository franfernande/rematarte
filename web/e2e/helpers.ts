import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export type Obra = {
  slug: string;
  titulo: string;
  precioMinimoUsdc: number;
  incrementoMinimoUsdc: number;
};

const dataDir = path.join(__dirname, "..", "data");
const obrasPath = existsSync(path.join(dataDir, "obras.json"))
  ? path.join(dataDir, "obras.json")
  : path.join(dataDir, "mocks", "obras.json");

export const obras: Obra[] = JSON.parse(readFileSync(obrasPath, "utf8"));

const FAUCET_RETRY_MS = 65_000;

// Headless Chromium may report passkey support; hiding WebAuthn forces the "account on this device" path.
export async function disablePasskeys(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "PublicKeyCredential", { value: undefined, configurable: true });
  });
}

// Creates a throwaway Testnet account stored in this browser context and waits until it holds test USDC.
export async function loginWithDeviceAccount(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Entrar", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: /Entrá a la muestra/ });
  await dialog.getByRole("button", { name: "Crear cuenta en este dispositivo" }).click();

  const ready = dialog.getByText("¡Listo!");
  const failed = dialog.getByRole("button", { name: "Crear cuenta en este dispositivo" });
  await expect(ready.or(failed)).toBeVisible({ timeout: 120_000 });

  if (await failed.isVisible()) {
    // Usually the faucet's per-IP limit; the device account is reused and finished steps are skipped.
    await page.waitForTimeout(FAUCET_RETRY_MS);
    await failed.click();
    await expect(ready).toBeVisible({ timeout: 120_000 });
  }

  await expect(dialog.getByText(/Saldo de prueba: 200(,0+)? USDC/)).toBeVisible();
  const address = await page.evaluate(() => {
    const raw = localStorage.getItem("rematarte.local-wallet");
    return raw ? (JSON.parse(raw) as { publicKey: string }).publicKey : null;
  });
  expect(address).toMatch(/^G[A-Z2-7]{55}$/);
  await dialog.getByRole("button", { name: "Entrar a la muestra" }).click();
  await expect(dialog).toBeHidden();
  return address!;
}
