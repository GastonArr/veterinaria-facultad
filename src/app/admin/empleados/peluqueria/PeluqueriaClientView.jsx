'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { updateTurnoStatusByEmpleado } from '@/lib/actions/turnos.empleado.actions';

// --- Componente para el Botón de Acción Dinámico ---
const ActionButton = ({ turno, onUpdate, isLoading }) => {
    const { estado, clienteId, mascotaId, id } = turno;

    const actions = {
        confirmado: { text: 'Iniciar Peluquería', newStatus: 'peluqueria iniciada', className: 'bg-blue-600 hover:bg-blue-700' },
        'traslado confirmado': { text: 'Iniciar Peluquería', newStatus: 'peluqueria iniciada', className: 'bg-blue-600 hover:bg-blue-700' },
        veterinaria: { text: 'Iniciar Peluquería', newStatus: 'peluqueria iniciada', className: 'bg-blue-600 hover:bg-blue-700' },
        'peluqueria iniciada': { text: 'Finalizar Peluquería', newStatus: 'peluqueria finalizada', className: 'bg-green-600 hover:bg-green-700' },
    };

    const action = actions[estado];

    if (!action) {
        return (
            <span className="text-sm text-gray-500 italic">Sin acción requerida</span>
        );
    }

    return (
        <button
            onClick={() => onUpdate({ clienteId, mascotaId, turnoId: id, newStatus: action.newStatus })}
            disabled={isLoading}
            className={`text-white font-bold py-2 px-4 rounded transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${action.className}`}
        >
            {isLoading ? 'Cargando...' : action.text}
        </button>
    );
};

// --- Componente Principal de la Vista del Cliente de Peluquería ---
const PeluqueriaClientView = ({ initialTurnos }) => {
    const [turnos, setTurnos] = useState(() => 
        Array.isArray(initialTurnos) 
            ? initialTurnos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) 
            : []
    );
    const [loadingTurnoId, setLoadingTurnoId] = useState(null);
    const [turnoParaFinalizar, setTurnoParaFinalizar] = useState(null);
    const [comentarioCorte, setComentarioCorte] = useState('');
    const [modalError, setModalError] = useState('');

    const handleStatusUpdate = async ({ clienteId, mascotaId, turnoId, newStatus, comentario }) => {
        setLoadingTurnoId(turnoId);
        const result = await updateTurnoStatusByEmpleado({ clienteId, mascotaId, turnoId, newStatus, comentario });
        
        if (result.success) {
            setTurnos(prevTurnos =>
                prevTurnos.map(t =>
                    t.id === turnoId ? { ...t, estado: newStatus, comentario: comentario || t.comentario } : t
                )
            );
        } else {
            setModalError(result.error || "No se pudo actualizar el turno.");
        }
        setLoadingTurnoId(null);
        return result;
    };

    const handleAction = async ({ clienteId, mascotaId, turnoId, newStatus }) => {
      if (newStatus === 'peluqueria finalizada') {
        const turno = turnos.find((t) => t.id === turnoId);
        setTurnoParaFinalizar(turno || null);
        setComentarioCorte(turno?.comentario || '');
        setModalError('');
        return;
      }
      await handleStatusUpdate({ clienteId, mascotaId, turnoId, newStatus });
    };

    const handleConfirmarFinalizacion = async () => {
      if (!turnoParaFinalizar) return;
      if (!comentarioCorte.trim()) {
        setModalError('El historial del corte es obligatorio para finalizar.');
        return;
      }

      const result = await handleStatusUpdate({
        clienteId: turnoParaFinalizar.clienteId,
        mascotaId: turnoParaFinalizar.mascotaId,
        turnoId: turnoParaFinalizar.id,
        newStatus: 'peluqueria finalizada',
        comentario: comentarioCorte.trim(),
      });

      if (result?.success) {
        setTurnoParaFinalizar(null);
        setComentarioCorte('');
      }
    };
    
    const statusColors = {
      default: 'bg-gray-100 text-gray-800',
      veterinaria: 'bg-indigo-100 text-indigo-800',
      'peluqueria iniciada': 'bg-pink-100 text-pink-800',
      'peluqueria finalizada': 'bg-purple-100 text-purple-800',
      'servicio terminado': 'bg-green-100 text-green-800',
      confirmado: 'bg-yellow-100 text-yellow-800',
      'traslado confirmado': 'bg-emerald-100 text-emerald-800',
      buscando: 'bg-blue-100 text-blue-800',
      buscado: 'bg-cyan-100 text-cyan-800',
      devolviendo: 'bg-orange-100 text-orange-800',
    };

    return (
        <div className="p-4 md:p-8 bg-white text-gray-900 min-h-screen">
            <div className="mb-6">
                <Link href="/admin/empleados">
                    <span className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer">
                        <FaArrowLeft className="mr-2" />
                        Volver al Panel Principal
                    </span>
                </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Panel de Peluquería</h1>
            <p className="text-gray-600 mb-8">Gestiona los turnos de peluquería del día de hoy.</p>

            {turnos.length === 0 ? (
                <p className="text-gray-500 text-center mt-12">No hay turnos de peluquería pendientes para hoy.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mascota</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dueño</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Actual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próxima Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {turnos.map((turno) => (
                                <tr key={turno.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(turno.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{turno.mascota.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{turno.user.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{turno.user.telefono}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[turno.estado] || statusColors.default}`}>
                                          {turno.estado}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <ActionButton
                                            turno={turno}
                                            onUpdate={handleAction}
                                            isLoading={loadingTurnoId === turno.id}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {turnoParaFinalizar && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-2">Finalizar peluquería</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Completá el historial del corte de <strong>{turnoParaFinalizar.mascota?.nombre}</strong>. Este campo es obligatorio.
                  </p>
                  <textarea
                    value={comentarioCorte}
                    onChange={(e) => setComentarioCorte(e.target.value)}
                    placeholder="Detalle del corte realizado, observaciones y recomendaciones..."
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {modalError && <p className="text-sm text-red-600 mt-3">{modalError}</p>}
                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setTurnoParaFinalizar(null);
                        setComentarioCorte('');
                        setModalError('');
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmarFinalizacion}
                      disabled={loadingTurnoId === turnoParaFinalizar.id}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                    >
                      {loadingTurnoId === turnoParaFinalizar.id ? 'Guardando...' : 'Guardar y finalizar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
};

export default PeluqueriaClientView;
