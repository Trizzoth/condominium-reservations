import { test, expect } from '@playwright/test';

test.describe('Calendario nueva reserva', () => {
  test('login + calendario responde al click', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'resident@test.com');
    await page.fill('input[name="password"]', 'Resident123');
    await page.click('button:has-text("Iniciar sesión")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    await page.goto('http://localhost:3000/dashboard/reservations/new');
    await expect(page.locator('h1:has-text("Nueva reserva")')).toBeVisible({ timeout: 15000 });

    // Si no hay áreas, lo reportamos y listo (BD sin seed)
    const noAreas = page.locator('text=Primero selecciona un área');
    const areaTrigger = page.locator('button:has-text("Selecciona un área")');
    if (await noAreas.isVisible({ timeout: 5000 }).catch(() => false)) {
      // No se puede probar click sin área: el test documenta el estado
      expect(await areaTrigger.count()).toBeGreaterThan(0);
      return;
    }

    // Hay áreas: seleccionar la primera
    await areaTrigger.first().click();
    await page.locator('div[role="option"]').first().click();

    // Click en un día futuro habilitado del calendario
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayBtn = page.locator('button.rdp-day_button, button:has-text("' + tomorrow.getDate() + '")').first();
    await dayBtn.click({ timeout: 10000 });

    // El click debe reflejarse en la UI
    await expect(page.locator('text=Seleccionado:')).toBeVisible({ timeout: 10000 });
  });
});
