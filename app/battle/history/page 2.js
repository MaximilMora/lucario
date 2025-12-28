import Link from 'next/link';
import BattleHistory from '../../components/BattleHistory';

export default function BattleHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/battle"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold mb-4"
          >
            ← Volver a Batalla
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Historial de Batallas
          </h1>
          <p className="text-gray-600 mt-2">
            Revisa todas las batallas que has realizado
          </p>
        </div>

        <BattleHistory />
      </div>
    </div>
  );
}
