export default function PokechatInput({
  input,
  setInput,
  sendMessage,
  handleEnter,
  loading,
}) {
  return (
    <div className="flex items-center gap-2 p-4 w-full border-t border-gray-100 bg-white">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleEnter}
        className={`flex-1 rounded-lg px-3 py-2 border transition-colors text-gray-900 placeholder-gray-500 ${
          loading
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none'
        }`}
        disabled={loading}
        placeholder={loading ? 'Cargando...' : 'Pregunta algo sobre Pokémon'}
        maxLength={500}
      />
      <button
        onClick={sendMessage}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          !input.trim() || loading
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
        }`}
        disabled={!input.trim() || loading}
        title={!input.trim() ? 'Escribe un mensaje para enviar' : 'Enviar'}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        ) : (
          'Enviar'
        )}
      </button>
    </div>
  );
}
