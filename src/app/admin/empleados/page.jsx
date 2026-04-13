import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

import { getAllUsers } from '@/lib/actions/admin.actions';
import EmpleadosClientView from './EmpleadosClientView';

async function EmpleadosPage() {
  // Al ser un Server Component, podemos hacer el fetch de datos directamente.
  const users = await getAllUsers();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin">
          <span className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer">
            <FaArrowLeft className="mr-2" />
            Volver al Panel Principal
          </span>
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de roles de usuarios</h1>
      
      <p className="mb-8 text-gray-600">
        Aquí puedes asignar roles a los usuarios del sistema y eliminarlos por completo cuando sea necesario.
        Los roles determinan los permisos y accesos dentro de la aplicación.
      </p>

      {/* 
        Pasamos los datos obtenidos en el servidor a un Componente de Cliente.
        Esto permite que la página se cargue rápidamente con los datos iniciales,
        y luego el cliente se encarga de la interactividad (cambiar roles, guardar, etc.).
      */}
      <EmpleadosClientView initialUsers={users} />
      
    </div>
  );
}

export default EmpleadosPage;
