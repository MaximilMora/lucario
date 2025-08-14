"use client"
import { useState } from "react";
import PokechatHeader from "./PokechatHeader";
import PokechatMessages from "./PokechatMessages";
import PokechatInput from "./PokechatInput";

export default function PokechatAi() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false); 

    if (isMinimized) {
        return <div className="fixed bottom-0 right-0 w-80 h-20 max-w-sm bg-white text-black border-gray-300 border-2 shadow-xl z-50 flex flex-col">
            <PokechatHeader isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        </div>
    }
   const sendMessage = async () => {
    setLoading(true);
    console.log("sendMessage----");
    try {

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      });
  
      const data = await response.json();
      console.log(data.response);
      
      if (data.error) {
        console.error('API Error:', data.error);
        return;
      }
  
      // Add messages to chat
      setMessages(prev => [
        ...prev,
        { sender: 'user', content: input, timestamp: new Date() },
        { 
          sender: 'bot', 
          content: data.response, 
          pokemonData: data.pokemonData,
          timestamp: new Date(data.timestamp)
        }
      ]);
      
      setInput(""); // Clear input after sending
      
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
    }
  };
    const handleEnter = (e) => {
       if (e.key === "Enter") {
        sendMessage();
       }
    }
  
    return (
        <div className="fixed bottom-0 right-0 w-80 h-96 max-w-sm bg-white text-black border-gray-300 border-2 rounded-lg shadow-xl z-50 flex flex-col">
            <PokechatHeader isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            {!isMinimized && (
                <>
                    <PokechatMessages messages={messages} />
                    <PokechatInput loading={loading} input={input} setInput={setInput} sendMessage={sendMessage} handleEnter={handleEnter} />
                </>
            )}
        </div>
    )
}
