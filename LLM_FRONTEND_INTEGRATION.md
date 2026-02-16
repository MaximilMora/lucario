# Frontend Integration Guide

The chat API endpoint is now ready at `/api/chat`. Here's how to integrate it:

## API Usage

**Endpoint:** `POST /api/chat`

**Request Body:**

```javascript
{
  message: "What beats Charizard?",           // Required: User's question
  conversationHistory: [                     // Optional: Previous messages for context
    { role: "user", content: "Previous question" },
    { role: "assistant", content: "Previous response" }
  ]
}
```

**Response Format:**

```javascript
{
  response: "AI response with Pokemon advice...",
  pokemonData: {                             // Auto-fetched Pokemon data
    "charizard": {
      id: 6,
      name: "charizard",
      types: ["fire", "flying"],
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png"
    }
  },
  timestamp: "2025-08-06T20:22:44.666Z"
}
```

## React Integration Example

```jsx
// In your chat component
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);

const sendMessage = async userMessage => {
  setLoading(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        conversationHistory: messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error);
      return;
    }

    // Add messages to chat
    setMessages(prev => [
      ...prev,
      { sender: 'user', content: userMessage, timestamp: new Date() },
      {
        sender: 'bot',
        content: data.response,
        pokemonData: data.pokemonData,
        timestamp: new Date(data.timestamp),
      },
    ]);
  } catch (error) {
    console.error('Network error:', error);
  } finally {
    setLoading(false);
  }
};
```

## Environment Setup

For production, set environment variable in the .env file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## Pokemon Data Usage (OPTIONAL)

The API automatically detects Pokemon mentioned in responses and fetches their data. Use `pokemonData` to display Pokemon images:

```jsx
{
  message.pokemonData &&
    Object.values(message.pokemonData).map(pokemon => (
      <img
        key={pokemon.id}
        src={pokemon.sprite}
        alt={pokemon.name}
        className="w-16 h-16 inline-block"
      />
    ));
}
```

## Error Handling

```jsx
if (data.error) {
  if (data.error.includes('API key')) {
    // Handle missing API key
  } else {
    // Handle other errors
  }
}
```

The backend is fully functional and ready for frontend integration!
