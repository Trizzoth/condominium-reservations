import { test, expect, type Page } from "@playwright/test";

async function loginAs(
  page: Page,
  email: string,
  password: string,
  expectedUrl: RegExp = /.*dashboard.*/,
) {
  await page.goto("/login");
  await page.getByPlaceholder("tu@email.com").first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(expectedUrl, { timeout: 20000 });
}

test.describe("Login redirige según rol", () => {
  test("admin cae en /admin", async ({ page }) => {
    await loginAs(page, "admin@test.com", "Admin123", /.*admin.*/);
  });

  test("security cae en /security", async ({ page }) => {
    await loginAs(page, "security@test.com", "Security123", /.*security.*/);
  });

  test("resident cae en /dashboard", async ({ page }) => {
    await loginAs(page, "resident@test.com", "Resident123", /.*dashboard.*/);
  });
});

test.describe("Navegación y layouts (Issue #11)", () => {
  test("Admin ve nav de admin sin duplicar header", async ({ page }) => {
    await loginAs(page, "admin@test.com", "Admin123", /.*admin.*/);

    // Nav de admin presente...
    await expect(page.getByRole("link", { name: "Áreas" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Horarios" })).toBeVisible();
    // ...y sin fugas del nav de residente (antes: layout cruzado)
    await expect(page.getByRole("link", { name: "Mis reservas" })).toHaveCount(0);
  });

  test("Móvil: hamburguesa única navega a Mis reservas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page, "resident@test.com", "Resident123");
    await page.goto("/dashboard/reservations");

    // Un solo header (antes: layout duplicado = 2 hamburguesas)
    const menuButton = page.getByRole("button", { name: "Abrir menú" });
    await expect(menuButton).toHaveCount(1);
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    await expect(page.getByRole("link", { name: "Mis reservas" })).toBeVisible();
    await page.getByRole("link", { name: "Mis reservas" }).click();
    await expect(page).toHaveURL(/.*dashboard\/reservations.*/);
  });
});
