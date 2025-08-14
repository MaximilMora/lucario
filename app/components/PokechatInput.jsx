export default function PokechatInput({ input, setInput, sendMessage, handleEnter ,loading}) {
    return (
        <div className="flex items-center p-4 w-full h-10">
            <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleEnter} 
                className="flex-1 rounded-l-md p-2" 
                disabled={loading}
                placeholder={loading ? "Loading..." : "Ask me anything about Pokémon"}
                
            />
            <button 
                onClick={sendMessage} 
                className="bg-white text-black mb-2 px-4 py-2 border-2 border-gray-300 rounded-full"
                disabled={!input.trim() || loading}
            >
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div> : "Send"}
            </button>
        </div>
    )
}