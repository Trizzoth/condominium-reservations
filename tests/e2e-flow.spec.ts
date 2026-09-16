import { test, expect } from '@playwright/test';

test.describe('MVP Reservas Condominio - Páginas principales', () => {
  test('Login page carga correctamente', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('h2:has-text("Iniciar sesión")')).toBeVisible();
    await expect(page.locator('button:has-text("Iniciar sesión")')).toBeVisible();
    await expect(page.locator('button:has-text("Enviar enlace mágico")')).toBeVisible();
  });

  test('Register page carga correctamente', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    await expect(page.locator('h2:has-text("Crear cuenta")')).toBeVisible();
    await expect(page.locator('button:has-text("Crear cuenta")')).toBeVisible();
  });

  test('Dashboard protegido redirige a login', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('Admin panel protegido redirige a login', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await expect(page).toHaveURL(/.*login/);
  });

  test('Seguridad protegido redirige a login', async ({ page }) => {
    await page.goto('http://localhost:3000/security');
    await expect(page).toHaveURL(/.*login/);
  });

  test('Nueva reserva protegida redirige a login', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/reservations/new');
    await expect(page).toHaveURL(/.*login/);
  });

  test('Perfil protegido redirige a login', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/profile');
    await expect(page).toHaveURL(/.*login/);
  });
});