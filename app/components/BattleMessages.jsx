'use client';

import { useEffect, useRef } from 'react';

/**
 * Componente para mostrar mensajes de combate
 */
export default function BattleMessages({ messages = [] }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 h-32 overflow-y-auto border border-gray-100">
      <div className="space-y-1">
        {messages.map((message, index) => (
          <p key={index} className="text-gray-800 text-sm">
            {message}
          </p>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
