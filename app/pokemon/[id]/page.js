import PokemonDetails from '../../components/PokemonDetails';

export default async function Page({ params }) {
  const{id} = await params;
  return <PokemonDetails pokemonId={id} />;
} 