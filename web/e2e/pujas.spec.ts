import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import { disablePasskeys, loginWithDeviceAccount, obras } from "./helpers";

// Real bids lock test USDC in a live auction and raise its price, so this only runs on request.
test.skip(process.env.E2E_BIDS !== "1", "Ofertas reales: correr con E2E_BIDS=1 (y E2E_BID_SLUG para elegir la obra).");

const obra = obras.find((item) => item.slug === process.env.E2E_BID_SLUG) ?? obras[obras.length - 1];

async function bidderPage(browser: Browser, baseURL: string): Promise<{ page: Page; address: string }> {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, locale: "es-AR" });
  const page = await context.newPage();
  await disablePasskeys(page);
  await page.goto(`/obra/${obra.slug}`);
  const address = await loginWithDeviceAccount(page);
  return { page, address };
}

async function placeMinimumBid(page: Page): Promise<string> {
  const form = page.getByRole("form", { name: `Ofertar por ${obra.titulo}` });
  const submit = form.locator('button[type="submit"]');
  await expect(submit).toHaveText(/^Ofertar .+ USDC$/);
  const amount = (await submit.textContent())!.replace(/^Ofertar | USDC$/g, "");
  await submit.click();
  await expect(form.getByText(`Tu oferta de ${amount} USDC está depositada.`)).toBeVisible({ timeout: 90_000 });
  return amount;
}

test("superar una oferta reembolsa al instante al postor anterior", async ({ browser, baseURL }) => {
  test.setTimeout(480_000);
  const panelOf = (page: Page) => page.getByRole("region", { name: "Subasta" });

  const first = await bidderPage(browser, baseURL!);
  const firstAmount = await placeMinimumBid(first.page);
  await expect(panelOf(first.page).getByText("Vas ganando vos")).toBeVisible();

  const second = await bidderPage(browser, baseURL!);
  await placeMinimumBid(second.page);
  await expect(panelOf(second.page).getByText("Vas ganando vos")).toBeVisible();

  await expect(panelOf(first.page).getByText(`Te superaron. Tus ${firstAmount} USDC ya volvieron a tu wallet.`)).toBeVisible({
    timeout: 60_000,
  });
  await expect(panelOf(first.page).getByText(/Va ganando /)).toBeVisible();
});
