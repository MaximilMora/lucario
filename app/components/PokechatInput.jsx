export default function PokechatInput({ input, setInput, sendMessage, handleEnter }) {
    return (
        <div className="flex items-center p-4">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleEnter} className="flex-1 rounded-l-md p-2" />
            <button onClick={sendMessage} className="bg-white text-black px-4 py-2 rounded-r-md">Send</button>
        </div>
    )
}