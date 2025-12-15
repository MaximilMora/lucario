# Unit Testing Guide for Junior Engineers

## What are Unit Tests?

Unit tests are small, focused tests that verify individual pieces of code (like a single component or function) work correctly. Think of them as quality checks for your code.

## Why Write Unit Tests?

- **Catch bugs early** - Find problems before users do
- **Safe refactoring** - Change code with confidence
- **Documentation** - Tests show how code should work
- **Faster development** - Fix bugs faster when you know what broke

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test

# Run tests with visual UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Understanding the Test File Structure

Let's look at `PokemonCard.test.jsx`:

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('PokemonCard', () => {
  it('renders pokemon name', () => {
    // Test code here
  });
});
```

### Key Concepts:

- **`describe`** - Groups related tests together
- **`it`** - Defines a single test case
- **`expect`** - Makes assertions about what should be true

## Writing Your First Test

### Step 1: Render the Component

```javascript
import { render, screen } from '@testing-library/react';
import PokemonCard from '../app/components/PokemonCard';

it('renders pokemon name', () => {
  const mockPokemon = {
    name: 'pikachu',
    url: 'https://pokeapi.co/api/v2/pokemon/25/',
  };

  render(<PokemonCard pokemon={mockPokemon} />);
});
```

### Step 2: Find Elements

```javascript
// Find by text
const element = screen.getByText('pikachu');

// Find by role (more accessible)
const button = screen.getByRole('button', { name: /submit/i });

// Find by test ID
const element = screen.getByTestId('pokemon-card');
```

### Step 3: Make Assertions

```javascript
// Check if element exists
expect(element).toBeInTheDocument();

// Check text content
expect(element).toHaveTextContent('pikachu');

// Check CSS classes
expect(element).toHaveClass('capitalize');
```

## Common Testing Patterns

### Testing Component Rendering

```javascript
it('displays pokemon ID formatted with leading zeros', () => {
  const mockPokemon = {
    name: 'pikachu',
    url: 'https://pokeapi.co/api/v2/pokemon/25/',
  };

  render(<PokemonCard pokemon={mockPokemon} />);

  expect(screen.getByText('#025')).toBeInTheDocument();
});
```

### Testing User Interactions

```javascript
it('navigates when clicked', () => {
  const mockPokemon = { name: 'pikachu', url: '.../' };

  render(<PokemonCard pokemon={mockPokemon} />);

  const card = screen.getByText('pikachu').closest('div');
  card.click();

  // Check that navigation was triggered
  expect(mockPush).toHaveBeenCalledWith('/pokemon/25');
});
```

### Mocking Dependencies

When your component uses Next.js features like `useRouter`, you need to mock them:

```javascript
import { vi } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));
```

## Test-Driven Development (TDD) Flow

1. **Write a failing test** - Describe what you want the code to do
2. **Write minimal code** - Make the test pass
3. **Refactor** - Improve code while keeping tests green
4. **Repeat** - Add more tests and features

## What Should You Test?

### ✅ DO Test:

- Component renders correctly
- User interactions work
- Edge cases (empty data, errors)
- Business logic in functions

### ❌ DON'T Test:

- Third-party libraries (they have their own tests)
- Implementation details (internal state)
- Styles (unless critical to functionality)

## Best Practices

1. **One concept per test** - Keep tests focused
2. **Clear test names** - Describe what you're testing
3. **Arrange-Act-Assert pattern**:

   ```javascript
   it('does something', () => {
     // Arrange - Setup
     const mockData = { ... };

     // Act - Do the thing
     render(<Component data={mockData} />);

     // Assert - Check results
     expect(screen.getByText('result')).toBeInTheDocument();
   });
   ```

4. **Test behavior, not implementation** - Focus on what users see

## Troubleshooting

### "Cannot find module"

- Check your import paths
- Make sure the file exists

### "Element not found"

- Use `screen.debug()` to see what's rendered
- Check if element is async (use `findBy` instead of `getBy`)

### Tests are slow

- Mock API calls and external dependencies
- Use `vi.mock()` for heavy modules

## Practice Exercise

Try writing a test for the `PokemonGallery` component:

```javascript
describe('PokemonGallery', () => {
  it('displays multiple Pokemon cards', () => {
    // TODO: Render component
    // TODO: Check that multiple cards appear
  });
});
```

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Common Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Remember**: Tests are your safety net. Write them as you code, not after!
