import { expect, test } from "@playwright/test";
import { obras } from "./helpers";

const [obra] = obras;

test("el formulario precarga la oferta mínima y valida el monto", async ({ page }) => {
  await page.goto(`/obra/${obra.slug}`);
  const form = page.getByRole("form", { name: `Ofertar por ${obra.titulo}` });
  const panel = page.getByRole("region", { name: "Subasta" });
  await expect(panel.getByText(/^(En vivo|Últimos minutos|Cerrada|Vendida)$/)).toBeVisible();
  test.skip(!(await form.isVisible()), "La subasta ya cerró.");

  const minimumText = await form.getByText(/^Mínima: .+ USDC$/).textContent();
  const minimum = minimumText!.replace(/^Mínima: | USDC$/g, "");
  const input = form.getByLabel("Tu oferta");
  const submit = form.locator('button[type="submit"]');
  await expect(input).toHaveValue(/^\d+([.,]\d+)?$/);
  await expect(submit).toHaveText("Conectar y ofertar");
  await expect(submit).toBeEnabled();

  await input.fill("1");
  await expect(form.getByRole("alert")).toHaveText(`La oferta mínima ahora es ${minimum} USDC.`);
  await expect(submit).toBeDisabled();

  await input.fill("abc");
  await expect(form.getByRole("alert")).toHaveText("Ingresá un monto válido, con hasta 7 decimales.");
  await expect(submit).toBeDisabled();
});
