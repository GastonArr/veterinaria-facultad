'use server';

import admin from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import { verificarDisponibilidadTraslado } from '../logica_traslado.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const firestore = admin.firestore();
const TAMAÑO_PRECIOS_MAP = { 'pequeño': 'chico', 'mediano': 'mediano', 'grande': 'grande' };
// --- Constantes para la lógica de turnos ---
const VETERINARIOS_DISPONIBLES = 1;
const horariosConsulta = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];
const horariosPeluqueria = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];




export async function verificarDisponibilidadTrasladoAction({ fecha, nuevasMascotas }) {
    try {
        if (!fecha || !nuevasMascotas) {
            throw new Error('Faltan datos para la verificación del traslado.');
        }
        const timeZone = 'America/Argentina/Buenos_Aires';
        const startOfDay = dayjs.tz(fecha, timeZone).startOf('day');
        const endOfDay = startOfDay.add(1, 'day');
        const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(startOfDay.toDate());
        const endOfDayTimestamp = admin.firestore.Timestamp.fromDate(endOfDay.toDate());
        
        const turnosSnap = await firestore.collectionGroup('turnos')
            .where('necesitaTraslado', '==', true)
            .where('fecha', '>=', startOfDayTimestamp)
            .where('fecha', '<', endOfDayTimestamp)
            .get();

        const turnosDelDia = turnosSnap.docs.map(doc => ({ mascota: { tamaño: doc.data().mascotaTamaño } }));
        const hayDisponibilidad = verificarDisponibilidadTraslado(turnosDelDia, nuevasMascotas);

        if (!hayDisponibilidad) {
            return { success: false, error: 'No hay más lugar en el vehículo de traslado para la fecha seleccionada.' };
        }
        return { success: true };

    } catch (error) {
        console.error("Error al verificar disponibilidad de traslado:", error);
        return { success: false, error: error.message || 'No se pudo completar la verificación.' };
    }
}

