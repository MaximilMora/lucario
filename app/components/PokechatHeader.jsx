export default function PokechatHeader({ isMinimized, setIsMinimized }) { 
    return (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg shadow-lg">    
        <div className="flex justify-between items-center ">
            <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">⚡</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Pokechat AI</h3>
                        <p className="text-xs text-blue-100">Tu asistente Pokémon</p>
                    </div>
                </div>            

        <div className="flex justify-between items-center p-4 w-full">
            <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="flex justify-center text-xl font-bold p-2 w-full hover:bg-gray-100 rounded"
            >
                {isMinimized ? '🔽 Pokechat' : '🔼 Pokechat'}
            </button>
        </div>
        </div>

    )
}
