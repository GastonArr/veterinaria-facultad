'use client'
import Link from 'next/link';
import { FaBell, FaBoxOpen, FaCog, FaPaw, FaRegCalendarCheck } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


const DashboardCard = ({ title, description, href }) => (
    <Link href={href}>
        <div className="h-full rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h3>
            <p className="mt-2 text-sm sm:text-base text-gray-500">{description}</p>
        </div>
    </Link>
);

export default function AdminDashboardPage() {

    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'admin') {
                router.push('/');
            }
        }
    }, [user, loading, router]);

    if (loading || !user || user.role !== 'admin') {
        return null;
    }


  return (
    <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold">Panel de Control</h1>
                    <p className="mt-1 text-blue-100">Bienvenida, {user?.displayName || 'Admin'}. Selecciona una opción.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                        <p className="font-semibold">Estado</p>
                        <p className="text-blue-100">Operativo</p>
                    </div>
                    <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                        <p className="font-semibold">Perfil</p>
                        <p className="text-blue-100">Administrador</p>
                    </div>
                </div>
            </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-blue-100">
                <FaRegCalendarCheck className="text-blue-600 text-xl mb-2" />
                <p className="text-sm text-gray-500">Gestión</p>
                <p className="font-bold text-gray-800">Turnos</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-blue-100">
                <FaPaw className="text-cyan-600 text-xl mb-2" />
                <p className="text-sm text-gray-500">Comunidad</p>
                <p className="font-bold text-gray-800">Clientes & Mascotas</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-blue-100 col-span-2 lg:col-span-1">
                <FaCog className="text-indigo-600 text-xl mb-2" />
                <p className="text-sm text-gray-500">Configuración</p>
                <p className="font-bold text-gray-800">Servicios</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-blue-100 col-span-2 lg:col-span-1">
                <FaBell className="text-sky-600 text-xl mb-2" />
                <p className="text-sm text-gray-500">Atención</p>
                <p className="font-bold text-gray-800">Seguimiento diario</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard title="Turnos" description="Gestionar todas las citas" href="/admin/turnos" />
            <DashboardCard title="Clientes" description="Ver y administrar clientes" href="/admin/clientes" />
            <DashboardCard title="Calendario y Servicio" description="Gestión de días y servicios" href="/admin/servicios" />
            <DashboardCard title="Empleados" description="Gestión de roles de usuarios" href="/admin/empleados" />
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Próximas Secciones</h2>
            <div className="flex items-center text-gray-500 my-2">
                <FaBell className="text-xl mr-4" />
                <span>Notificaciones</span>
            </div>
            <div className="flex items-center text-gray-500 my-2">
                <FaBoxOpen className="text-xl mr-4" />
                <span>Caja</span>
            </div>
            <div className="flex items-center text-gray-500 my-2">
                <FaCog className="text-xl mr-4" />
                <span>Configuración</span>
            </div>
            <p className="text-gray-400 mt-4 text-sm">Estas secciones estarán disponibles próximamente.</p>
        </div>
    </div>
  );
}
