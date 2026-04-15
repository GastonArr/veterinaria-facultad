'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { deleteUserCompletely, updateUserRole } from '@/lib/actions/admin.actions';

// Componente para mostrar mensajes de feedback (éxito o error)
const FeedbackMessage = ({ message, type }) => {
  if (!message) return null;
  const baseClasses = 'px-4 py-2 rounded-md text-sm font-medium';
  const typeClasses = type === 'success' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      {message}
    </div>
  );
};

export default function EmpleadosClientView({ initialUsers }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(initialUsers);
  const [pendingRoles, setPendingRoles] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [emailFilter, setEmailFilter] = useState('');

  const handleRoleChange = (userId, newRole) => {
    setPendingRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveChanges = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const roleToSave = pendingRoles[userId] ?? user.role;
    if (!roleToSave || roleToSave === user.role) {
      return;
    }

    setSavingUserId(userId);
    setFeedback({ message: '', type: '' });

    const result = await updateUserRole(userId, roleToSave);

    if (result.success) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: roleToSave } : u)));
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setFeedback({ message: `Rol de ${user.nombre} actualizado con éxito.`, type: 'success' });
    } else {
      setFeedback({ message: `Error: ${result.error}`, type: 'error' });
    }

    setSavingUserId(null);
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const handleDeleteUser = async (targetUser) => {
    const isCurrentUser = currentUser?.uid && currentUser.uid === targetUser.id;
    if (isCurrentUser) {
      setFeedback({ message: 'No puedes eliminar tu propio usuario.', type: 'error' });
      setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
      return;
    }

    const confirmed = window.confirm(
      `Vas a eliminar por completo al usuario ${targetUser.email}. Esta acción borrará mascotas, historial y turnos asociados. ¿Continuar?`
    );

    if (!confirmed) return;

    setDeletingUserId(targetUser.id);
    setFeedback({ message: '', type: '' });

    const result = await deleteUserCompletely({
      userId: targetUser.id,
      requestedByUserId: currentUser?.uid,
    });

    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[targetUser.id];
        return next;
      });
      setFeedback({ message: `Usuario ${targetUser.email} eliminado correctamente.`, type: 'success' });
    } else {
      setFeedback({ message: `Error: ${result.error}`, type: 'error' });
    }

    setDeletingUserId(null);
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const rolesDisponibles = ['dueño', 'admin', 'peluqueria', 'transporte'];

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(emailFilter.toLowerCase())
  );

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4">
        {/* Input para el filtro de email */}
        <input
          type="text"
          placeholder="Filtrar por email..."
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          className="block w-full max-w-sm pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      
      {feedback.message && (
        <div className="p-4 border-t border-gray-200">
          <FeedbackMessage message={feedback.message} type={feedback.type} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Ver</span>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Eliminar</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Mapear sobre los usuarios filtrados */}
            {filteredUsers.map((user) => {
              const selectedRole = pendingRoles[user.id] ?? user.role ?? 'dueño';
              const hasChanges = pendingRoles[user.id] !== undefined && pendingRoles[user.id] !== user.role;
              const isSavingRow = savingUserId === user.id;

              return (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.nombre} {user.apellido}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    {rolesDisponibles.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)} 
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/admin/clientes/${user.id}`} className="text-indigo-600 hover:text-indigo-900">
                    Ver
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleSaveChanges(user.id)}
                    disabled={!hasChanges || isSavingRow || deletingUserId === user.id}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                  >
                    {isSavingRow ? 'Guardando...' : hasChanges ? 'Guardar' : 'Sin cambios'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={deletingUserId === user.id || savingUserId === user.id || currentUser?.uid === user.id}
                    className="inline-flex items-center px-4 py-2 border border-red-200 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                    title={currentUser?.uid === user.id ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'}
                  >
                    {deletingUserId === user.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
