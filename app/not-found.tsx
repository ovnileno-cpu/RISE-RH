import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 flex-col space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">404 - Page Non Trouvée</h2>
      <p className="text-gray-500">La ressource que vous avez demandée n&apos;existe pas.</p>
      <div className="pt-4">
        <Link href="/">
          <button className="px-4 py-2 bg-[#0B152A] text-white rounded-md hover:bg-opacity-90 transition-opacity">Retour à l&apos;accueil</button>
        </Link>
      </div>
    </div>
  );
}
