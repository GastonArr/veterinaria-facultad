'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import es from 'date-fns/locale/es';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

import { reprogramarTurnoPorUsuario, getTurnoDetailsForReprogramming, getAvailableSlotsForReprogramming } from '@/lib/actions/turnos.user.actions.js';
import { getDiasNoLaborales } from '@/lib/actions/config.actions.js';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

const Spinner = ({ small } = {}) => (
    <div className={`border-2 ${small ? 'border-white' : 'border-gray-200'} border-t-blue-500 rounded-full ${small ? 'w-5 h-5' : 'w-8 h-8'} animate-spin`}></div>
);

// --- ¡NUEVA FUNCIÓN AUXILIAR! ---
const calcularFechaLimite = (diasNoLaborales = []) => {
    let contadorDiasHabiles = 0;
    let fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0); // Normalizar a medianoche

    // Pre-procesar los días no laborales para una búsqueda eficiente
    const diasNoLaboralesSet = new Set(diasNoLaborales.map(d => dayjs(d).format('YYYY-MM-DD')));

    while (contadorDiasHabiles < 20) {
        fechaActual.setDate(fechaActual.getDate() + 1);
        const diaSemana = fechaActual.getDay();

        // Comprobar si es fin de semana o día no laboral
        const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
        const esNoLaboral = diasNoLaboralesSet.has(dayjs(fechaActual).format('YYYY-MM-DD'));

        if (!esFinDeSemana && !esNoLaboral) {
            contadorDiasHabiles++;
        }
    }
    return fechaActual;
};

function ReprogramarTurnoComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [turnoDetails, setTurnoDetails] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [finalDate, setFinalDate] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [slotsError, setSlotsError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [diasNoLaborales, setDiasNoLaborales] = useState([]);

    const turnoInfo = useMemo(() => ({
        turnoId: searchParams.get('turnoId'),
        userId: searchParams.get('userId'),
        mascotaId: searchParams.get('mascotaId'),
    }), [searchParams]);

    useEffect(() => {
        async function fetchInitialData() {
            if (!turnoInfo.turnoId) {
                setError('Información inválida para la reprogramación.');
                setLoading(false);
                return;
            }
            
            const [detailsResult, diasResult] = await Promise.all([
                getTurnoDetailsForReprogramming(turnoInfo),
                getDiasNoLaborales()
            ]);

            if (detailsResult.success) {
                setTurnoDetails(detailsResult.data);
            } else {
                setError(detailsResult.error);
            }

            if (diasResult.success) {
                setDiasNoLaborales(diasResult.data.map(d => new Date(`${d}T00:00:00`)));
            }
            setLoading(false);
        }

        fetchInitialData();
    }, [turnoInfo]);

    // --- ¡LÓGICA DEL CALENDARIO ACTUALIZADA! ---
    const disabledDays = useMemo(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Se calcula la fecha límite usando la nueva función auxiliar
        const fechaLimite = calcularFechaLimite(diasNoLaborales);

        return [
            ...diasNoLaborales,
            { before: tomorrow }, // No se puede reprogramar para hoy o días pasados
            { dayOfWeek: [0, 6] }, // Domingo y Sábado
            { after: fechaLimite } // No se puede reprogramar después de 20 días hábiles
        ];
    }, [diasNoLaborales]);

    const handleDaySelect = async (day, selectedDay, modifiers) => {
        if (!day || modifiers.disabled) {
            return; 
        }

        setSelectedDay(day);
        setSelectedTime(null);
        setFinalDate(null);
        setAvailableSlots([]); 
        setSlotsError(null);
        setSlotsLoading(true);

        const result = await getAvailableSlotsForReprogramming({
            fecha: dayjs(day).format('YYYY-MM-DD'),
            tipo: turnoDetails.tipo,
            necesitaTraslado: turnoDetails.necesitaTraslado,
            mascota: turnoDetails.mascota,
            turnoId: turnoInfo.turnoId,
        });
        
        if (result.success) {
            setAvailableSlots(result.data.horarios);
            if (result.data.horarios.length === 0) {
                 setSlotsError("No hay horarios disponibles para este día.")
            }
        } else {
            setSlotsError(result.error);
        }
        setSlotsLoading(false);
    };

    const handleTimeSelect = (time) => {
        setSelectedTime(time);
        if (selectedDay) {
            const newFullDate = new Date(selectedDay);
            if (turnoDetails.tipo === 'clinica') {
                 const [hours, minutes] = time.split(':').map(Number);
                 newFullDate.setHours(hours, minutes, 0, 0);
            } else {
                const hour = time === 'mañana' ? 9 : 14;
                newFullDate.setHours(hour, 0, 0, 0);
            }
            setFinalDate(newFullDate);
        }
    };
    
    const handleReprogramar = async () => {
        if (!finalDate) return;
        setLoading(true);
        setError(null);
        const result = await reprogramarTurnoPorUsuario({ ...turnoInfo, nuevaFecha: finalDate.toISOString() });
        if (result.success) {
            setSuccess(true);
            toast.success('¡Turno reprogramado con éxito!');
            setTimeout(() => router.push('/turnos/mis-turnos'), 2000);
        } else {
            setError(result.error);
            toast.error(result.error);
        }
        setLoading(false);
     };

    if (loading && !turnoDetails) { return <div className="flex justify-center items-center h-64"><Spinner/></div>; }
    if (error && !success) { return ( <div className="text-center text-red-500 bg-red-100 p-6 rounded-lg max-w-lg mx-auto"><h2 className="font-bold text-xl mb-2">Error</h2><p>{error}</p><button onClick={() => router.back()} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">Volver</button></div> ); }
    if (success) { return ( <div className="text-center text-green-700 bg-green-100 p-6 rounded-lg max-w-lg mx-auto"><h2 className="font-bold text-xl mb-2">¡Éxito!</h2><p>Tu turno ha sido reprogramado. Serás redirigido...</p></div> ); }
    if (!turnoInfo.turnoId || !turnoDetails) { return <div className="flex justify-center items-center h-64"><Spinner/></div>; }

    return (
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
            <div className="mb-6">
                <Link href="/turnos/mis-turnos">
                    <span className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer">
                        <FaArrowLeft className="mr-2" />
                        Volver a Mis Turnos
                    </span>
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reprogramar Turno</h1>
            <p className="text-gray-600 mb-8">Servicio de <span className="font-semibold">{turnoDetails.tipo}</span> para <span className="font-semibold">{turnoDetails.mascota.nombre}</span>.</p>
            
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                     <h2 className="font-semibold text-lg mb-4 text-center">1. Elige el nuevo día</h2>
                     <DayPicker mode="single" selected={selectedDay} onSelect={handleDaySelect} locale={es} disabled={disabledDays} className="rounded-md border mx-auto"/>
                </div>
                
                <div className="flex-1">
                    <h2 className="font-semibold text-lg mb-4 text-center">2. Elige la nueva hora</h2>
                    <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-2">
                        {slotsLoading && <div className="col-span-3 flex justify-center items-center h-24"><Spinner/></div>}
                        {!slotsLoading && availableSlots.length > 0 && availableSlots.map(time => (
                            <button key={time} onClick={() => handleTimeSelect(time)} disabled={!selectedDay} className={`p-2 rounded-lg border text-sm font-semibold transition ${selectedTime === time ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:border-blue-500'}`}>
                                {time}{turnoDetails.tipo === 'clinica' ? ' hs' : ''}
                            </button>
                        ))}
                         {!slotsLoading && selectedDay && slotsError && <p className="col-span-3 text-center text-sm text-red-500 bg-red-50 p-2 rounded-md">{slotsError}</p>}
                    </div>
                </div>
            </div>
            
            <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-700">Fecha y hora seleccionada:</h3>
                <p className="text-blue-600 font-bold text-xl mb-6 h-8 capitalize">
                    {finalDate ? dayjs(finalDate).format('dddd, D [de] MMMM [a las] HH:mm [hs]') : 'Por favor, elige día y hora'}
                </p>
                <button onClick={handleReprogramar} disabled={!finalDate || loading} className="w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-600 transition disabled:bg-gray-400 flex items-center justify-center text-lg">
                    {loading ? <Spinner small/> : 'Confirmar Reprogramación'}
                </button>
            </div>
        </div>
    );
}

export default function ReprogramarTurnoPage() {
    return (
        <Suspense fallback={<div className="text-center p-10"><Spinner/> Cargando...</div>}> 
            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <ReprogramarTurnoComponent />
            </main>
        </Suspense>
    );
}
