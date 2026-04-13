'use client'
import Link from 'next/link';
import { FaBell, FaBoxOpen, FaCog } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


const DashboardCard = ({ title, description, href }) => (
    <Link href={href}>
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <p className="text-gray-500 mt-2">{description}</p>
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
    <div>
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Panel de Control</h1>
            <p className="text-gray-500 mt-1">Bienvenida, {user?.displayName || 'Admin'}. Selecciona una opción.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard title="Turnos" description="Gestionar todas las citas" href="/admin/turnos" />
            <DashboardCard title="Clientes" description="Ver y administrar clientes" href="/admin/clientes" />
            <DashboardCard title="Calendario y Servicio" description="Gestión de días y servicios" href="/admin/servicios" />
            <DashboardCard title="Empleados" description="Gestión de roles de usuarios" href="/admin/empleados" />
        </div>

        <div className="mt-10 bg-white rounded-lg shadow-md p-6">
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
