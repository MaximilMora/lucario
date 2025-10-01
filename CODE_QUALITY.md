# Code Quality & Style Guide

This project enforces code quality through automated checks in CI/CD and local development.

## Tools Used

| Tool           | Purpose                             | Config File            |
| -------------- | ----------------------------------- | ---------------------- |
| **ESLint**     | Catch bugs & enforce best practices | `.eslintrc.json`       |
| **Prettier**   | Consistent code formatting          | `.prettierrc.json`     |
| **Vitest**     | Unit testing                        | `vitest.config.js`     |
| **Playwright** | E2E testing                         | `playwright.config.js` |

---

## Quick Commands

### Check Everything

```bash
# Run all quality checks (what CI runs)
npm run validate

# This runs:
# - ESLint
# - Unit tests
# - E2E tests
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

```bash
# Check formatting
npm run format:check

# Auto-format all files
npm run format
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## Code Style Rules

### Formatting (Prettier)

- **Semicolons**: Always use `;`
- **Quotes**: Single quotes `'` (except JSON)
- **Indentation**: 2 spaces
- **Line length**: Max 100 characters
- **Trailing commas**: ES5 style

### Linting (ESLint)

- No unused variables
- No console.log in production
- Proper React hooks usage
- Accessible JSX (a11y rules)
- Next.js best practices

---

## Pre-Commit Workflow

Before committing, always run:

```bash
# 1. Format your code
npm run format

# 2. Check for lint issues
npm run lint:fix

# 3. Run tests
npm test -- --run

# 4. Verify everything passes
npm run validate
```

---

## CI/CD Pipeline

When you push code or create a PR, GitHub Actions automatically runs:

```
┌─────────────────┐
│  Lint & Format  │ ← Runs first (fast)
└────────┬────────┘
         │
    ✅ Pass
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│Unit  │  │ E2E  │ ← Run in parallel
│Tests │  │Tests │
└───┬──┘  └──┬───┘
    │        │
    └────┬───┘
         │
    ✅ Pass
         │
    ┌────▼────┐
    │  Build  │ ← Final check
    └─────────┘
```

**Total time**: ~1-2 minutes

---

## Common Issues & Fixes

### "Expected linebreaks to be 'LF' but found 'CRLF'"

**On Windows?** Configure git:

```bash
git config --global core.autocrlf false
```

### "Parsing error: Cannot find module 'next/babel'"

**Fix:** Make sure ESLint config includes Next.js:

```json
{
  "extends": ["next/core-web-vitals"]
}
```

### "File ignored by default"

**Prettier is ignoring your file?** Check `.prettierignore`

### Lint passes locally but fails in CI

**Cause:** Different Node versions or cached modules
**Fix:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Editor Setup (Recommended)

### VS Code

Install extensions:

- ESLint
- Prettier - Code formatter

**Settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Other Editors

- **WebStorm**: ESLint and Prettier are built-in
- **Vim/Neovim**: Install ALE or CoC plugins
- **Sublime**: Install SublimeLinter + Prettier packages

---

## Writing Quality Code

### Do's ✅

- Format code before committing
- Run tests before pushing
- Fix lint warnings immediately
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Don'ts ❌

- Don't disable ESLint rules without reason
- Don't commit commented-out code
- Don't leave console.log statements
- Don't skip tests to save time
- Don't use `any` type excessively
- Don't ignore CI failures

---

## Customizing Rules

### Disable a Lint Rule

```javascript
// Disable for one line
// eslint-disable-next-line no-console
console.log('Debug info');

// Disable for entire file
/* eslint-disable no-console */
```

### Override Prettier Rules

Edit `.prettierrc.json`:

```json
{
  "printWidth": 120,
  "singleQuote": false
}
```

### Add Custom ESLint Rule

Edit `.eslintrc.json`:

```json
{
  "rules": {
    "no-console": "warn"
  }
}
```

---

## Best Practices

### Before Pushing

```bash
npm run format      # Format code
npm run lint:fix    # Fix lint issues
npm run validate    # Run all checks
```

### During Code Review

- All CI checks must pass ✅
- No console warnings
- Test coverage maintained
- Code is formatted consistently

### For Production

```bash
npm run build       # Must succeed
npm start           # Test production build
```

---

## Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Next.js ESLint](https://nextjs.org/docs/basic-features/eslint)
- [React ESLint Plugin](https://github.com/jsx-eslint/eslint-plugin-react)

---

**Remember**: Good code quality isn't about perfection, it's about consistency and maintainability!
