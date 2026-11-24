'use client';

import { useEffect, useRef } from 'react';

const TYPE_STYLES = {
  attack: 'text-gray-800',
  damage: 'text-orange-600 font-medium',
  faint: 'text-red-600 font-bold',
  victory: 'text-green-600 font-bold',
  supereffective: 'text-amber-500 font-bold',
  notveryeffective: 'text-slate-500',
  immune: 'text-red-500 italic',
  system: 'text-gray-400 italic',
};

/**
 * Componente para mostrar mensajes de combate.
 * Acepta mensajes como strings o como objetos { text, type }.
 */
export default function BattleMessages({ messages = [] }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 h-40 overflow-y-auto border border-gray-100">
      <div className="space-y-1">
        {messages.map((message, index) => {
          const text = typeof message === 'string' ? message : message.text;
          const type = typeof message === 'string' ? 'attack' : message.type;
          const className = `text-sm ${TYPE_STYLES[type] || 'text-gray-800'}`;
          return (
            <p key={index} className={className}>
              {text}
            </p>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
