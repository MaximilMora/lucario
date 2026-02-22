'use client';

import { useEffect, useRef, useState } from 'react';

const TURN_DURATION = 30;

/**
 * Temporizador de turno para batallas.
 *
 * Props:
 * - active: boolean — el timer solo corre cuando es true.
 * - onExpire: () => void — llamado al llegar a 0.
 * - key externo: resetea el componente cuando cambia (p.ej. al cambiar de turno).
 */
export default function BattleTurnTimer({ active, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setTimeLeft(TURN_DURATION);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (timeLeft <= 0) {
      onExpireRef.current?.();
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [active, timeLeft]);

  const percentage = (timeLeft / TURN_DURATION) * 100;
  const isUrgent = timeLeft <= 10;
  const barColor = isUrgent
    ? 'bg-red-500'
    : timeLeft <= 20
      ? 'bg-yellow-400'
      : 'bg-green-500';
  const textColor = isUrgent ? 'text-red-600' : 'text-gray-700';

  if (!active) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">Turno</span>
        <span className={`text-sm font-bold tabular-nums ${textColor}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor} ${isUrgent ? 'animate-pulse' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
