
import { getUserByIdAndPets } from '@/lib/actions/admin.actions.js';
import Link from 'next/link';

// Componente para mostrar un ícono de flecha
const ArrowLeftIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

// Página de detalles del cliente (Componente de Servidor)
export default async function ClienteDetallePage({ params }) {
  const { id } = params;
  const data = await getUserByIdAndPets(id);

  // CORRECCIÓN: Comprobación robusta de errores y datos
  // Si hay un error explícito O si no se devolvió el objeto 'user', mostramos error.
  if (data.error || !data.user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error al Cargar Cliente</h2>
        <p className="text-gray-700">{data.error || "No se pudieron encontrar los datos del cliente. Es posible que haya sido eliminado."}</p>
        <Link href="/admin/clientes" className="mt-6 inline-block bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">
          Volver a la lista de clientes
        </Link>
      </div>
    );
  }

  const { user, mascotas } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/clientes" className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Volver a Clientes
        </Link>
      </div>

      {/* Card de Información del Cliente */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.nombre} {user.apellido}</h1>
        <p className="text-sm text-gray-500 mb-4">ID de Cliente: {user.id}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-gray-700">
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>DNI:</strong> {user.dni || 'No especificado'}</div>
          <div><strong>Teléfono Principal:</strong> {user.telefonoPrincipal || 'No especificado'}</div>
          <div><strong>Teléfono Secundario:</strong> {user.telefonoSecundario || 'No especificado'}</div>
          <div className="md:col-span-2"><strong>Dirección:</strong> {user.direccion || 'No especificada'}</div>
          <div className="md:col-span-2 pt-2">
            <h4 className="font-semibold">Contacto de Emergencia</h4>
            <p className="pl-4 border-l-2 border-gray-200 mt-1">
              {user.nombreContactoEmergencia || 'No especificado'} - {user.telefonoContactoEmergencia || 'No especificado'}
            </p>
          </div>
        </div>
      </div>

      {/* Sección de Mascotas */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Mascotas Registradas</h2>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {mascotas && mascotas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raza</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nacimiento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mascotas.map(mascota => (
                    <tr key={mascota.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mascota.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mascota.especie}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mascota.raza}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mascota.fechaNacimiento ? new Date(mascota.fechaNacimiento).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mascota.tamaño}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/clientes/${id}/mascotas/${mascota.id}`}
                          className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                        >
                          📋 Historia Clínica
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-500">Este cliente aún no ha registrado ninguna mascota.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
