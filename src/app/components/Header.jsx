'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaSignOutAlt } from 'react-icons/fa';

const getInitial = (name) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

export default function Header() {
    const { user, isLoggedIn, logout, loading } = useAuth(); 
    const router = useRouter();

    const cerrarsesion = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }

    const renderUserSection = () => {
        if (loading) {
            return <div className="h-11 w-48 bg-gray-200 animate-pulse rounded-md"></div>; // Placeholder while loading
        }

        if (isLoggedIn && user) {
            let displayIdentifier = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario';

            return (
                <div className="flex items-center justify-end gap-4">
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-sm font-medium text-gray-700 capitalize">Hola, {displayIdentifier}</span>
                        <div className="flex items-center justify-center bg-violet-100 rounded-full h-11 w-11 text-violet-700 font-bold text-lg overflow-hidden">
                            {user.photoURL ? (
                                <Image src={user.photoURL} alt="Avatar" width={44} height={44} />
                            ) : (
                                <span>{getInitial(displayIdentifier)}</span>
                            )}
                        </div>
                    </div>
                    <button onClick={cerrarsesion} title="Cerrar Sesión" className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors text-sm h-11 w-11 sm:w-auto sm:px-4">
                        <FaSignOutAlt className="text-lg" />
                        <span className="hidden sm:inline sm:ml-2">Salir</span>
                    </button>
                </div>
            );
        }
        
        return null;
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-50 w-full">
            <nav className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex-shrink-0">
                        <Link href="/">
                            <Image 
                                src="/LOGO.svg" 
                                alt="Logo Veterinaria Magali Martin"
                                width={180}
                                height={50}
                                priority
                            />
                        </Link>
                    </div>
                    {renderUserSection()}
                </div>
            </nav>
        </header>
    );
}
