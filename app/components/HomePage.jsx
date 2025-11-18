import Image from 'next/image';
import PokemonGallery from './PokemonGallery';
import PokechatAi from "./PokechatAi";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con autenticación */}
      <header className="flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Pokemon Gallery Browser</h1>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                ¡Hola, entrenador!
              </span>
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <SignedIn>
            <PokemonGallery key="pokemon-gallery" />
            <PokechatAi key="pokechat-ai" />
          </SignedIn>
          <SignedOut>
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Pokemon Gallery
              </h2>
              <p className="text-gray-600 mb-8">
                Sign in to explore Pokemon and chat with our AI assistant
              </p>
              <SignInButton mode="modal">
                <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 text-lg transition-colors">
                  Get Started
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </div>
    </div>
  );
}
