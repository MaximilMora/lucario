export default function PokechatInput({ input, setInput, sendMessage, handleEnter, loading }) {
  return (
    <div className="flex items-center p-4 w-full h-10">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleEnter}
        className={`flex-1 rounded-l-md p-2 border-2 transition-colors ${
          loading
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 focus:border-blue-500 focus:outline-none'
        }`}
        disabled={loading}
        placeholder={loading ? 'Loading...' : 'Ask me anything about Pokémon'}
        maxLength={500}
      />
      <button
        onClick={sendMessage}
        className={`mb-2 px-4 py-2 border-2 rounded-full transition-colors ${
          !input.trim() || loading
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600 cursor-pointer'
        }`}
        disabled={!input.trim() || loading}
        title={!input.trim() ? 'Escribe un mensaje para enviar' : 'Enviar mensaje'}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          'Send'
        )}
      </button>
    </div>
  );
}
