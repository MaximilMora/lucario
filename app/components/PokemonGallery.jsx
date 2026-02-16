'use client';

import { useState, useEffect } from 'react';
import PokemonCard from './PokemonCard';

export default function PokemonGallery() {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPokemons() {
      setLoading(true);
      setError(null);
      const url = 'https://pokeapi.co/api/v2/pokemon?limit=20';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/335ebe47-690b-4f82-a435-427062103bc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PokemonGallery.jsx:fetchPokemons:entry',message:'Fetch Pokemon list starting',data:{url,isBrowser:typeof window!=='undefined',onLine:typeof navigator!=='undefined'?navigator.onLine:null},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      try {
        const res = await fetch(url);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/335ebe47-690b-4f82-a435-427062103bc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PokemonGallery.jsx:fetchPokemons:afterFetch',message:'Fetch completed',data:{status:res?.status,ok:res?.ok,statusText:res?.statusText},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        if (!res.ok) throw new Error('Failed to fetch Pokémon');
        const data = await res.json();
        setPokemons(data.results);
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/335ebe47-690b-4f82-a435-427062103bc8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PokemonGallery.jsx:fetchPokemons:catch',message:'Fetch error',data:{name:err?.name,message:err?.message,constructor:err?.constructor?.name,cause:err?.cause?.message||null},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPokemons();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="ml-4 text-gray-600">Loading Pokémon...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading Pokémon</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (pokemons.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">No Pokémon found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
      {pokemons.map((pokemon) => (
        <PokemonCard key={pokemon.name} pokemon={pokemon} />
      ))}
    </div>
  );
}
