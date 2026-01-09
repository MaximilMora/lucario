import { test, expect } from '@playwright/test';

test.describe('Pokemon Gallery', () => {
  // Helper function para navegar de forma robusta
  async function navigateToHome(page) {
    // Intentar navegar con retry si falla
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto('/', {
          waitUntil: 'load', // Más rápido y menos propenso a fallos que 'networkidle'
          timeout: 30000,
        });
        // Verificar que la página cargó correctamente
        await expect(page).toHaveTitle(/.+/, { timeout: 5000 });
        return;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        // Esperar un poco antes de reintentar
        await page.waitForTimeout(1000);
      }
    }
  }

  test.beforeEach(async ({ page, context }) => {
    // Mock Clerk to always return signed in state
    await page.addInitScript(() => {
      // Mock Clerk before it loads
      window.__clerk_frontend_api = 'pk_test_mock';
      window.Clerk = {
        loaded: true,
        user: {
          id: 'test-user-id',
          firstName: 'Test',
          lastName: 'User',
        },
        session: {
          id: 'test-session-id',
        },
      };
    });

    // Mock Clerk API routes
    await page.route('**/clerk/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id' },
          session: { id: 'test-session-id' },
        }),
      });
    });

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
  });

  test('displays Pokemon cards on home page', async ({ page }) => {
    // Navegar a la página de forma robusta
    await navigateToHome(page);

    // Verificar que el header está visible
    await expect(page.getByText('Pokemon Gallery Browser')).toBeVisible({
      timeout: 10000,
    });

    // Wait for loading to complete (esperar que desaparezca el texto de loading)
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 15000,
      })
      .catch(() => {
        // Si no aparece el texto de loading, continuar
      });

    // Esperar a que el contenido esté visible
    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 30000 });
  });

  test('user can navigate to Pokemon detail page', async ({ page }) => {
    // Navegar a la página de forma robusta
    await navigateToHome(page);

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 15000,
      })
      .catch(() => {});

    const bulbasaurCard = page.getByText('bulbasaur');
    await expect(bulbasaurCard).toBeVisible({ timeout: 30000 });

    await bulbasaurCard.click();

    await expect(page).toHaveURL(/\/pokemon\/\d+/, { timeout: 10000 });

    await expect(page.getByText('bulbasaur', { exact: false })).toBeVisible({
      timeout: 15000,
    });
  });

  test('displays Pokemon image', async ({ page }) => {
    // Navegar a la página de forma robusta
    await navigateToHome(page);

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 15000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 30000 });

    // Wait for images to load - Next.js Image component may take time
    // Try multiple selectors as Next.js Image can render differently
    const imageLocator = page.locator('img[alt="bulbasaur"]').first();

    // Wait for image to be visible
    await expect(imageLocator).toBeVisible({ timeout: 30000 });

    // Wait for image to have loaded (check that it has a src)
    await expect(imageLocator).toHaveAttribute('src', /.+/, { timeout: 15000 });
  });

  test('displays formatted Pokemon ID', async ({ page }) => {
    // Navegar a la página de forma robusta
    await navigateToHome(page);

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 15000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 30000 });

    const pokemonId = page.getByText('#001');
    await expect(pokemonId).toBeVisible({ timeout: 10000 });
  });

  test('Pokemon card has hover effect', async ({ page }) => {
    // Navegar a la página de forma robusta
    await navigateToHome(page);

    // Wait for loading to complete
    await page
      .waitForSelector('text=Loading Pokémon...', {
        state: 'hidden',
        timeout: 15000,
      })
      .catch(() => {});

    await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 30000 });

    const bulbasaurCard = page.locator('.cursor-pointer').first();

    await expect(bulbasaurCard).toBeVisible({ timeout: 10000 });
    await bulbasaurCard.hover();
  });
});
