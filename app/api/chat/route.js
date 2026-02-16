import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Google GenAI client lazily to avoid build-time errors
function getGenAIClient() {
  const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
  if (!GOOGLE_GENAI_API_KEY) {
    throw new Error(
      'Missing Google GenAI API key. Please set the GOOGLE_GENAI_API_KEY environment variable.'
    );
  }
  return new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);
}

// Pokemon-specific system prompt to guide Gemini's responses
const POKEMON_SYSTEM_PROMPT = `You are a Pokemon expert assistant. Your role is to provide helpful, accurate information about Pokemon. Follow these guidelines:

1. Always provide accurate Pokemon data including types, stats, abilities, and evolutions
2. When discussing battle matchups, explain type effectiveness and recommend specific Pokemon
3. Include Pokemon names with proper capitalization (e.g., "Charizard", "Pikachu")
4. When relevant, mention Pokemon IDs for image display (e.g., Pikachu is ID 25)
5. Keep responses conversational but informative
6. Focus on practical battle advice, evolution requirements, and Pokemon characteristics
7. If asked about Pokemon that don't exist, politely clarify
8. For type effectiveness questions, be specific about damage multipliers (2x, 0.5x, 0x)

IMPORTANT: Make sure to return new lines for every key message.
Remember: You're helping Pokemon trainers make better decisions about their teams and battles.`;

// Helper function to fetch Pokemon data from PokeAPI
async function fetchPokemonData(pokemonName) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`
    );
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon data:', error);
    return null;
  }
}

// Helper function to get type effectiveness data
async function fetchTypeData(typeName) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/type/${typeName.toLowerCase()}`
    );
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching type data:', error);
    return null;
  }
}

export const maxDuration = 30; // 30 seconds maximum

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      console.warn('[Chat API] Missing message in request body');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build conversation context
    let conversationContext =
      POKEMON_SYSTEM_PROMPT + '\n\nPrevious conversation:\n';

    // Add conversation history
    conversationHistory.forEach((msg, index) => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });

    conversationContext += `\nUser: ${message}\n\nPlease provide a helpful response about Pokemon.`;

    // Generate response using Gemini
    const ai = getGenAIClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(conversationContext);

    if (!result || !result.response) {
      throw new Error('No response from Gemini API');
    }

    const aiResponse = result.response.text();

    // Extract Pokemon names from the response to potentially fetch additional data
    const pokemonNamePattern = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g;
    const potentialPokemonNames = aiResponse.match(pokemonNamePattern) || [];

    // Try to fetch data for mentioned Pokemon (limit to first 3 to avoid too many API calls)
    const pokemonData = {};
    for (let i = 0; i < Math.min(potentialPokemonNames.length, 3); i++) {
      const name = potentialPokemonNames[i];
      if (name && name.length > 2) {
        const data = await fetchPokemonData(name);
        if (data) {
          pokemonData[name.toLowerCase()] = {
            id: data.id,
            name: data.name,
            types: data.types.map(t => t.type.name),
            sprite: data.sprites.front_default,
          };
        }
      }
    }

    return NextResponse.json({
      response: aiResponse,
      pokemonData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API Error:', error);

    if (error.message.includes('API key')) {
      return NextResponse.json(
        {
          error:
            'API key not configured. Please set GOOGLE_GENAI_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    if (error.message.includes('quota') || error.message.includes('limit')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    );
  }
}
