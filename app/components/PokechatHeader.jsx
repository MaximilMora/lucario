export default function PokechatHeader({ isMinimized, setIsMinimized }) {
  return (
    <div className="flex justify-between items-center p-4 w-full">
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="flex justify-center text-xl font-bold p-2 w-full hover:bg-gray-100 rounded"
      >
        {isMinimized ? '🔽 Pokechat' : '🔼 Pokechat'}
      </button>
    </div>
  );
}
