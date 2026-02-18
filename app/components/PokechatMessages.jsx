import Markdown from 'react-markdown';

export default function PokechatMessages({ messages }) {
  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-gray-50/50">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`mb-3 ${
            message.isError
              ? 'bg-white border-l-4 border-red-500 p-3 rounded-r-lg shadow-sm text-red-600'
              : message.sender === 'user'
                ? 'bg-white shadow-sm p-3 rounded-xl ml-8 text-gray-800'
                : 'bg-gray-100 p-3 rounded-xl mr-8 text-gray-800'
          }`}
        >
          <Markdown className="text-sm">{message.content}</Markdown>
        </div>
      ))}
    </div>
  );
}
