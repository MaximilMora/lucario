import Image from "next/image";
import Link from "next/link";
import PokemonGallery from './PokemonGallery';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Pokemon Gallery Browser</h1>
          <Link
            href="/battle"
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
          >
            ⚔️ Combate
          </Link>
        </div>
        <PokemonGallery key="pokemon-gallery" />
      </div>
    </div>
  );
} 