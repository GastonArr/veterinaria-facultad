'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTurnoWizard } from '../TurnoWizardContext';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import { FaStethoscope, FaCut, FaSun, FaMoon, FaTruck, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getAvailableSlotsForNewTurno, verificarDisponibilidadTrasladoAction } from '@/lib/actions/turnos.actions';


const HorarioClinicaSelector = ({ horariosDisponibles, fecha, hora, onFechaChange, onHoraChange, disabledDays, modifiers, modifiersStyles, isLoading, error }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="flex justify-center">
             <DayPicker mode="single" selected={fecha} onSelect={onFechaChange} locale={es} disabled={disabledDays} modifiers={modifiers} modifiersStyles={modifiersStyles} styles={{ caption: { color: '#1d4ed8' }, head: { color: '#3b82f6'} }}/>
        </div>
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-4">Horario</label>
            {fecha ? (
                isLoading ? <div className="flex justify-center items-center p-4"><FaSpinner className="animate-spin text-2xl text-blue-500" /></div> :
                error ? <div className="text-center text-red-700 bg-red-50 p-3 rounded-lg text-sm">{error}</div> :
                horariosDisponibles.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {horariosDisponibles.map(h => (
                            <button key={h} type="button" onClick={() => onHoraChange(h)} className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 border ${hora === h ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:bg-blue-100'}`}>{h}</button>
                        ))}
                    </div>
                ) : <div className="text-center text-yellow-700 bg-yellow-50 p-3 rounded-lg text-sm">No hay horarios disponibles para este día.</div>
            ) : <div className="text-center text-gray-500 bg-gray-100 p-3 rounded-lg text-sm">Elige una fecha para ver los horarios</div>}
        </div>
    </div>
);

const HorarioPeluqueriaSelector = ({ fecha, turno, onFechaChange, onTurnoChange, disabledDays, modifiers, modifiersStyles }) => (
     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="flex justify-center">
             <DayPicker mode="single" selected={fecha} onSelect={onFechaChange} locale={es} disabled={disabledDays} modifiers={modifiers} modifiersStyles={modifiersStyles} styles={{ caption: { color: '#16a34a' }, head: { color: '#22c55e'} }}/>
        </div>
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-4">Turno</label>
            {fecha ? (
                <div className="flex gap-4">
                    <button type="button" onClick={() => onTurnoChange('mañana')} className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${turno === 'mañana' ? 'border-green-500 bg-green-50' : ''}`}><FaSun /> Mañana</button>
                    <button type="button" onClick={() => onTurnoChange('tarde')} className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${turno === 'tarde' ? 'border-green-500 bg-green-50' : ''}`}><FaMoon /> Tarde</button>
                </div>
            ) : <div className="text-center text-gray-500 bg-gray-100 p-3 rounded-lg text-sm">Elige una fecha para ver los turnos</div>}
        </div>
    </div>
);

