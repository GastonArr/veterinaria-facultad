
'use client';

import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { cancelarTurnoUsuario } from '@/lib/actions/turnos.actions.js';

export default function AccionesTurnoUsuario({ turno }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

 
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaTurno = new Date(turno.fecha + 'T12:00:00');

    const puedeCancelar = (
        (turno.estado === 'pendiente' || turno.estado === 'confirmado') && 
        fechaTurno >= hoy
    );

    if (!puedeCancelar) {
        return null; // No renderizar nada si no se puede cancelar
    }

    const handleCancel = async () => {
        if (!window.confirm('¿Estás seguro de que quieres cancelar este turno? Esta acción no se puede deshacer.')) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await cancelarTurnoUsuario(turno.id);
            if (result.success) {
                setSuccess('Turno cancelado con éxito.');
                // El componente se ocultará automáticamente en la siguiente renderización gracias a revalidatePath
            } else {
                setError(result.error || 'No se pudo cancelar el turno.');
            }
        } catch (err) {
            setError('Error de conexión al intentar cancelar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-shrink-0 self-center mt-4 sm:mt-0">
            {error && <p className="text-xs text-red-600 mb-2 text-center">{error}</p>}
            {success && <p className="text-xs text-green-600 mb-2 text-center">{success}</p>}
            
            {!success && (
                 <button 
                    onClick={handleCancel} 
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-full text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FiTrash2 className="mr-2 h-4 w-4"/>
                    {loading ? 'Cancelando...' : 'Cancelar Turno'}
                </button>
            )}
        </div>
    );
}
