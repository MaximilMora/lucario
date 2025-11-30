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
    <div className="bg-gray-800 border-4 border-gray-900 rounded-lg p-4 h-32 overflow-y-auto">
      <div className="space-y-1">
        {messages.map((message, index) => (
          <p key={index} className="text-white text-sm font-semibold">
            {message}
          </p>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

