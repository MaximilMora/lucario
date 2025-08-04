export default function PokechatMessages({ messages }) {
    return (
        <div className="flex-1 flex flex-col p-4">
            {messages.map((message, index) => (
                <div key={index}>{message.content}</div>
            ))}
        </div>
    )
}