export default function Paso4() {
    const { 
        selectedMascotas,
        motivosPorMascota, 
        horarioClinica, setHorarioClinica,
        horarioPeluqueria, setHorarioPeluqueria,
        necesitaTraslado, setNecesitaTraslado,
        diasNoLaborales,
        nextStep
    } = useTurnoWizard();

    const [horariosDisponiblesClinica, setHorariosDisponiblesClinica] = useState([]);
    const [loadingHorarios, setLoadingHorarios] = useState(false);
    const [errorHorarios, setErrorHorarios] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const numMascotasClinica = useMemo(() => selectedMascotas.filter(m => motivosPorMascota[m.id]?.clinica).length, [selectedMascotas, motivosPorMascota]);
    const necesitaHorarioClinica = numMascotasClinica > 0;
    const necesitaHorarioPeluqueria = useMemo(() => selectedMascotas.some(m => motivosPorMascota[m.id]?.peluqueria), [selectedMascotas, motivosPorMascota]);

    useEffect(() => {
        const fetchHorarios = async () => {
            if (!horarioClinica.fecha || numMascotasClinica === 0) {
                setHorariosDisponiblesClinica([]);
                return;
            }
            
            setLoadingHorarios(true);
            setErrorHorarios(null);
            
            try {
                const result = await getAvailableSlotsForNewTurno({
                    fecha: horarioClinica.fecha.toISOString().split('T')[0],
                    tipo: 'clinica',
                    numMascotas: numMascotasClinica
                });

                if (result.success) {
                    setHorariosDisponiblesClinica(result.data.horarios);
                } else {
                    setErrorHorarios(result.error || "No se pudo cargar la disponibilidad.");
                    setHorariosDisponiblesClinica([]);
                }
            } catch (error) {
                setErrorHorarios("Error de red al buscar horarios.");
                setHorariosDisponiblesClinica([]);
            } finally {
                setLoadingHorarios(false);
            }
        };

        fetchHorarios();
    }, [horarioClinica.fecha, numMascotasClinica]);

    const disabledDays = useMemo(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0,0,0,0);

        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 15);
        
        return [
            ...diasNoLaborales,
            { before: tomorrow },
            { after: twoWeeksFromNow },
            { dayOfWeek: [0, 6] }
        ];
    }, [diasNoLaborales]);
    
    const modifiers = { noLaboral: diasNoLaborales };
    const modifiersStyles = { noLaboral: { color: 'white', backgroundColor: '#ef4444', borderRadius: '50%'} };

    const isStepComplete = (!necesitaHorarioClinica || (horarioClinica.fecha && horarioClinica.hora)) && 
                           (!necesitaHorarioPeluqueria || (horarioPeluqueria.fecha && horarioPeluqueria.turno));

    const handleNext = async () => {
        if (necesitaTraslado) {
            setIsSubmitting(true);
            const fechaPeluqueria = necesitaHorarioPeluqueria ? horarioPeluqueria.fecha : null;
            const mascotasParaTraslado = selectedMascotas
                .filter(m => motivosPorMascota[m.id]?.peluqueria)
                .map((mascota) => ({
                    id: mascota.id,
                    nombre: mascota.nombre,
                    tamaño: mascota.tamaño,
                }));

            if (fechaPeluqueria && mascotasParaTraslado.length > 0) {
                 const result = await verificarDisponibilidadTrasladoAction({
                    fecha: fechaPeluqueria.toISOString().split('T')[0],
                    nuevasMascotas: mascotasParaTraslado
                });
                
                if (!result.success) {
                    toast.error(result.error);
                    setIsSubmitting(false);
                    return; 
                }
            }
            setIsSubmitting(false);
        }
        nextStep();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-8">Paso 4: Elige los horarios y traslado</h2>
            <div className="space-y-8">
                {necesitaHorarioClinica && (
                    <div className="bg-gray-50 p-6 rounded-xl border">
                        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
                            <FaStethoscope className="text-blue-500"/>Turno de Clínica
                        </h3>
                        <HorarioClinicaSelector 
                            horariosDisponibles={horariosDisponiblesClinica} 
                            fecha={horarioClinica.fecha} 
                            hora={horarioClinica.hora} 
                            onFechaChange={(fecha) => setHorarioClinica(p => ({ ...p, fecha, hora: '' }))} 
                            onHoraChange={(hora) => setHorarioClinica(p => ({ ...p, hora }))} 
                            disabledDays={disabledDays} 
                            modifiers={modifiers} 
                            modifiersStyles={modifiersStyles} 
                            isLoading={loadingHorarios} 
                            error={errorHorarios} 
                        />
                        <div className="mt-4 text-center text-sm text-gray-500 bg-gray-200 p-2 rounded">
                            Por traslados para turnos de clínica, por favor comuníquese directamente con la veterinaria.
                        </div>
                    </div>
                )}
                {necesitaHorarioPeluqueria && (
                    <div className="bg-gray-50 p-6 rounded-xl border">
                        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
                            <FaCut className="text-green-500"/>Turno de Peluquería
                        </h3>
                        <HorarioPeluqueriaSelector 
                            fecha={horarioPeluqueria.fecha} 
                            turno={horarioPeluqueria.turno} 
                            onFechaChange={(fecha) => setHorarioPeluqueria(p => ({ ...p, fecha, turno: ''}))} 
                            onTurnoChange={(turno) => setHorarioPeluqueria(p => ({...p, turno}))} 
                            disabledDays={disabledDays} 
                            modifiers={modifiers} 
                            modifiersStyles={modifiersStyles} 
                        />
                         <div className="p-4 border rounded-lg mt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <FaTruck className="text-2xl text-gray-600 mr-3"/>
                                    <span className="font-bold text-gray-700">¿Necesitas traslado?</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setNecesitaTraslado(!necesitaTraslado)} 
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 ${necesitaTraslado ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full ${necesitaTraslado ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 sm:p-6 border-t flex justify-end mt-8">
                <button 
                    onClick={handleNext}
                    disabled={!isStepComplete || isSubmitting}
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50">
                    {isSubmitting ? <FaSpinner className="animate-spin"/> : 'Siguiente'}
                </button>
            </div>
        </div>
    );
}
