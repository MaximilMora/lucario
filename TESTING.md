# Testing Setup - Pokemon Pokedex Project

This project has two types of tests set up for teaching junior engineers about testing:

## 🧪 Unit Tests (Vitest + React Testing Library)

Tests individual components and functions in isolation.

### Running Unit Tests

```bash
# Run tests in watch mode (re-runs on changes)
npm test

# Run tests once
npm test -- --run

# Visual UI (great for beginners)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Unit Test Location

- **Test files**: `__tests__/*.test.jsx`
- **Example**: `__tests__/PokemonCard.test.jsx`
- **Guide for juniors**: `__tests__/README.md`

### What Unit Tests Check

- Component renders correctly
- Props are displayed properly
- User interactions (clicks, hovers)
- Edge cases and error states

---

## 🌐 E2E Tests (Playwright)

Tests complete user journeys through the application.

### Running E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Visual UI mode (see the browser)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/pokemon-gallery.spec.js
```

### E2E Test Location

- **Test files**: `e2e/*.spec.js`
- **Example**: `e2e/pokemon-gallery.spec.js`
- **Guide for juniors**: `e2e/README.md`

### What E2E Tests Check

- Full user flows (browse → click → view details)
- Navigation between pages
- Data loading from APIs
- Real browser interactions

---

## 📊 Current Test Coverage

### Unit Tests

✅ `PokemonCard` component

- Renders pokemon name
- Displays formatted ID (#001, #025, etc.)
- Shows correct capitalization
- Handles navigation clicks
- Extracts ID from various URL formats

### E2E Tests

✅ Pokemon Gallery page

- Displays Pokemon cards after API load
- Navigation to detail pages works
- Images load correctly
- Formatted IDs are visible
- Hover effects work

---

## 🎓 For Junior Engineers

### Where to Start?

1. **Read the guides first**:
   - `__tests__/README.md` - Unit testing basics
   - `e2e/README.md` - E2E testing basics

2. **Run existing tests**:

   ```bash
   npm test              # Watch unit tests run
   npm run test:ui       # See visual interface
   npm run test:e2e:ui   # See E2E tests in browser
   ```

3. **Write your first test**:
   - Try the practice exercises in the README files
   - Start with simple unit tests
   - Move to E2E tests once comfortable

### Test Writing Flow

1. **Write a failing test** (describe what should happen)
2. **Run the test** (it should fail)
3. **Write minimal code** to make it pass
4. **Run test again** (it should pass)
5. **Refactor** if needed

---

## 🛠️ Tools Used

| Tool                          | Purpose                | Cost |
| ----------------------------- | ---------------------- | ---- |
| **Vitest**                    | Fast unit test runner  | Free |
| **React Testing Library**     | Test React components  | Free |
| **Playwright**                | E2E browser automation | Free |
| **@testing-library/jest-dom** | Better assertions      | Free |

All tools are 100% free with no paid plans required!

---

## 🐛 Troubleshooting

### Unit Tests

**"Cannot find module"**

- Check import paths
- Verify file exists

**"Element not found"**

- Use `screen.debug()` to see what rendered
- Check if using correct selector

### E2E Tests

**"Timeout exceeded"**

- Increase timeout in test: `{ timeout: 15000 }`
- Check if dev server is running

**"Browser not found"**

```bash
npx playwright install chromium
```

**Tests pass locally but fail in CI**

- Don't use fixed timeouts
- Wait for elements properly
- Check environment variables

---

## 📝 Best Practices

1. ✅ **Write tests as you code** (not after)
2. ✅ **Test behavior, not implementation**
3. ✅ **Keep tests simple and focused**
4. ✅ **Use meaningful test names**
5. ✅ **Run tests before committing**

---

## 🚀 Next Steps

### More Components to Test

- `PokemonGallery` - Loading states, error handling
- `PokemonDetails` - Stats display, type badges
- `PokechatAi` - Chat interactions (when implemented)

### More E2E Flows

- Search and filter Pokemon
- AI chat interactions
- Error state handling
- Mobile responsiveness

### Advanced Topics

- Mocking API calls
- Testing loading states
- Visual regression testing
- Accessibility testing

---

## 🤖 CI/CD - Automated Testing on GitHub

Tests automatically run when you:

- Create a Pull Request
- Push to `main` branch

### What Gets Tested Automatically?

✅ Unit tests (all components)
✅ E2E tests (full user journeys)

### How to See Test Results?

1. Open your Pull Request on GitHub
2. Scroll to bottom → "Checks" section
3. Click "Details" to view logs

### Configuration

- Workflow file: `.github/workflows/test.yml`
- Guide: `.github/workflows/README.md`

---

## 📚 Resources

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Remember**: Tests are your safety net. They give you confidence to refactor, add features, and fix bugs without breaking existing functionality!
