'use client';

import React, { useState } from 'react';
import { useTurnoWizard } from '../TurnoWizardContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FaMoneyBillWave, FaCreditCard, FaSpinner } from 'react-icons/fa';
import { crearTurnos } from '@/lib/actions/turnos.actions';
import toast from 'react-hot-toast';

export default function Paso5() {
    const {
        selectedMascotas,
        motivosPorMascota,
        specificServices,
        horarioClinica,
        horarioPeluqueria,
        necesitaTraslado,
        metodoPago, setMetodoPago,
        catalogoServicios
    } = useTurnoWizard();

    const { user } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmarTurnos = async () => {
        setIsSubmitting(true);
        try {
            const result = await crearTurnos(user?.uid, {
                selectedMascotas,
                motivosPorMascota,
                specificServices,
                horarioClinica,
                horarioPeluqueria,
                necesitaTraslado,
                metodoPago,
                catalogoServicios
            });

            if (result.success) {
                toast.success('¡Turnos creados con éxito!');
                router.push('/turnos/mis-turnos');
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
        } catch (error) { 
            toast.error(error.message); 
        } finally { 
            setIsSubmitting(false); 
        }
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-8">Paso 5: Detalles Finales y Confirmación</h2>
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center mb-3">
                            <FaCreditCard className="text-2xl text-gray-600 mr-3"/>
                            <span className="font-bold text-gray-700">Método de pago</span>
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setMetodoPago('efectivo')} className={`flex-1 p-3 rounded-lg border-2 ${metodoPago === 'efectivo' ? 'border-blue-500 bg-blue-50' : ''}`}>
                                <FaMoneyBillWave className="inline mr-2"/> Efectivo
                            </button>
                            <button type="button" onClick={() => setMetodoPago('transferencia')} className={`flex-1 p-3 rounded-lg border-2 ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50' : ''}`}>
                                <FaCreditCard className="inline mr-2"/> Transferencia
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 rounded-xl border">
                    <h3 className="text-xl font-bold mb-4 border-b pb-2">Resumen del Turno</h3>
                    {/* Aquí se puede añadir un resumen detallado de los turnos */}
                    <p className="text-sm text-gray-600">Revisa los detalles de tu turno antes de confirmar.</p>
                </div>
            </div>

            <div className="p-4 sm:p-6 border-t flex justify-end mt-8">
                <button 
                    onClick={handleConfirmarTurnos} 
                    disabled={isSubmitting} 
                    className="px-8 py-3 w-full md:w-auto bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? <FaSpinner className="animate-spin"/> : 'Confirmar Turnos'}
                </button>
            </div>
        </div>
    );
}
