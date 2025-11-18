# E2E Testing Guide for Junior Engineers

## What are E2E (End-to-End) Tests?

E2E tests simulate real user behavior by testing your entire application from start to finish. Unlike unit tests that check individual components, E2E tests verify that everything works together correctly.

Think of it like this:

- **Unit tests** = Testing individual LEGO blocks
- **E2E tests** = Testing the entire LEGO castle

## Why Write E2E Tests?

- **Real user perspective** - Tests what users actually do
- **Catch integration bugs** - Find issues between components
- **Confidence in releases** - Know your app works before deploying
- **Automated QA** - No need to manually click through every feature

## Running E2E Tests

```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run tests with visual UI (see the browser)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/pokemon-gallery.spec.js
```

## Understanding an E2E Test

Let's look at `pokemon-gallery.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test('displays Pokemon cards on home page', async ({ page }) => {
  // Navigate to page
  await page.goto('/');

  // Check that content appears
  await expect(page.getByText('Pokémon Gallery')).toBeVisible();
});
```

### Key Concepts:

- **`test`** - Defines a test case
- **`page`** - Represents a browser tab
- **`await`** - Waits for actions to complete
- **`expect`** - Makes assertions about the page

## Writing Your First E2E Test

### Step 1: Navigate to a Page

```javascript
test('visits home page', async ({ page }) => {
  await page.goto('/');
});
```

### Step 2: Interact with Elements

```javascript
// Click a button
await page.getByText('pikachu').click();

// Fill a form
await page.getByLabel('Search').fill('charizard');

// Press a key
await page.keyboard.press('Enter');

// Hover over element
await page.getByText('Pokemon').hover();
```

### Step 3: Make Assertions

```javascript
// Check element is visible
await expect(page.getByText('Pikachu')).toBeVisible();

// Check URL
await expect(page).toHaveURL('/pokemon/25');

// Check element has attribute
await expect(page.locator('img')).toHaveAttribute('alt', 'pikachu');
```

## Common E2E Testing Patterns

### Testing Navigation

```javascript
test('user can navigate to Pokemon detail page', async ({ page }) => {
  await page.goto('/');

  // Click on a Pokemon card
  await page.getByText('pikachu').click();

  // Verify we navigated
  await expect(page).toHaveURL(/\/pokemon\/\d+/);

  // Verify details loaded
  await expect(page.getByText('pikachu')).toBeVisible();
});
```

### Testing Forms and Input

```javascript
test('user can search for Pokemon', async ({ page }) => {
  await page.goto('/');

  // Fill search input
  await page.getByPlaceholder('Search Pokemon...').fill('charizard');

  // Submit form
  await page.getByRole('button', { name: 'Search' }).click();

  // Check results
  await expect(page.getByText('charizard')).toBeVisible();
});
```

### Testing Dynamic Content

```javascript
test('displays Pokemon image', async ({ page }) => {
  await page.goto('/');

  // Wait for image to load
  const image = page.locator('img[alt="pikachu"]');
  await expect(image).toBeVisible();

  // Verify image source
  await expect(image).toHaveAttribute('src', /pikachu/);
});
```

## Selecting Elements

### By Text

```javascript
page.getByText('pikachu');
page.getByText(/pikachu/i); // Case insensitive
```

### By Role (Most Accessible)

```javascript
page.getByRole('button', { name: 'Submit' });
page.getByRole('link', { name: 'Home' });
```

### By Test ID

```javascript
// In component: <div data-testid="pokemon-card">
page.getByTestId('pokemon-card');
```

### By CSS Selector

```javascript
page.locator('.pokemon-card');
page.locator('#header');
```

## Waiting for Things

Playwright automatically waits for most things, but sometimes you need explicit waits:

```javascript
// Wait for element to appear
await page.waitForSelector('.pokemon-card');

// Wait for URL to change
await page.waitForURL('/pokemon/25');

// Wait for network request to complete
await page.waitForResponse('**/api/pokemon/**');
```

## Test Structure Best Practices

### Use describe blocks to group tests

```javascript
test.describe('Pokemon Gallery', () => {
  test('displays cards', async ({ page }) => {
    // test code
  });

  test('allows navigation', async ({ page }) => {
    // test code
  });
});
```

### Setup and cleanup

```javascript
test.beforeEach(async ({ page }) => {
  // Runs before each test
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  // Runs after each test
  await page.close();
});
```

## Common User Flows to Test

1. **Browse and View Details**

   ```javascript
   test('complete user journey', async ({ page }) => {
     await page.goto('/');
     await page.getByText('pikachu').click();
     await expect(page).toHaveURL(/\/pokemon\/25/);
   });
   ```

2. **Search and Filter**

   ```javascript
   test('search functionality', async ({ page }) => {
     await page.goto('/');
     await page.getByPlaceholder('Search...').fill('fire');
     await expect(page.getByText('charizard')).toBeVisible();
   });
   ```

3. **Error Handling**
   ```javascript
   test('handles 404 errors', async ({ page }) => {
     await page.goto('/pokemon/99999');
     await expect(page.getByText('Pokemon not found')).toBeVisible();
   });
   ```

## Debugging Tips

### Take Screenshots

```javascript
await page.screenshot({ path: 'screenshot.png' });
```

### Pause Execution

```javascript
await page.pause(); // Opens Playwright Inspector
```

### See Console Logs

```javascript
page.on('console', (msg) => console.log(msg.text()));
```

### Slow Down Tests

```javascript
test.use({ slowMo: 1000 }); // Wait 1s between actions
```

## What Should You Test?

### ✅ DO Test:

- Critical user journeys (signup, checkout, etc.)
- Navigation between pages
- Form submissions
- Authentication flows
- Error states

### ❌ DON'T Test:

- Every single UI detail (use unit tests for that)
- Third-party integrations (mock them)
- Visual appearance (use visual regression tests)

## Best Practices

1. **Test real user flows** - Not just individual pages
2. **Keep tests independent** - Each test should work alone
3. **Use meaningful test names** - Describe the user action
4. **Avoid brittle selectors** - Prefer getByRole over CSS classes
5. **Don't test implementation details** - Test what users see

## Common Mistakes to Avoid

❌ **Too many `await` statements**

```javascript
// Bad
await page.waitForSelector('.card');
await page.locator('.card').click();

// Good (Playwright auto-waits)
await page.locator('.card').click();
```

❌ **Using timeouts instead of proper waits**

```javascript
// Bad
await page.waitForTimeout(3000);

// Good
await expect(page.getByText('Loaded')).toBeVisible();
```

❌ **Testing too many things in one test**

```javascript
// Bad - tests signup, login, profile, and checkout
test('user flow', async ({ page }) => {
  // 100 lines of code...
});

// Good - split into separate tests
test('user can signup', async ({ page }) => { ... });
test('user can login', async ({ page }) => { ... });
```

## Practice Exercise

Try writing an E2E test for the AI chat feature:

```javascript
test('user can chat with AI about Pokemon', async ({ page }) => {
  // TODO: Navigate to home page
  // TODO: Type a message in chat input
  // TODO: Click send button
  // TODO: Verify AI response appears
});
```

## Troubleshooting

### "Element not found"

- Use `page.pause()` to inspect the page
- Check if element loaded (network delay)
- Verify selector is correct

### "Test times out"

- Check if dev server is running
- Increase timeout in playwright.config.js
- Check for infinite loading states

### Tests fail on CI but pass locally

- Wait for proper loading states
- Don't rely on fixed timeouts
- Check viewport size differences

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)

---

**Remember**: E2E tests protect your users from broken experiences. Write them for critical flows first!
