# Claude AI Assistant - Project Context

This file contains context about the Pokemon Pokedex Chat Assistant project to help Claude understand the codebase and assist with development.

## 📋 Project Overview

**Pokemon Pokedex Chat Assistant** - An interactive Pokemon knowledge assistant that evolves from a simple search interface to an intelligent conversational tool.

### Target Users

Pokemon trainers (casual and competitive) who want quick, intelligent answers about Pokemon data, battle strategies, and team building advice.

### Tech Stack

- **Frontend**: React with Next.js, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, OpenAI API integration
- **Data Sources**: PokeAPI for Pokemon data
- **Deployment**: Vercel

## 🏗️ Project Structure

```
pokemon-pokedex-assistant/
├── pages/
│   ├── api/
│   │   └── chat.js              # AI chat endpoint
│   ├── pokemon/
│   │   └── [id].js              # Pokemon detail pages
│   └── index.js                 # Pokemon gallery home page
├── components/
│   ├── PokemonGallery.jsx       # Main Pokemon grid
│   ├── PokemonCard.jsx          # Individual Pokemon cards
│   ├── PokemonDetail.jsx        # Detailed Pokemon view
│   ├── ChatInterface.jsx        # AI chat interface
│   ├── MessageBubble.jsx        # Chat message display
│   └── StatBar.jsx              # Pokemon stat visualization
├── styles/
└── utils/
    └── pokeapi.js               # API utility functions
```

## 🎯 Development Phases

### Phase 1: Foundation (CURRENT)

- ✅ Pokemon Gallery Browser - Grid of first 20 Pokemon
- 🔄 Pokemon Detail View - Individual Pokemon stats and info
- ⏳ Pokemon Search & Filtering
- ⏳ Type Chart & Weakness Display

### Phase 2: AI Integration (PLANNED)

- Natural Language Query Interface
- Battle Matchup Questions
- Pokemon Information Queries
- Conversational Context Memory

### Phase 3: Advanced Features (PLANNED)

- AI Team Composition Suggestions
- Battle Strategy Recommendations
- Opponent Team Analysis
- Optimized Moveset Recommendations

### Phase 4: Personalization (PLANNED)

- User Profile & Favorite Pokemon System
- Personalized Recommendations
- Conversation History & Search
- Community Learning & Feedback

## 🔌 API Endpoints

### PokeAPI Integration

```javascript
// Get Pokemon list (first 20)
GET https://pokeapi.co/api/v2/pokemon?limit=20

// Get individual Pokemon details
GET https://pokeapi.co/api/v2/pokemon/{id}

// Pokemon sprites
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png
```

### Internal API Routes

```javascript
// AI Chat endpoint
POST /api/chat
{
  message: "What beats Charizard?",
  conversationHistory: [...previous messages]
}
```

## 📊 Key Data Structures

### Pokemon Basic Info (from list endpoint)

```javascript
{
  name: "bulbasaur",
  url: "https://pokeapi.co/api/v2/pokemon/1/"
}
```

### Pokemon Detailed Info (from individual endpoint)

```javascript
{
  id: 1,
  name: "bulbasaur",
  height: 7,
  weight: 69,
  types: [
    { type: { name: "grass" } },
    { type: { name: "poison" } }
  ],
  stats: [
    { base_stat: 45, stat: { name: "hp" } },
    { base_stat: 49, stat: { name: "attack" } }
  ],
  abilities: [
    { ability: { name: "overgrow" } }
  ],
  sprites: {
    front_default: "image_url"
  }
}
```

## 🎨 Design Guidelines

### Pokemon Cards

- 200px width, auto height
- 16px gap between cards
- 12px border radius
- Hover effect: scale(1.02)

### Responsive Breakpoints

- Desktop (1024px+): 4 columns
- Tablet (768px-1023px): 3 columns
- Mobile (480px-767px): 2 columns
- Small mobile (<480px): 1 column

### Pokemon Type Colors

```css
.type-grass {
  background: #78c850;
}
.type-fire {
  background: #f08030;
}
.type-water {
  background: #6890f0;
}
.type-electric {
  background: #f8d030;
}
/* Add more as needed */
```

## 🧪 Testing Scenarios

### Critical User Flows

1. **Browse Pokemon**: Load gallery → View Pokemon cards → Click for details
2. **Pokemon Details**: Navigate to detail page → View stats → Return to gallery
3. **AI Chat**: Ask question → Receive response → Follow-up questions

### Common Queries for AI Testing

- "What beats Charizard?"
- "Tell me about Pikachu"
- "What are electric type weaknesses?"
- "How does Charmander evolve?"

## 🚀 Getting Started for New Contributors

1. **Environment Setup**:

   ```bash
   npm install
   npm run dev
   ```

2. **Required Environment Variables**:

   ```
   OPENAI_API_KEY=your_key_here  # For AI features (Phase 2+)
   ```

3. **Key Files to Understand**:
   - `/pages/index.js` - Home page with Pokemon gallery
   - `/components/PokemonGallery.jsx` - Main grid component
   - `/pages/pokemon/[id].js` - Dynamic Pokemon detail pages

## 🎓 Learning Objectives

This project teaches:

- **React Fundamentals**: Components, state, props, hooks
- **Next.js Features**: File-based routing, API routes, SSR
- **API Integration**: REST APIs, data fetching, error handling
- **Responsive Design**: Mobile-first CSS, Tailwind utilities
- **AI Integration**: OpenAI API, prompt engineering
- **State Management**: Local state, data flow
- **User Experience**: Loading states, error boundaries, navigation

## 🤝 Contributing

When working on this project:

- Follow component-based architecture
- Keep Pokemon data fetching in utility functions
- Use TypeScript for type safety where possible
- Test on mobile and desktop breakpoints
- Consider loading states and error handling
- Keep AI prompts focused on Pokemon domain

## 📚 Helpful Resources

- [PokeAPI Documentation](https://pokeapi.co/docs/v2)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

_This file should be updated as the project evolves. Last updated: August 2025_
