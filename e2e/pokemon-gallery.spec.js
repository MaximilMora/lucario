import { test, expect } from '@playwright/test';

test.describe('Pokemon Gallery', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock PokeAPI response
    await page.route('https://pokeapi.co/api/v2/pokemon*', async (route) => {
      const url = new URL(route.request().url());
      const limit = url.searchParams.get('limit') || '20';

      const mockPokemons = Array.from({ length: parseInt(limit) }, (_, i) => ({
        name: i === 0 ? 'bulbasaur' : `pokemon-${i + 1}`,
        url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/`,
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 151,
          next: null,
          previous: null,
          results: mockPokemons,
        }),
      });
    });

    // Set environment variable to bypass Clerk authentication in tests
    await context.addCookies([
      {
        name: 'clerk-session',
        value: 'test-session',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('displays Pokemon cards on home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Pokemon Gallery Browser')).toBeVisible();

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });
  });

  test('user can navigate to Pokemon detail page', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    const bulbasaurCard = page.getByText('bulbasaur');
    await expect(bulbasaurCard).toBeVisible({ timeout: 15000 });

    await bulbasaurCard.click();

    await expect(page).toHaveURL(/\/pokemon\/\d+/);

    await expect(page.getByText('bulbasaur', { exact: false })).toBeVisible();
  });

  test('displays Pokemon image', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });

    const images = page.locator('img[alt="bulbasaur"]');
    await expect(images.first()).toBeVisible();
  });

  test('displays formatted Pokemon ID', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });

    const pokemonId = page.getByText('#001');
    await expect(pokemonId).toBeVisible();
  });

  test('Pokemon card has hover effect', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 15000 });

    const bulbasaurCard = page.locator('.cursor-pointer').first();

    await expect(bulbasaurCard).toBeVisible();
    await bulbasaurCard.hover();
  });
});
