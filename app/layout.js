import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import PokechatAi from './components/PokechatAi';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Lucario - Pokemon Battle Arena',
  description:
    'Explora Pokémon, batalla contra la IA y sube en el ranking. Chat con asistente IA especializado en Pokémon.',
  keywords: ['pokemon', 'battle', 'pokedex', 'game', 'ai'],
  openGraph: {
    title: 'Lucario - Pokemon Battle Arena',
    description: 'Explora Pokémon, batalla contra la IA y sube en el ranking.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <PokechatAi />
        </body>
      </html>
    </ClerkProvider>
  );
}
