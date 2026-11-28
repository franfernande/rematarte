import { expect, test } from "@playwright/test";
import { disablePasskeys, loginWithDeviceAccount } from "./helpers";

test("una cuenta nueva queda lista para ofertar con 200 USDC de prueba", async ({ page, request, baseURL }) => {
  await disablePasskeys(page);
  await page.goto("/empezar");
  const address = await loginWithDeviceAccount(page);

  await expect(page.getByRole("link", { name: "Ir a la muestra" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
  await expect(page.getByTitle(address).first()).toBeVisible();

  const again = await request.post("/api/faucet", {
    headers: { origin: new URL(baseURL!).origin },
    data: { address },
  });
  expect(again.status()).toBe(200);
  expect(await again.json()).toMatchObject({ funded: false });
});

test("la faucet rechaza otros orígenes y direcciones inválidas", async ({ request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign = await request.post("/api/faucet", {
    headers: { origin: "https://otro-sitio.example" },
    data: { address: "GDNQJIVKZNQTS4ZGH2W6VJPK4SQP4JIJR4YMWK7UHNOGQNYWN3F2BF3D" },
  });
  expect(foreign.status()).toBe(403);

  const invalid = await request.post("/api/faucet", { headers: { origin }, data: { address: "no-es-una-cuenta" } });
  expect(invalid.status()).toBe(400);
});
