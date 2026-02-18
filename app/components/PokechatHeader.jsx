export default function PokechatHeader({ isMinimized, setIsMinimized }) {
  return (
    <div className="flex justify-between items-center p-3 w-full bg-red-50 border-b border-red-100 rounded-t-xl">
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="flex justify-center items-center text-lg font-semibold text-red-800 p-2 w-full hover:bg-red-100/80 rounded-lg transition-colors"
      >
        {isMinimized ? '🔽 Pokechat' : '🔼 Pokechat'}
      </button>
    </div>
  );
}