export async function crearTurnos(userId, data) {
    const { selectedMascotas, motivosPorMascota, specificServices, horarioClinica, horarioPeluqueria, necesitaTraslado, metodoPago, catalogoServicios } = data;

    if (!userId) {
        return { success: false, error: 'Usuario no autenticado.' };
    }

    const timeZone = 'America/Argentina/Buenos_Aires';
    const writePromises = [];
    
    // --- LÓGICA DE ASIGNACIÓN SECUENCIAL ---
    // Contadores para asignar horarios uno detrás de otro por tipo de servicio.
    let clinicaSlotIndex = 0; 
    let peluqueriaSlotIndex = 0; 

    try {
        for (const mascota of selectedMascotas) {
            const motivos = motivosPorMascota[mascota.id] || {};
            const serviciosSeleccionados = specificServices[mascota.id] || {};

            // --- Preparar turno de Clínica (Lógica Modificada) ---
            if (motivos.clinica && serviciosSeleccionados.clinica) {
                if (!horarioClinica || !horarioClinica.fecha || !horarioClinica.hora) {
                    throw new Error('Falta seleccionar la fecha o la hora para el turno de clínica.');
                }
                
                const [startHours, startMinutes] = horarioClinica.hora.split(':').map(Number);
                const servicioId = serviciosSeleccionados.clinica;
                const servicioData = catalogoServicios.clinica.find(s => s.id === servicioId);
                if (!servicioData) throw new Error(`Servicio de clínica ID=${servicioId} no encontrado.`);

                // Calcula el desplazamiento en minutos para el turno de ESTA mascota.
                const offsetMinutes = clinicaSlotIndex * 30; // Asumiendo turnos de 30 mins
                const fechaTurnoClinica = dayjs.tz(horarioClinica.fecha, timeZone)
                                            .hour(startHours).minute(startMinutes).second(0)
                                            .add(offsetMinutes, 'minute');

                const horarioFinal = fechaTurnoClinica.format('HH:mm');

                const turnoRef = firestore.collection('users').doc(userId).collection('mascotas').doc(mascota.id).collection('turnos').doc();
                const turnoClinicaData = {
                    fecha: admin.firestore.Timestamp.fromDate(fechaTurnoClinica.toDate()),
                    horario: horarioFinal, 
                    tipo: 'clinica', 
                    mascotaId: mascota.id, 
                    mascotaNombre: mascota.nombre, 
                    mascotaTamaño: mascota.tamaño,
                    servicioId: servicioId, 
                    servicioNombre: servicioData.nombre, 
                    precio: servicioData.precio || 0,
                    metodoPago: metodoPago, 
                    estado: 'pendiente', 
                    creadoEn: admin.firestore.FieldValue.serverTimestamp(), 
                    necesitaTraslado: false,
                    clienteId: userId
                };
                writePromises.push(turnoRef.set(turnoClinicaData));
                
                // Incrementa el contador para la siguiente mascota de clínica.
                clinicaSlotIndex++; 
            }

            // --- Preparar turno de Peluquería (Sin cambios) ---
            if (motivos.peluqueria && serviciosSeleccionados.peluqueria) {
                if (!horarioPeluqueria || !horarioPeluqueria.fecha || !horarioPeluqueria.hora) {
                    throw new Error('Falta seleccionar la fecha o la hora para el servicio de peluquería.');
                }
                const servicioId = serviciosSeleccionados.peluqueria;
                const servicioData = catalogoServicios.peluqueria.find(s => s.id === servicioId);
                if (!servicioData) throw new Error(`Servicio de peluquería ID=${servicioId} no encontrado.`);
                
                const tamañoKey = TAMAÑO_PRECIOS_MAP[mascota.tamaño.toLowerCase()] || 'chico';
                const precio = servicioData.precios[tamañoKey] || 0;

                const [startHours, startMinutes] = horarioPeluqueria.hora.split(':').map(Number);
                const offsetMinutes = peluqueriaSlotIndex * 60; // Asumiendo 1 turno de peluquería por hora.
                const fechaTurnoPeluqueria = dayjs.tz(horarioPeluqueria.fecha, timeZone)
                    .hour(startHours).minute(startMinutes).second(0)
                    .add(offsetMinutes, 'minute');
                const horarioFinalPeluqueria = fechaTurnoPeluqueria.format('HH:mm');

                const turnoRef = firestore.collection('users').doc(userId).collection('mascotas').doc(mascota.id).collection('turnos').doc();
                const turnoPeluqueriaData = {
                    fecha: admin.firestore.Timestamp.fromDate(fechaTurnoPeluqueria.toDate()),
                    horario: horarioFinalPeluqueria, tipo: 'peluqueria', mascotaId: mascota.id, mascotaNombre: mascota.nombre, mascotaTamaño: mascota.tamaño,
                    servicioId: servicioId, servicioNombre: servicioData.nombre, precio: precio, necesitaTraslado: necesitaTraslado,
                    metodoPago: metodoPago, estado: 'pendiente', creadoEn: admin.firestore.FieldValue.serverTimestamp(),
                    clienteId: userId
                };
                writePromises.push(turnoRef.set(turnoPeluqueriaData));
                peluqueriaSlotIndex++;
            }
        }
        
        if (writePromises.length === 0) {
            return { success: false, error: 'No se preparó ningún turno para guardar.' };
        }

        await Promise.all(writePromises);

        revalidatePath('/turnos/mis-turnos');
        revalidatePath('/admin/turnos');

        return { success: true, message: '¡Todos los turnos se guardaron con éxito!' };

    } catch (error) {
        console.error("Error al crear los turnos:", error);
        return { success: false, error: error.message || 'Falló la operación de guardado.' };
    }
}


// export async function crearTurnos(user, data) {
//     const { selectedMascotas, motivosPorMascota, specificServices, horarioClinica, horarioPeluqueria, necesitaTraslado, metodoPago, catalogoServicios } = data;

