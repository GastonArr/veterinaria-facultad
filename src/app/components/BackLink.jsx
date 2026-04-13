'use client';

import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function BackLink({ href, label = 'Volver al Panel Principal', className = '' }) {
  return (
    <Link href={href} className={className}>
      <span className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer">
        <FaArrowLeft className="mr-2" />
        {label}
      </span>
    </Link>
  );
}
