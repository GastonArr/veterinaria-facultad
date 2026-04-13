'use client';

import { useEffect, useState, use, useTransition } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, addDoc } from 'firebase/firestore';
import SubHeader from '@/app/components/SubHeader';
import { FaSyringe, FaCalendarAlt, FaPlus, FaFileMedical, FaDog, FaCut, FaStethoscope, FaInfoCircle, FaTimes, FaHeartbeat, FaShieldAlt } from 'react-icons/fa';

// --- COMPONENTES DE DISEÑO --- //

const formatDateRobust = (fechaData) => {
    if (!fechaData) return 'Fecha no disponible';
    try {
        if (typeof fechaData.toDate === 'function') {
            return fechaData.toDate().toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        if (fechaData instanceof Date && !isNaN(fechaData)) {
            return fechaData.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (typeof fechaData === 'string') {
            const d = new Date(fechaData);
            if (!isNaN(d)) return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        return 'Fecha inválida';
    } catch {
        return 'Fecha desconocida';
    }
};

const PetProfileHeader = ({ mascota }) => {
    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-8 shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-4 ${mascota.enAdopcion ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-blue-400 to-indigo-400'}`}></div>

            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-50 border-4 border-white shadow-md flex items-center justify-center text-4xl mt-3 md:mt-2 shrink-0">
                {mascota.especie?.toLowerCase() === 'gato' ? '🐱' : '🐶'}
            </div>

            <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{mascota.nombre}</h1>
                    {mascota.enAdopcion && (
                        <span className="inline-flex items-center mx-auto md:mx-0 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest shadow-sm border border-emerald-200">
                            <FaHeartbeat className="mr-1.5" /> En Adopción
                        </span>
                    )}
                </div>

                <p className="text-slate-500 font-medium text-sm md:text-base">
                    <span className="capitalize">{mascota.especie || 'Mascota'}</span>
                    {mascota.raza && <span className="opacity-75"> • {mascota.raza}</span>}
                    {mascota.sexo && <span className="opacity-75"> • {mascota.sexo}</span>}
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                    {mascota.fechaNacimiento && (
                        <div className="flex items-center text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                            <FaCalendarAlt className="mr-2 text-slate-400" />
                            Nació: {formatDateRobust(mascota.fechaNacimiento)}
                        </div>
                    )}
                    {mascota.peso && (
                        <div className="flex items-center text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                            <span className="mr-2 text-slate-400">⚖️</span>
                            {mascota.peso}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdoptionCandidates = ({ mascota }) => {
    if (!mascota.enAdopcion || !mascota.candidatos || mascota.candidatos.length === 0) return null;

    return (
        <div className="bg-emerald-50 rounded-3xl p-6 md:p-8 mb-8 border border-emerald-200 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-8 opacity-[0.03] pointer-events-none transform -rotate-12">
                <FaHeartbeat className="text-[12rem] text-emerald-900" />
            </div>

            <h3 className="text-xl font-black text-emerald-900 mb-4 flex items-center gap-2 relative z-10">
                <span className="bg-emerald-200 p-2 rounded-xl text-emerald-700">🏠</span>
                Postulantes para adoptar a {mascota.nombre}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {mascota.candidatos.map((c, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)] flex flex-col justify-between hover:-translate-y-1 transition-transform">
                        <div className="mb-2">
                            <p className="font-bold text-slate-800 text-base">{c.nombre}</p>
                            <p className="text-emerald-600 font-bold text-sm flex items-center gap-1.5 mt-1">
                                📞 <a href={`https://wa.me/${c.telefono?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">{c.telefono}</a>
                            </p>
                        </div>
                        <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider mt-2 border-t border-slate-100 pt-2">
                            Postulado el {new Date(c.fecha).toLocaleDateString('es-AR')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PREVENTATIVE_CARE = [
    { id: 'quintuple', name: 'Vacuna Quíntuple', defaultDays: 365, keywords: ['quintuple', 'quíntuple', 'sextuple', 'múltiple', 'moquillo', 'parvovirus'] },
    { id: 'antirrabica', name: 'Antirrábica', defaultDays: 365, keywords: ['antirrabic', 'antirrábic', 'rabia'] },
    { id: 'interna', name: 'Desparasitación', defaultDays: 90, keywords: ['desparasit', 'fenbendazol', 'praziquantel', 'interno', 'interna'] },
    { id: 'externa', name: 'Antipulgas', defaultDays: 30, keywords: ['pulga', 'garrapata', 'pipeta', 'bravecto', 'nexgard', 'simparica'] }
];

const calculateCareStatus = (carnet) => {
    let status = { antirrabica: null, quintuple: null, interna: null, externa: null };

    // carnet ya viene ordenado del más nuevo al más viejo
    carnet.forEach(entry => {
        const dateStr = entry.fechaOriginal || entry.fechaCreacion;
        const entryDate = typeof dateStr?.toDate === 'function' ? dateStr.toDate() : new Date(dateStr);
        if (isNaN(entryDate)) return;

        const checkMatch = (text, categoryDays) => {
            if (!text) return;
            const lower = String(text).toLowerCase();

            for (let care of PREVENTATIVE_CARE) {
                if (status[care.id]) continue; // Solo nos importa el más reciente

                if (care.keywords.some(kw => lower.includes(kw))) {
                    let daysValid = care.defaultDays;
                    // Ajustes específicos según producto para Antipulgas si no trae días
                    if (care.id === 'externa' && !categoryDays) {
                        if (lower.includes('bravecto')) daysValid = 90;
                        else daysValid = 30; // pipeta/nexgard standard
                    } else if (categoryDays) {
                        daysValid = parseInt(categoryDays, 10);
                    }

                    const expirationDate = new Date(entryDate);
                    expirationDate.setDate(expirationDate.getDate() + daysValid);
                    const isExpired = expirationDate < new Date();

                    status[care.id] = {
                        dateApplied: entryDate,
                        expirationDate,
                        isExpired
                    };
                }
            }
        };

        if (entry.medicamentos) {
            entry.medicamentos.forEach(med => {
                checkMatch(med.nombre, med.se_aplica_cada_dias);
                checkMatch(med.descripcion, med.se_aplica_cada_dias);
            });
        }
        checkMatch(entry.descripcion);
        checkMatch(entry.servicio);
        checkMatch(entry.tipo);
    });

    return status;
};

const CareDashboard = ({ carnet }) => {
    const statusObj = calculateCareStatus(carnet);

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-8 shadow-sm border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl">
                    <FaShieldAlt className="text-xl" />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Esquema de Prevención</h3>
                    <p className="text-sm font-medium text-slate-500">Estado de inmunidad y parasitario al día de hoy.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {PREVENTATIVE_CARE.map(care => {
                    const data = statusObj[care.id];
                    let bgColor = 'bg-slate-50 border border-slate-200 text-slate-500';
                    let dotColor = 'bg-slate-300';
                    let statusTitle = 'Semáforo Apagado';
                    let statusText = 'Sin Registro';
                    let dateText = 'Nunca aplicado / No hay datos';

                    if (data) {
                        if (data.isExpired) {
                            bgColor = 'bg-red-50 border border-red-200 text-red-800 hover:bg-red-100';
                            dotColor = 'bg-red-500 animate-pulse outline outline-4 outline-red-500/20';
                            statusTitle = 'Requiere Atención';
                            statusText = 'VENCIDO';
                            dateText = `Venció el: ${formatDateRobust(data.expirationDate)}`;
                        } else {
                            bgColor = 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100';
                            dotColor = 'bg-emerald-500 outline outline-4 outline-emerald-500/20';
                            statusTitle = 'Protegido';
                            statusText = 'AL DÍA';
                            dateText = `Próxima dosis: ${formatDateRobust(data.expirationDate)}`;
                        }
                    }

                    return (
                        <div key={care.id} className={`p-4 md:p-5 rounded-2xl transition-colors flex flex-col justify-between h-full ${bgColor}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-extrabold text-[0.8rem] uppercase tracking-wide leading-tight px-1">{care.name}</span>
                                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${dotColor}`}></span>
                            </div>
                            <div>
                                <p className="font-black text-lg md:text-xl tracking-tight mb-0.5">{statusText}</p>
                                <p className="text-[0.7rem] md:text-xs font-bold opacity-75 leading-tight">{dateText}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const CarnetEntryCard = ({ entry }) => {
    const typeInfo = {
        'Visita Clínica': { icon: <FaStethoscope />, color: 'blue', bg: 'bg-blue-500', iconColor: 'text-white' },
        'Peluquería': { icon: <FaCut />, color: 'purple', bg: 'bg-purple-500', iconColor: 'text-white' },
        'Vacunación': { icon: <FaSyringe />, color: 'emerald', bg: 'bg-emerald-500', iconColor: 'text-white' },
        'Otro': { icon: <FaHeartbeat />, color: 'rose', bg: 'bg-rose-500', iconColor: 'text-white' },
        'default': { icon: <FaDog />, color: 'slate', bg: 'bg-slate-500', iconColor: 'text-white' },
    };
    const { icon, bg, iconColor } = typeInfo[entry.tipo] || typeInfo.default;

    return (
        <div className="relative pl-8 sm:pl-10 pb-2">
            {/* Círculo del Timeline certrado en la línea */}
            <div className={`absolute -left-[17px] sm:-left-[17px] top-5 w-9 h-9 rounded-full border-4 border-slate-50 ${bg} ${iconColor} shadow-md flex items-center justify-center z-10 transition-transform hover:scale-110`}>
                <div className="text-sm">{icon}</div>
            </div>

            <div className="group relative bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5">
                    <div>
                        <h4 className="font-black text-xl text-slate-800 tracking-tight">{entry.tipo}</h4>
                        {entry.isTurno && (
                            <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold tracking-wide border border-slate-200/50">
                                {entry.servicio}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
                        <FaCalendarAlt className="text-slate-400" />
                        {formatDateRobust(entry.fechaOriginal || entry.fechaCreacion)}
                    </span>
                </div>

                <div className="text-sm text-slate-700">
                    {entry.isTurno ? (
                        <div className="space-y-4">
                            {entry.comentario && (
                                <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50/30 p-5 rounded-2xl border border-blue-100 tracking-wide">
                                    <div className="flex items-start gap-3">
                                        <FaStethoscope className="text-blue-500/80 mt-0.5 shrink-0 text-xl" />
                                        <div>
                                            <p className="font-extrabold text-blue-900 mb-1.5 text-xs uppercase tracking-widest opacity-80">Parte Médico</p>
                                            <p className="text-slate-800 font-medium leading-relaxed">"{entry.comentario}"</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {entry.medicamentos && entry.medicamentos.length > 0 && (
                                <div className="mt-5 border-t border-slate-100 pt-5">
                                    <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3">Tratamientos Asociados</p>
                                    <div className="flex flex-wrap gap-2">
                                        {entry.medicamentos.map((med, idx) => (
                                            <span key={idx} className="bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 shadow-sm flex items-center gap-1.5 transition-colors hover:bg-emerald-100">
                                                💊 {med.nombre}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-line">{entry.descripcion}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NotasAdicionales = ({ mascota, onUpdate }) => {
    const [isPending, startTransition] = useTransition();
    const handleUpdate = (notas) => {
        startTransition(() => {
            onUpdate({ notas });
        });
    };

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-6 md:p-8 rounded-3xl mb-8 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="absolute -right-4 -top-8 opacity-5 pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
                <FaInfoCircle className="text-[12rem] text-amber-900" />
            </div>

            <h3 className="text-lg md:text-xl font-black text-amber-900 mb-3 flex items-center gap-2">
                <FaInfoCircle className="text-amber-500 text-xl md:text-2xl" />
                <span>Información Crítica del Dueño</span>
            </h3>
            <textarea
                defaultValue={mascota.notas || ''}
                onBlur={(e) => handleUpdate(e.target.value)}
                disabled={isPending}
                rows="2"
                className="w-full text-sm font-medium text-slate-800 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-200/80 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 transition-all shadow-inner disabled:opacity-50 relative z-10 resize-y"
                placeholder="Alergias severas, medicación constante, cirugías pasadas..."
            />
        </div>
    );
};

// --- MODAL (Añadir Manual) --- //
const AddEntryModal = ({ isOpen, onClose, onSubmit }) => {
    if (!isOpen) return null;
    const [tipo, setTipo] = useState('Vacunación');
    const [descripcion, setDescripcion] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!descripcion) return alert("La descripción es obligatoria.");
        startTransition(() => {
            onSubmit({ tipo, descripcion });
            onClose();
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md transform transition-all border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Registro</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-full transition-colors"><FaTimes /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2 text-sm">Categoría</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-4 text-sm font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                            <option>Vacunación</option>
                            <option>Visita Clínica</option>
                            <option>Peluquería</option>
                            <option>Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold mb-2 text-sm">Detalles</label>
                        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="4" className="w-full text-sm font-medium p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="Añade la marca de la vacuna o detalles de la intervención..."></textarea>
                    </div>
                    <button type="submit" disabled={isPending} className="w-full bg-slate-900 text-white py-4 rounded-2xl hover:bg-blue-600 transition-colors font-black shadow-lg disabled:opacity-50 mt-4 text-sm tracking-wide uppercase">
                        {isPending ? 'Guardando...' : 'Añadir al Historial'}
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- VISTA PRINCIPAL --- //
export default function CarnetSanitarioPage({ params }) {
    const { mascotaId } = use(params);
    const { user } = useAuth();

    const [mascota, setMascota] = useState(null);
    const [carnet, setCarnet] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const fetchData = async () => {
        if (!user?.uid || !mascotaId) return;
        if (!loading) setLoading(true);
        try {
            const mascotaRef = doc(db, 'users', user.uid, 'mascotas', mascotaId);
            const mascotaSnap = await getDoc(mascotaRef);
            if (mascotaSnap.exists()) setMascota({ id: mascotaSnap.id, ...mascotaSnap.data() });
            else throw new Error("No se encontró la mascota.");

            // 1. Entradas manuales
            const carnetRef = collection(mascotaRef, 'carnetSanitario');
            const q = query(carnetRef, orderBy('fechaCreacion', 'desc'));
            const carnetSnapshot = await getDocs(q);
            const manualEntries = carnetSnapshot.docs.map(doc => ({ id: doc.id, isTurno: false, ...doc.data() }));

            // 2. Entradas automatizadas (Turnos)
            const turnosRef = collection(mascotaRef, 'turnos');
            const turnosSnapshot = await getDocs(turnosRef);
            const turnosEntries = turnosSnapshot.docs
                .map(docSnap => {
                    const data = docSnap.data();
                    if (data.estado === 'cancelado') return null;

                    return {
                        id: docSnap.id,
                        isTurno: true,
                        tipo: data.tipo === 'peluqueria' ? 'Peluquería' : 'Visita Clínica',
                        servicio: data.servicioNombre,
                        comentario: data.comentario || null,
                        medicamentos: data.tipo === 'peluqueria' ? [] : (data.medicamentosSuministrados || []),
                        fechaOriginal: data.fecha,
                        fechaCreacion: { toDate: () => new Date(data.fecha) }
                    };
                })
                .filter(Boolean);

            // 3. Fusionar y ordenar por fecha descendente
            const combinedCarnet = [...manualEntries, ...turnosEntries];
            combinedCarnet.sort((a, b) => {
                const dateA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaOriginal);
                const dateB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaOriginal);
                return dateB - dateA;
            });

            setCarnet(combinedCarnet);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [user, mascotaId]);

    const handleAddEntry = (data) => {
        startTransition(async () => {
            try {
                const carnetRef = collection(db, 'users', user.uid, 'mascotas', mascotaId, 'carnetSanitario');
                await addDoc(carnetRef, {
                    ...data,
                    fechaCreacion: new Date()
                });
                fetchData();
            } catch (err) { alert("Error guardando el registro: " + err.message); }
        });
    };

    const handleFichaUpdate = (data) => {
        startTransition(async () => {
            try {
                const mascotaRef = doc(db, 'users', user.uid, 'mascotas', mascotaId);
                await updateDoc(mascotaRef, data);
            } catch (err) { alert("Error guardando las notas: " + err.message); }
        });
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-32">
            <SubHeader title={mascota ? `Carnet de ${mascota.nombre}` : 'Cargando...'} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                <AddEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddEntry} />

                {loading ? (
                    <div className="flex justify-center items-center py-40">
                        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center bg-red-50 text-red-700 p-10 rounded-3xl border border-red-200 mt-10 shadow-sm">
                        <FaTimes className="mx-auto text-5xl mb-4 opacity-50" />
                        <p className="font-black text-2xl mb-2 tracking-tight">Hubo un problema</p>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                ) : mascota && (
                    <>
                        {/* Cabecera del Perfil */}
                        <PetProfileHeader mascota={mascota} />

                        {/* Panel de Candidatos si está en adopción */}
                        <AdoptionCandidates mascota={mascota} />

                        <NotasAdicionales mascota={mascota} onUpdate={handleFichaUpdate} />

                        {/* PANEL DE PREVENCIÓN / VACUNAS */}
                        <CareDashboard carnet={carnet} />

                        {/* Encabezado del Historial */}
                        <div className="flex justify-between items-center mb-10 px-2 lg:px-0">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Historial Médico</h2>
                                <p className="text-slate-500 text-sm mt-2 font-medium">Timeline de vida de {mascota.nombre}.</p>
                            </div>

                            <button onClick={() => setIsModalOpen(true)} className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-transform active:scale-95">
                                <FaPlus /> Nuevo
                            </button>
                        </div>

                        {/* Contenedor del Timeline */}
                        <div className="relative mt-4">
                            {/* Línea Exacta del Timeline */}
                            <div className="absolute left-[15px] sm:left-[15px] top-4 bottom-4 w-1 bg-slate-200 rounded-full"></div>

                            {carnet.length === 0 ? (
                                <div className="ml-12 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                                    <FaFileMedical className="mx-auto text-5xl text-slate-300 mb-5" />
                                    <h3 className="text-xl font-black text-slate-700 mb-2">Página en Blanco</h3>
                                    <p className="text-slate-500 font-medium">No se han registrado visitas médicas ni vacunas.</p>
                                </div>
                            ) : (
                                <div className="space-y-8 relative">
                                    {carnet.map((entry, idx) => (
                                        <CarnetEntryCard key={entry.id || idx} entry={entry} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="sm:hidden fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-2xl flex justify-center items-center text-2xl shadow-[0_10px_30px_rgba(15,23,42,0.4)] hover:bg-slate-800 active:scale-90 transition-all z-40 transform hover:-translate-y-1">
                    <FaPlus />
                </button>
            </main>
        </div>
    );
}
