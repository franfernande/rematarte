import { expect, test } from "@playwright/test";
import { obras } from "./helpers";

test("la portada muestra todas las obras y lleva a su ficha", async ({ page }) => {
  await page.goto("/");
  for (const obra of obras) {
    await expect(page.locator(`a[href="/obra/${obra.slug}"]`).first()).toBeVisible();
  }

  const [primera] = obras;
  await page.locator(`main a[href="/obra/${primera.slug}"]`).last().click();
  await expect(page).toHaveURL(new RegExp(`/obra/${primera.slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: primera.titulo })).toBeVisible();
});

for (const obra of obras) {
  test(`la ficha de "${obra.titulo}" lee la subasta en vivo`, async ({ page }) => {
    await page.goto(`/obra/${obra.slug}`);
    const panel = page.getByRole("region", { name: "Subasta" });
    await expect(panel.getByText(/^(En vivo|Últimos minutos|Cerrada|Vendida)$/)).toBeVisible();
    await expect(panel.getByText(/^(Precio base|Puja actual|Puja ganadora)$/)).toBeVisible();
    await expect(panel.getByText("No pudimos leer la subasta.")).toHaveCount(0);
  });
}

test("una obra que no existe muestra la página 404", async ({ page }) => {
  await page.goto("/obra/no-existe");
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});

test("la hoja de QR tiene una cartela por obra apuntando a su ficha", async ({ page, baseURL }) => {
  await page.goto("/qr");
  const host = new URL(baseURL!).host;
  for (const obra of obras) {
    const qr = page.getByRole("img", { name: `Código QR de la subasta de ${obra.titulo}` });
    await expect(qr).toBeVisible();
    await expect(qr.locator("svg")).toHaveCount(1);
    await expect(page.locator("figcaption", { hasText: `${host}/obra/${obra.slug}` })).toBeVisible();
  }
});
