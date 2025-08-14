import Markdown from "react-markdown";

export default function PokechatMessages({ messages }) {
    return (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            {messages.map((message, index) => (
                <div key={index}>
                    <Markdown >{message.content}</Markdown>
                </div>
            ))}
        </div>
    )
}