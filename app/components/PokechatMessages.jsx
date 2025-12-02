import Markdown from 'react-markdown';

export default function PokechatMessages({ messages }) {
  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`mb-3 ${
            message.isError
              ? 'bg-red-50 border-l-4 border-red-400 p-3 rounded-r-md text-red-700'
              : message.sender === 'user'
                ? 'bg-blue-50 p-3 rounded-lg ml-8'
                : 'bg-gray-50 p-3 rounded-lg mr-8'
          }`}
        >
          <Markdown>{message.content}</Markdown>
        </div>
      ))}
    </div>
  );
}
