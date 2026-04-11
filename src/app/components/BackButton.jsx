'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';

const HIDDEN_ROUTES = new Set(['/']);

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || HIDDEN_ROUTES.has(pathname)) {
    return null;
  }

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-4">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
        aria-label="Volver a la página anterior"
      >
        <FaArrowLeft aria-hidden="true" />
        Volver
      </button>
    </div>
  );
}
