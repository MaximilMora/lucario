export default function PokechatHeader({ isMinimized, setIsMinimized }) { 
    return (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg shadow-lg">    
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">⚡</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Pokechat AI</h3>
                        <p className="text-xs text-blue-100">Tu asistente Pokémon</p>
                    </div>
                </div>            
                <button 
                    onClick={() => setIsMinimized(!isMinimized)} 
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    title={isMinimized ? "Expandir chat" : "Minimizar chat"}
                >
                    {isMinimized ? '🔽' : '🔼'}
                </button>
            </div>
        </div>
    )
}