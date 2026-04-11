'use client';

import Link from 'next/link';
import { FaArrowRight, FaCut, FaShieldAlt, FaShuttleVan } from 'react-icons/fa';

const ROLE_CONFIG = {
  admin: {
    href: '/admin',
    title: 'Panel de Administración',
    subtitle: 'Gestioná turnos, clientes, servicios y empleados desde tu centro de control.',
    cta: 'Abrir panel admin',
    icon: FaShieldAlt,
    gradient: 'from-violet-600 to-indigo-700',
    ring: 'ring-violet-300',
  },
  peluqueria: {
    href: '/admin/empleados/peluqueria',
    title: 'Portal de Peluquería',
    subtitle: 'Accedé al listado de turnos de estética y gestioná tu jornada en un clic.',
    cta: 'Ir a peluquería',
    icon: FaCut,
    gradient: 'from-pink-500 to-rose-600',
    ring: 'ring-pink-300',
  },
  transporte: {
    href: '/admin/empleados/transporte',
    title: 'Portal de Transporte',
    subtitle: 'Visualizá traslados programados y organizá recorridos de forma rápida.',
    cta: 'Ir a transporte',
    icon: FaShuttleVan,
    gradient: 'from-cyan-500 to-blue-600',
    ring: 'ring-cyan-300',
  },
};

export default function RolePortalHero({ role, name }) {
  if (!role || !ROLE_CONFIG[role]) {
    return null;
  }

  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <section className="mb-8 md:mb-12">
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${config.gradient} p-6 md:p-8 text-white shadow-2xl ring-4 ${config.ring}`}
      >
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-white/90 text-sm md:text-base">Tu acceso principal</p>
            <h2 className="text-2xl md:text-4xl font-extrabold mt-1">{config.title}</h2>
            <p className="text-white/90 mt-3 text-sm md:text-base">
              {name ? `Hola ${name}, ` : ''}
              {config.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center h-16 w-16 rounded-2xl bg-white/20">
              <Icon className="text-3xl" />
            </div>
            <Link
              href={config.href}
              className="inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 font-bold text-gray-800 transition hover:scale-105 hover:shadow-lg"
            >
              {config.cta}
              <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
