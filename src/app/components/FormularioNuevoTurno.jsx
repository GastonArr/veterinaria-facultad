'use client'

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { solicitarTurno } from '@/lib/actions/turnos.actions.js';
import toast, { Toaster } from 'react-hot-toast';
import { FaDog, FaStethoscope, FaCut, FaCalendarAlt, FaClock, FaUsers, FaCheckCircle, FaTruck } from 'react-icons/fa';

// --- CONFIGURACIÓN DE TURNOS ---
const VETERINARIOS_DISPONIBLES = 2;
const horariosConsulta = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];
const horariosPeluqueria = [ '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00' ];

// --- COMPONENTE PRINCIPAL ---
export default function FormularioNuevoTurno({ mascotas, ocupacion }) {
    const router = useRouter();
    const [tipoTurno, setTipoTurno] = useState('consulta'); // 'consulta' o 'peluqueria'
    
    // Estados del formulario
    const [mascotaId, setMascotaId] = useState('');
    const [selectedMascotasPeluqueria, setSelectedMascotasPeluqueria] = useState([]);
    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('');
    const [incluirTransporte, setIncluirTransporte] = useState(false);

    // Estados de UI
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- FILTRADO Y MEMOIZACIÓN ---
    const perros = useMemo(() => mascotas.filter(m => m.especie.toLowerCase() === 'perro'), [mascotas]);

    useEffect(() => {
        if (tipoTurno === 'consulta') {
            if(mascotas.length > 0) setMascotaId(mascotas[0].id);
            setSelectedMascotasPeluqueria([]);
        } else {
            setMascotaId('');
        }
        setError('');
        setHora('');
    }, [tipoTurno, mascotas]);

    const hoy = new Date().toISOString().split('T')[0];

    // --- LÓGICA DE HORARIOS ---
    const horariosDisponibles = useMemo(() => {
        if (!fecha) return [];
        const ocupacionFecha = ocupacion[fecha] || {};

        if (tipoTurno === 'consulta') {
            return horariosConsulta.filter(h => (ocupacionFecha[h] || 0) < VETERINARIOS_DISPONIBLES);
        }
        // Lógica para peluquería
        return horariosPeluqueria.filter(h => (ocupacionFecha[h] || 0) < 1);

    }, [fecha, tipoTurno, ocupacion]);

    // --- MANEJADORES DE EVENTOS ---
    const handlePeluqueriaMascotaSelect = (id) => {
        setSelectedMascotasPeluqueria(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones
        if ((tipoTurno === 'consulta' && !mascotaId) || (tipoTurno === 'peluqueria' && selectedMascotasPeluqueria.length === 0)) {
            setError('Por favor, selecciona al menos una mascota.');
            return;
        }
        if (!fecha || !hora) {
            setError('Por favor, completa la fecha y la hora.');
            return;
        }

        // Validar cupos para peluquería
        if (tipoTurno === 'peluqueria') {
            const cuposOcupados = ocupacion[fecha]?.[hora] || 0;
            if (selectedMascotasPeluqueria.length > (1 - cuposOcupados)) {
                setError(`No hay suficientes cupos para ${selectedMascotasPeluqueria.length} perro(s) a las ${hora}. Cupos disponibles: ${1 - cuposOcupados}.`);
                return;
            }
        }

        setError('');
        setIsSubmitting(true);
        const toastId = toast.loading('Reservando tu turno...');

        const formData = {
            fecha,
            hora,
            tipo: tipoTurno,
            transporte: incluirTransporte,
            ...(tipoTurno === 'consulta' ? { mascotaId } : { mascotaIds: selectedMascotasPeluqueria }),
        };

        const result = await solicitarTurno(formData);

        setIsSubmitting(false);
        if (result.error) {
            toast.error(result.error, { id: toastId });
            setError(result.error);
        } else {
            toast.success('¡Turno reservado con éxito!', { id: toastId });
            router.push('/mis-turnos');
        }
    };

    // --- RENDERIZADO ---
    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            <Toaster position="top-center" reverseOrder={false} />
            
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Tipo de Servicio</h2>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setTipoTurno('consulta')} className={`flex items-center justify-center p-6 rounded-lg transition-all duration-300 border-2 ${tipoTurno === 'consulta' ? 'bg-indigo-50 border-indigo-500 shadow-lg' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'}`}>
                        <FaStethoscope className={`mr-3 h-6 w-6 ${tipoTurno === 'consulta' ? 'text-indigo-600' : 'text-gray-500'}`} />
                        <span className={`font-bold ${tipoTurno === 'consulta' ? 'text-indigo-800' : 'text-gray-700'}`}>Consulta</span>
                    </button>
                    <button onClick={() => setTipoTurno('peluqueria')} className={`flex items-center justify-center p-6 rounded-lg transition-all duration-300 border-2 ${tipoTurno === 'peluqueria' ? 'bg-teal-50 border-teal-500 shadow-lg' : 'bg-gray-50 border-gray-200 hover:border-teal-300'}`}>
                        <FaCut className={`mr-3 h-6 w-6 ${tipoTurno === 'peluqueria' ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className={`font-bold ${tipoTurno === 'peluqueria' ? 'text-teal-800' : 'text-gray-700'}`}>Peluquería</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
                {error && <p className="text-red-600 font-semibold text-center bg-red-50 p-3 rounded-lg animate-slideIn">{error}</p>}
                
                {/* --- SELECCIÓN DE MASCOTA --- */}
                <div className="animate-slideIn" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">Tu Mascota</h3>
                    {tipoTurno === 'consulta' ? (
                        <select value={mascotaId} onChange={(e) => setMascotaId(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                            {mascotas.length > 0 ? mascotas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>
                            )) : <option>No tienes mascotas registradas</option>}
                        </select>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {perros.map(p => (
                                <div key={p.id} onClick={() => handlePeluqueriaMascotaSelect(p.id)} className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedMascotasPeluqueria.includes(p.id) ? 'bg-teal-50 border-teal-500 shadow-md' : 'bg-white border-gray-200 hover:border-teal-400'}`}>
                                    <FaDog className={`h-8 w-8 mb-2 ${selectedMascotasPeluqueria.includes(p.id) ? 'text-teal-600' : 'text-gray-400'}`} />
                                    <span className="font-semibold text-gray-800 text-center">{p.nombre}</span>
                                    {selectedMascotasPeluqueria.includes(p.id) && <FaCheckCircle className="absolute top-2 right-2 text-teal-500 h-5 w-5" />}
                                </div>
                            ))}
                            {perros.length === 0 && <p className="col-span-full text-center text-gray-500">No tienes perros registrados para peluquería.</p>}
                        </div>
                    )}
                </div>

                {/* --- SELECCIÓN DE FECHA Y HORA --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slideIn" style={{ animationDelay: '200ms' }}>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center"><FaCalendarAlt className="mr-2 text-gray-500"/>Fecha</h3>
                        <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setHora(''); }} min={hoy} className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                         <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center"><FaClock className="mr-2 text-gray-500"/>Hora</h3>
                        {fecha ? (
                            horariosDisponibles.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {horariosDisponibles.map(h => {
                                        const ocupacionFecha = ocupacion[fecha] || {};
                                        const cuposOcupados = ocupacionFecha[h] || 0;
                                        const cuposMax = tipoTurno === 'consulta' ? VETERINARIOS_DISPONIBLES : 1;
                                        const disponible = cuposOcupados < cuposMax;

                                        return (
                                            <button key={h} type="button" onClick={() => disponible && setHora(h)} disabled={!disponible} className={`p-3 rounded-lg text-center font-semibold transition-all duration-200 border ${hora === h ? 'bg-indigo-600 text-white shadow-lg border-transparent' : disponible ? 'bg-gray-100 text-gray-800 hover:bg-indigo-100 border-gray-200' : 'bg-red-100 text-red-500 cursor-not-allowed border-red-200'}`}>
                                                {h}
                                                <div className="text-xs mt-1 opacity-80">{tipoTurno === 'consulta' ? `${cuposMax - cuposOcupados}/${cuposMax}` : disponible ? 'Disp.' : 'Ocup.'}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : <p className="text-center text-yellow-700 font-semibold bg-yellow-50 p-4 rounded-lg">No hay horarios para este día.</p>
                        ) : <p className="text-center text-gray-500 font-semibold bg-gray-50 p-4 rounded-lg">Elige una fecha</p>}
                    </div>
                </div>

                {/* --- OPCIONES ADICIONALES --- */}
                 <div className="animate-slideIn" style={{ animationDelay: '300ms' }}>
                    <div onClick={() => setIncluirTransporte(!incluirTransporte)} className={`flex items-center justify-between p-5 rounded-lg cursor-pointer transition-all duration-300 border-2 ${incluirTransporte ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center">
                             <FaTruck className={`mr-4 h-7 w-7 ${incluirTransporte ? 'text-blue-600' : 'text-gray-400'}`} />
                             <div>
                                 <h4 className="font-bold text-gray-800">¿Necesitas transporte?</h4>
                                 <p className="text-sm text-gray-600">Servicio puerta a puerta para tu comodidad.</p>
                             </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${incluirTransporte ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                            {incluirTransporte && <FaCheckCircle className="text-white h-4 w-4"/>}
                        </div>
                     </div>
                </div>

                {/* --- BOTÓN DE ENVÍO --- */}
                <div className="pt-6 animate-slideIn" style={{ animationDelay: '400ms' }}>
                    <button type="submit" disabled={isSubmitting || !hora || (tipoTurno === 'peluqueria' && selectedMascotasPeluqueria.length === 0) || (tipoTurno === 'consulta' && !mascotaId)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-4 rounded-lg shadow-xl hover:shadow-2xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:-translate-y-1 transition-all duration-300">
                        {isSubmitting ? 'Reservando...' : 'Confirmar Turno'}
                    </button>
                </div>
            </form>
        </div>
    );
}