//     if (!user || !user.uid) {
//         return { success: false, error: 'Usuario no autenticado.' };
//     }

//     const timeZone = 'America/Argentina/Buenos_Aires';
//     const writePromises = []; // Array para guardar cada promesa de escritura

//     try {
//         for (const mascota of selectedMascotas) {
//             const motivos = motivosPorMascota[mascota.id] || {};
//             const serviciosSeleccionados = specificServices[mascota.id] || {};

//             // --- Preparar turno de Clínica ---
//             if (motivos.clinica && serviciosSeleccionados.clinica) {
//                 if (!horarioClinica || !horarioClinica.fecha || !horarioClinica.hora) {
//                     throw new Error('Falta seleccionar la fecha o la hora para el turno de clínica.');
//                 }
//                 const [hours, minutes] = horarioClinica.hora.split(':').map(Number);
//                 const servicioId = serviciosSeleccionados.clinica;
//                 const servicioData = catalogoServicios.clinica.find(s => s.id === servicioId);
//                 if (!servicioData) throw new Error(`Servicio de clínica ID=${servicioId} no encontrado.`);

//                 const fechaTurnoClinica = dayjs.tz(horarioClinica.fecha, timeZone).hour(hours).minute(minutes).second(0);

//                 const turnoRef = firestore.collection('users').doc(user.uid).collection('mascotas').doc(mascota.id).collection('turnos').doc();
//                 const turnoClinicaData = {
//                     fecha: admin.firestore.Timestamp.fromDate(fechaTurnoClinica.toDate()),
//                     horario: horarioClinica.hora, tipo: 'clinica', mascotaId: mascota.id, mascotaNombre: mascota.nombre, mascotaTamaño: mascota.tamaño,
//                     servicioId: servicioId, servicioNombre: servicioData.nombre, precio: servicioData.precio_base || 0,
//                     metodoPago: metodoPago, estado: 'pendiente', creadoEn: admin.firestore.FieldValue.serverTimestamp(), necesitaTraslado: false,
//                     clienteId: user.uid // Campo clave para búsquedas de admin y usuario
//                 };
//                 writePromises.push(turnoRef.set(turnoClinicaData));
//             }

//             // --- Preparar turno de Peluquería ---
//             if (motivos.peluqueria && serviciosSeleccionados.peluqueria) {
//                 if (!horarioPeluqueria || !horarioPeluqueria.fecha || !horarioPeluqueria.turno) {
//                     throw new Error('Falta seleccionar la fecha o el turno para el servicio de peluquería.');
//                 }
//                 const servicioId = serviciosSeleccionados.peluqueria;
//                 const servicioData = catalogoServicios.peluqueria.find(s => s.id === servicioId);
//                 if (!servicioData) throw new Error(`Servicio de peluquería ID=${servicioId} no encontrado.`);
                
//                 const tamañoKey = TAMAÑO_PRECIOS_MAP[mascota.tamaño.toLowerCase()] || 'chico';
//                 const precio = servicioData.precios[tamañoKey] || 0;

//                 let fechaTurnoPeluqueria = dayjs.tz(horarioPeluqueria.fecha, timeZone);
//                 fechaTurnoPeluqueria = fechaTurnoPeluqueria.hour(horarioPeluqueria.turno === 'mañana' ? 9 : 14).minute(0).second(0);

//                 const turnoRef = firestore.collection('users').doc(user.uid).collection('mascotas').doc(mascota.id).collection('turnos').doc();
//                 const turnoPeluqueriaData = {
//                     fecha: admin.firestore.Timestamp.fromDate(fechaTurnoPeluqueria.toDate()),
//                     horario: horarioPeluqueria.turno, tipo: 'peluqueria', mascotaId: mascota.id, mascotaNombre: mascota.nombre, mascotaTamaño: mascota.tamaño,
//                     servicioId: servicioId, servicioNombre: servicioData.nombre, precio: precio, necesitaTraslado: necesitaTraslado,
//                     metodoPago: metodoPago, estado: 'pendiente', creadoEn: admin.firestore.FieldValue.serverTimestamp(),
//                     clienteId: user.uid // Campo clave para búsquedas de admin y usuario
//                 };
//                 writePromises.push(turnoRef.set(turnoPeluqueriaData));
//             }
//         }
        
