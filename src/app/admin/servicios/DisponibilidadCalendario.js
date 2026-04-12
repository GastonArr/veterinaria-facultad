'use client';

import { useState, useTransition } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { FaSpinner } from 'react-icons/fa';
import { actualizarDiasNoLaborales } from '@/lib/actions/config.admin.actions.js';
import toast from 'react-hot-toast';

// Helper para formatear la fecha LOCAL a YYYY-MM-DD
const toLocalDateString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function DisponibilidadCalendario({
    diasBloqueados: initialDiasBloqueados = [],
    permitirTurnosDiasEspecialesInicial = false,
}) {
    // --- CORRECCIÓN DE ZONA HORARIA ---
    // Se inicializan las fechas como objetos Date en la zona horaria LOCAL del navegador.
    const initialDates = initialDiasBloqueados.map(dateStr => {
        // La T00:00:00 asegura que el string se interprete en la zona horaria local.
        return new Date(`${dateStr}T00:00:00`);
    });

    const [selectedDays, setSelectedDays] = useState(initialDates);
    const [permitirTurnosDiasEspeciales, setPermitirTurnosDiasEspeciales] = useState(permitirTurnosDiasEspecialesInicial);
    const [isPending, startTransition] = useTransition();

    const guardarConfiguracion = (diasActualizados, permitirTurnos) => {
        const nuevasFechas = diasActualizados.map(toLocalDateString);

        startTransition(async () => {
            const toastId = toast.loading('Guardando cambios y actualizando turnos...');
            
            try {
                const result = await actualizarDiasNoLaborales({
                    nuevasFechas,
                    permitirTurnosDiasEspeciales: permitirTurnos,
                });

                if (result.success) {
                    let successMessage = '¡Calendario actualizado con éxito!';
                    if (result.reprogramadosCount > 0) {
                        successMessage += ` Se marcaron ${result.reprogramadosCount} turnos para reprogramación.`
                    }
                    toast.success(successMessage, { id: toastId });
                } else {
                    throw new Error(result.error || 'Ocurrió un error desconocido.');
                }

            } catch (error) {
                console.error("Error al guardar los días no laborales:", error);
                toast.error(`Error al guardar: ${error.message}`, { id: toastId });
            }
        });
    };

    const handleDayClick = (day, { selected }) => {
        // El objeto 'day' ya viene en la zona horaria local. No se necesita conversión.
        // Se normaliza a medianoche para evitar problemas de comparación de horas.
        const dayAtMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());

        let nuevosDias = [];
        if (selected) {
            nuevosDias = selectedDays.filter(d => d.getTime() !== dayAtMidnight.getTime());
        } else {
            nuevosDias = [...selectedDays, dayAtMidnight];
        }

        setSelectedDays(nuevosDias);
        guardarConfiguracion(nuevosDias, permitirTurnosDiasEspeciales);
    };

    const handleGuardarCambios = () => {
        guardarConfiguracion(selectedDays, permitirTurnosDiasEspeciales);
    };

    const handleToggleDiasEspeciales = () => {
        const nuevoEstado = !permitirTurnosDiasEspeciales;
        setPermitirTurnosDiasEspeciales(nuevoEstado);
        guardarConfiguracion(selectedDays, nuevoEstado);
    };

    const footer = selectedDays.length > 0
        ? `Días marcados para no abrir: ${selectedDays.length}.`
        : `Selecciona uno o más días para marcarlos como no disponibles.`;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg relative mt-8">
            {isPending && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                    <FaSpinner className="animate-spin text-4xl text-blue-500" />
                </div>
            )}
            <h3 className="text-xl font-bold text-gray-800 mb-2">Gestión de Días No Laborables</h3>
            <p className="text-gray-600 mb-4">
                Marca en el calendario los días que no va abrir la veterinaria.
            </p>
            <div className="mb-5 p-4 rounded-lg border bg-gray-50 flex items-center justify-between">
                <div>
                    <p className="font-semibold text-gray-800">Habilitar turnos en feriados y fines de semana</p>
                    <p className="text-sm text-gray-600">Si lo activas, los usuarios podrán pedir turnos también en esos días.</p>
                </div>
                <button
                    onClick={handleToggleDiasEspeciales}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${permitirTurnosDiasEspeciales ? 'bg-green-600' : 'bg-gray-400'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${permitirTurnosDiasEspeciales ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <div className="flex flex-col items-center">
                <DayPicker
                    mode="multiple"
                    min={0}
                    selected={selectedDays}
                    onDayClick={handleDayClick}
                    modifiersClassNames={{
                        selected: '!bg-red-500 !text-white rounded-full',
                        today: '!text-blue-500 font-bold'
                    }}
                     styles={{
                        day: { transition: 'background-color 0.2s ease-in-out' },
                        head_cell: { fontWeight: 'bold' },
                    }}
                    footer={<p className="text-center text-sm text-gray-500 mt-4">{footer}</p>}
                />
                <button 
                    onClick={handleGuardarCambios} 
                    disabled={isPending} 
                    className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
                >
                    {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
}
