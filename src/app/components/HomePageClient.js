
'use client';

import { useAuth } from '@/contexts/AuthContext';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import SubHeader from './SubHeader';
import RolePortalHero from './RolePortalHero';
import Link from 'next/link';

export default function HomePageClient({ serverComponents }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="loader border-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
        </div>
    );
  }

  if (user) {
    const displayIdentifier = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Equipo';
    const isOwner = user.role === 'dueño';

    return (
      <>
        {isOwner && <SubHeader />}
        <Dashboard canRequestTurn={isOwner}>
          {!isOwner && (
            <section className="mb-8 md:mb-10 flex justify-center">
              <Link
                href="/mis-datos"
                className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-base font-bold text-gray-800 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Ver mis datos
              </Link>
            </section>
          )}
          <RolePortalHero role={user.role} name={displayIdentifier} />

          {/* Sección de Adopciones */}
          <section className="py-12 md:py-16 px-4 md:px-8">
            {serverComponents.galeria}
          </section>
        </Dashboard>
      </>
    );
  }

  return <LandingPage />;}
