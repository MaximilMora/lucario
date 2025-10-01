import { test, expect } from '@playwright/test';

test.describe('Pokemon Gallery', () => {
  test('displays Pokemon cards on home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Pokemon Gallery Browser')).toBeVisible();

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });
  });

  test('user can navigate to Pokemon detail page', async ({ page }) => {
    await page.goto('/');

    const bulbasaurCard = page.getByText('bulbasaur');
    await expect(bulbasaurCard).toBeVisible({ timeout: 15000 });

    await bulbasaurCard.click();

    await expect(page).toHaveURL(/\/pokemon\/\d+/);

    await expect(page.getByText('bulbasaur', { exact: false })).toBeVisible();
  });

  test('displays Pokemon image', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });

    const images = page.locator('img[alt="bulbasaur"]');
    await expect(images.first()).toBeVisible();
  });

  test('displays formatted Pokemon ID', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });

    const pokemonId = page.getByText('#001');
    await expect(pokemonId).toBeVisible();
  });

  test('Pokemon card has hover effect', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });

    const bulbasaurCard = page.locator('.cursor-pointer').first();

    await expect(bulbasaurCard).toBeVisible();
    await bulbasaurCard.hover();
  });
});
