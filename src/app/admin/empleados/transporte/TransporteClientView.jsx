'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { updateTurnoStatusByEmpleado } from '@/lib/actions/turnos.empleado.actions';

// --- Componente para el Botón de Acción Dinámico del Transportista ---
const ActionButton = ({ turno, onUpdate, isLoading }) => {
    const { estado, clienteId, mascotaId, id } = turno;

    const actions = {
        confirmado: { text: 'Iniciar Recogida', newStatus: 'buscando', className: 'bg-blue-600 hover:bg-blue-700' },
        buscando: { text: 'Mascota Recogida', newStatus: 'buscado', className: 'bg-cyan-600 hover:bg-cyan-700' },
        buscado: { text: 'Entregar en Veterinaria', newStatus: 'veterinaria', className: 'bg-indigo-600 hover:bg-indigo-700' },
        'peluqueria finalizada': { text: 'Iniciar Devolución', newStatus: 'devolviendo', className: 'bg-orange-500 hover:bg-orange-600' },
        devolviendo: { text: 'Mascota Entregada', newStatus: 'servicio terminado', className: 'bg-green-600 hover:bg-green-700' },
    };

    const action = actions[estado];

    if (!action) {
        return <span className="text-sm text-gray-500 italic">En espera</span>;
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

// --- Componente Principal de la Vista del Cliente de Transporte ---
const TransporteClientView = ({ initialTurnos }) => {
    const [turnos, setTurnos] = useState(() => 
        Array.isArray(initialTurnos)
            ? initialTurnos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            : []
    );
    const [loadingTurnoId, setLoadingTurnoId] = useState(null);

    const handleStatusUpdate = async ({ clienteId, mascotaId, turnoId, newStatus }) => {
        setLoadingTurnoId(turnoId);
        const result = await updateTurnoStatusByEmpleado({ clienteId, mascotaId, turnoId, newStatus });
        
        if (result.success) {
            setTurnos(prevTurnos =>
                prevTurnos.map(t =>
                    t.id === turnoId ? { ...t, estado: newStatus } : t
                )
            );
        } else {
            console.error("Fallo al actualizar el turno:", result.error);
        }
        setLoadingTurnoId(null);
    };

    const getTripType = (estado) => {
        const recogidaStates = ['confirmado', 'buscando', 'buscado'];
        const entregaStates = ['peluqueria finalizada', 'devolviendo'];
        if (recogidaStates.includes(estado)) return { text: 'Recogida', className: 'bg-blue-100 text-blue-800' };
        if (entregaStates.includes(estado)) return { text: 'Entrega', className: 'bg-green-100 text-green-800' };
        return { text: 'En Local', className: 'bg-gray-100 text-gray-800' };
    };
    
    const statusColors = {
        confirmado: 'bg-blue-100 text-blue-800',
        buscando: 'bg-cyan-100 text-cyan-800',
        buscado: 'bg-sky-100 text-sky-800',
        veterinaria: 'bg-indigo-100 text-indigo-800',
        'peluqueria finalizada': 'bg-purple-100 text-purple-800',
        devolviendo: 'bg-orange-100 text-orange-800',
        'servicio terminado': 'bg-lime-200 text-lime-900',
    };

    return (
        <div className="p-4 md:p-8 bg-white text-gray-900 min-h-screen">
            <div className="mb-6">
                <Link href="/mis-datos">
                    <span className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer">
                        <FaArrowLeft className="mr-2" />
                        Volver a Mis Datos
                    </span>
                </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Panel de Transporte</h1>
            <p className="text-gray-600 mb-8">Gestiona las recogidas y entregas de mascotas del día.</p>

            {turnos.length === 0 ? (
                <p className="text-gray-500 text-center mt-12">No hay tareas de transporte para hoy.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mascota</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Viaje</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Actual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próxima Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {turnos.map((turno) => {
                                const tripType = getTripType(turno.estado);
                                return (
                                    <tr key={turno.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(turno.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{turno.mascota.nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{turno.user.direccion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tripType.className}`}>
                                                {tripType.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[turno.estado] || 'bg-gray-100 text-gray-800'}`}>
                                                {turno.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <ActionButton
                                                turno={turno}
                                                onUpdate={handleStatusUpdate}
                                                isLoading={loadingTurnoId === turno.id}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TransporteClientView;