//         if (writePromises.length === 0) {
//             return { success: false, error: 'No se preparó ningún turno para guardar.' };
//         }

//         // Ejecutar TODAS las promesas de escritura a la vez
//         await Promise.all(writePromises);

//         revalidatePath('/turnos/mis-turnos');
//         revalidatePath('/admin/turnos');

//         return { success: true, message: '¡Todos los turnos se guardaron con éxito!' };

//     } catch (error) {
//         console.error("Error al crear los turnos:", error);
//         return { success: false, error: error.message || 'Falló la operación de guardado.' };
//     }
// }

async function updateUserTurno(userId, mascotaId, turnoId, updateData) {
    // Esta función parece ser para el admin, la dejamos como está por ahora
    // ya que el admin usa collectionGroup y puede encontrar los turnos en subcolecciones.
    // Pero para consistencia a futuro, debería probablemente apuntar a la colección raíz también.
    if (!userId || !mascotaId || !turnoId) return { success: false, error: 'Faltan IDs para localizar el turno.' };
    try {
        const turnoRef = firestore.collection('users').doc(userId).collection('mascotas').doc(mascotaId).collection('turnos').doc(turnoId);
        await turnoRef.update(updateData);
        revalidatePath('/admin/turnos');
        revalidatePath('/turnos/mis-turnos');
        return { success: true };
    } catch (error) {
        console.error(`Error al actualizar turno ${turnoId}:`, error);
        return { success: false, error: 'Error al actualizar el estado del turno.' };
    }
}

export async function cancelarTurnoUsuario({ turnoId, motivoCancelacion = '' }) {
    if (!turnoId) {
        return { success: false, error: 'ID del turno no proporcionado.' };
    }
    try {
        const turnoRef = firestore.collection('turnos').doc(turnoId);
        const motivo = motivoCancelacion.trim();
        if (!motivo) {
            return { success: false, error: 'Debes informar un motivo para cancelar el turno.' };
        }

        await turnoRef.update({
            estado: 'cancelado',
            motivoCancelacion: motivo,
            canceladoPor: 'cliente',
        });

        revalidatePath('/turnos/mis-turnos');
        revalidatePath('/admin/turnos');

        return { success: true };
    } catch (error) {
        console.error(`Error al cancelar el turno del usuario ${turnoId}:`, error);
        return { success: false, error: 'No se pudo cancelar el turno.' };
    }
}

export async function confirmarTurno({ userId, mascotaId, turnoId }) {
    return updateUserTurno(userId, mascotaId, turnoId, { estado: 'confirmado' });
}

export async function cancelarTurno({ userId, mascotaId, turnoId }) {
    return updateUserTurno(userId, mascotaId, turnoId, { estado: 'cancelado' });
}

export async function finalizarTurno({ userId, mascotaId, turnoId }) {
    return updateUserTurno(userId, mascotaId, turnoId, { estado: 'finalizado' });
}

