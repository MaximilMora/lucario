"use client"
import { useState } from "react";
import PokechatHeader from "./PokechatHeader";
import PokechatMessages from "./PokechatMessages";
import PokechatInput from "./PokechatInput";

export default function PokechatAi() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

   const fetchMessage = async () => {
    const response = await fetch(/*Api´s code here*/)
    const data = await response.json();
    setMessages([...messages, { content: data.message }]);
   }

    const sendMessage = async () => {
        setMessages([...messages, { role: "user", content: input }]);
        setInput("");
        await fetchMessage();
    }

    const handleEnter = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    }
  
    return (
        <div className="flex flex-col h-100 w-100 text-black border-gray-300 border-2 rounded-md m-4 align-right" >
            <PokechatHeader />
            <PokechatMessages messages={messages} />
            <PokechatInput input={input} setInput={setInput} sendMessage={sendMessage} handleEnter={handleEnter} />
          
        </div>
    )
}