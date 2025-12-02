import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PokemonCard from '../app/components/PokemonCard';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('PokemonCard', () => {
  const mockPokemon = {
    name: 'pikachu',
    url: 'https://pokeapi.co/api/v2/pokemon/25/',
  };

  it('renders pokemon name', () => {
    render(<PokemonCard pokemon={mockPokemon} />);

    expect(screen.getByText('pikachu')).toBeInTheDocument();
  });

  it('displays pokemon ID formatted with leading zeros', () => {
    render(<PokemonCard pokemon={mockPokemon} />);

    expect(screen.getByText('#025')).toBeInTheDocument();
  });

  it('capitalizes pokemon name', () => {
    render(<PokemonCard pokemon={mockPokemon} />);

    const heading = screen.getByText('pikachu');
    expect(heading).toHaveClass('capitalize');
  });

  it('navigates to pokemon detail page when clicked', () => {
    render(<PokemonCard pokemon={mockPokemon} />);

    const card = screen.getByText('pikachu').closest('div');
    card.click();

    expect(mockPush).toHaveBeenCalledWith('/pokemon/25');
  });

  it('extracts correct pokemon ID from various URL formats', () => {
    const pokemonWithTrailingSlash = {
      name: 'bulbasaur',
      url: 'https://pokeapi.co/api/v2/pokemon/1/',
    };

    render(<PokemonCard pokemon={pokemonWithTrailingSlash} />);
    expect(screen.getByText('#001')).toBeInTheDocument();
  });
});
