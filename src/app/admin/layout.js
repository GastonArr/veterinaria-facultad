'use client'
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BackLink from '@/app/components/BackLink';

const allowedRoles = ['admin', 'peluqueria', 'transporte'];
const roleDisplayName = {
    admin: 'Administrador/a',
    peluqueria: 'Peluquería',
    transporte: 'Transporte',
};
const roleHomeRoute = {
    admin: '/admin',
    peluqueria: '/',
    transporte: '/',
};

export default function AdminLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user || !allowedRoles.includes(user?.role)) {
                router.push('/');
            }
        }
    }, [user, loading, router]);

    if (loading || !user || !allowedRoles.includes(user?.role)) {
        return (
             <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
                <p>Verificando acceso...</p> 
            </div>
        );
    }

  return (
    <div className="flex h-screen bg-gray-100">
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-100">
        <header className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">{roleDisplayName[user?.role] || 'Administrador/a'}</h1>
            <BackLink href={roleHomeRoute[user?.role] || '/'} />
        </header>
        {children}
      </main>
    </div>
  );
}
