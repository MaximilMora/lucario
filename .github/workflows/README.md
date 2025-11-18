# GitHub Actions CI/CD

This directory contains automated workflows that run when you create Pull Requests or push to `main`.

## What Gets Checked Automatically?

### On Every Pull Request & Push to Main:

✅ **Lint & Format Check** (ESLint + Prettier)

- Checks code style consistency
- Ensures best practices
- Fails if code doesn't follow standards
- Runs first (fast, ~10 seconds)

✅ **Unit Tests** (Vitest + React Testing Library)

- Tests all components
- Runs after lint passes
- Fast (~5 seconds)
- Fails PR if tests don't pass

✅ **E2E Tests** (Playwright)

- Tests full user journeys
- Runs in headless Chromium
- Runs in parallel with unit tests
- Takes ~30 seconds

✅ **Build Check**

- Ensures production build succeeds
- Runs after all tests pass
- Catches build-time errors
- Takes ~20 seconds

## How It Works

When you create a PR, GitHub automatically:

1. **Lint & Format** → Checks code quality
2. **Unit Tests** + **E2E Tests** → Run in parallel
3. **Build** → Verifies production build works
4. Shows ✅ or ❌ on your PR

## Viewing Test Results

### In Pull Request:

- Scroll to bottom of PR
- Look for "Checks" section
- Click "Details" to see logs

### Test Artifacts:

- Playwright HTML report uploaded automatically
- Available for 7 days
- Includes screenshots and traces

## Workflow Files

- `test.yml` - Runs both unit and E2E tests

## Required Secrets

Currently **no secrets required** for tests. All tests use:

- PokeAPI (public, free)
- No authentication needed

### If You Add API Keys Later:

1. Go to GitHub repo → Settings → Secrets → Actions
2. Add secret (e.g., `OPENAI_API_KEY`)
3. Update workflow:
   ```yaml
   env:
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

## Testing Locally Before PR

Always validate your code locally first:

```bash
# Run everything (lint + tests + build)
npm run validate

# Or run individually:
npm run lint              # Check code style
npm run format:check      # Check formatting
npm test -- --run         # Unit tests
npm run test:e2e          # E2E tests
npm run build             # Build check

# Fix issues automatically:
npm run lint:fix          # Auto-fix lint issues
npm run format            # Auto-format code
```

## Customizing Workflows

### Run Tests on Different Events:

```yaml
on:
  pull_request:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
```

### Add Lint Check:

```yaml
- name: Run linter
  run: npm run lint
```

### Add Type Check:

```yaml
- name: Type check
  run: npm run type-check
```

## Troubleshooting

### Tests Pass Locally But Fail in CI

**Possible causes:**

1. **Environment differences** - CI uses Ubuntu, you might be on Mac/Windows
2. **Timeouts too short** - Increase timeout for E2E tests
3. **Missing dependencies** - Make sure `package.json` is up to date
4. **Port conflicts** - CI runs on clean environment

**Solutions:**

- Check CI logs for specific errors
- Run tests in Docker locally to match CI environment
- Add debug output to tests

### E2E Tests Timing Out

Update `playwright.config.js`:

```javascript
timeout: 60 * 1000, // 60 seconds
```

### Want to Skip Tests?

Add to commit message:

```
[skip ci] Update documentation
```

## Best Practices

✅ **Do:**

- Always run tests locally before pushing
- Write tests for new features
- Keep tests fast and focused
- Fix failing tests immediately

❌ **Don't:**

- Push code that breaks tests
- Skip CI checks to merge faster
- Ignore flaky tests
- Add `[skip ci]` to avoid fixing issues

## Status Badge

Add to your README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/lucario/actions/workflows/test.yml/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

---

**Remember**: CI/CD is your safety net. It catches bugs before they reach production!
