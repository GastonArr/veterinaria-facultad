import { getAllUsers } from '@/lib/actions/admin.actions.js';
import ClientesTable from './ClientesTable.jsx';

export default async function ClientesPage() {
  const result = await getAllUsers();

  if (result.error || !Array.isArray(result)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Clientes</h1>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <p className="text-red-500">{result.error || "No se pudieron cargar los clientes."}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const users = result;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Clientes</h1>
        <p className="text-gray-600 mb-8">Aquí podrás ver y administrar la información de los dueños de las mascotas.</p>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          {users.length === 0 ? (
            <p className="text-gray-500">No hay clientes registrados.</p>
          ) : (
            <ClientesTable users={users} />
          )}
        </div>
      </div>
    </div>
  );
}