export async function modificarTurno({ userId, mascotaId, turnoId, nuevosDatos }) {
    return updateUserTurno(userId, mascotaId, turnoId, nuevosDatos);
}
export async function getAvailableSlotsForNewTurno({ fecha, tipo, numMascotas }) {
    if (!fecha || !tipo || !numMascotas) {
        return { success: false, error: "Faltan parámetros para buscar disponibilidad." };
    }
    try {
        const timeZone = 'America/Argentina/Buenos_Aires';
        const ahoraEnArgentina = dayjs().tz(timeZone);
        const fechaSolicitada = dayjs.tz(fecha, timeZone).startOf('day');
        const esHoy = fechaSolicitada.isSame(ahoraEnArgentina, 'day');
        const horaActual = ahoraEnArgentina.format('HH:mm');

        const esHorarioValido = (horaInicioBloque) => {
            if (!esHoy) return true;
            return horaInicioBloque > horaActual;
        };

        if (tipo === 'clinica') {
            const startOfDay = dayjs.tz(fecha, timeZone).startOf('day');
            const endOfDay = startOfDay.endOf('day');
            
            const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(startOfDay.toDate());
            const endOfDayTimestamp = admin.firestore.Timestamp.fromDate(endOfDay.toDate());
            const q = firestore.collectionGroup('turnos')
                .where('tipo', '==', 'clinica')
                .where('fecha', '>=', startOfDayTimestamp)
                .where('fecha', '<=', endOfDayTimestamp);
            const querySnapshot = await q.get();
            const ocupacionDelDia = {}; 
            querySnapshot.forEach(doc => {
                const turno = doc.data();
                if (turno.horario) {
                    ocupacionDelDia[turno.horario] = (ocupacionDelDia[turno.horario] || 0) + 1;
                }
            });
            // --- NUEVA LÓGICA DE BLOQUES CONSECUTIVOS ---
            const horariosDisponibles = [];
            // Itera sobre los horarios de consulta para encontrar un bloque inicial.
            for (let i = 0; i <= horariosConsulta.length - numMascotas; i++) {
                const horaInicioBloque = horariosConsulta[i];
                let bloqueDisponible = true;
                // Verifica si el bloque de 'numMascotas' slots consecutivos está libre.
                for (let j = 0; j < numMascotas; j++) {
                    const horarioAVerificar = horariosConsulta[i + j];
                    const ocupados = ocupacionDelDia[horarioAVerificar] || 0;
                    if (ocupados >= VETERINARIOS_DISPONIBLES) {
                        bloqueDisponible = false;
                        break; 
                    }
                }
                if (bloqueDisponible) {
                    if (esHorarioValido(horaInicioBloque)) {
                        horariosDisponibles.push(horaInicioBloque);
                    }
                }
            }
            
            return { success: true, data: { horarios: horariosDisponibles } };
        }
        
        if (tipo === 'peluqueria') {
            const startOfDay = dayjs.tz(fecha, timeZone).startOf('day');
            const endOfDay = startOfDay.endOf('day');

            const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(startOfDay.toDate());
            const endOfDayTimestamp = admin.firestore.Timestamp.fromDate(endOfDay.toDate());
            const q = firestore.collectionGroup('turnos')
                .where('tipo', '==', 'peluqueria')
                .where('fecha', '>=', startOfDayTimestamp)
                .where('fecha', '<=', endOfDayTimestamp);
            const querySnapshot = await q.get();
            const ocupacionDelDia = {};
            querySnapshot.forEach(doc => {
                const turno = doc.data();
                if (turno.horario) {
                    ocupacionDelDia[turno.horario] = (ocupacionDelDia[turno.horario] || 0) + 1;
                }
            });

            const horariosDisponibles = [];
            for (let i = 0; i <= horariosPeluqueria.length - numMascotas; i++) {
                const horaInicioBloque = horariosPeluqueria[i];
                let bloqueDisponible = true;
                for (let j = 0; j < numMascotas; j++) {
                    const horarioAVerificar = horariosPeluqueria[i + j];
                    const ocupados = ocupacionDelDia[horarioAVerificar] || 0;
                    if (ocupados >= 1) {
                        bloqueDisponible = false;
                        break;
                    }
                }
                if (bloqueDisponible) {
                    if (esHorarioValido(horaInicioBloque)) {
                        horariosDisponibles.push(horaInicioBloque);
                    }
                }
            }

            return { success: true, data: { horarios: horariosDisponibles } };
        }
        return { success: false, error: "Tipo de servicio no válido." };
    } catch (error) {
        console.error("Error fetching available slots:", error);
        return { success: false, error: "No se pudo verificar la disponibilidad. Intente de nuevo." };
    }
}
