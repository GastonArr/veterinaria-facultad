'use server';

import admin from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import { verificarDisponibilidadTraslado } from '@/lib/logica_traslado';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export async function checkTrasladoAvailability({ fecha, mascotas, turnoIdAIgnorar }) {
  try {
    if (!fecha || !mascotas || mascotas.length === 0) {
      throw new Error("La fecha y la lista de mascotas son requeridas.");
    }

    const db = admin.firestore();
    const targetDate = new Date(fecha);
    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

    let turnosQuery = db.collectionGroup('turnos')
      .where('necesitaTraslado', '==', true)
      .where('fecha', '>=', startOfDay)
      .where('fecha', '<', endOfDay);
      
    const turnosConTrasladoSnapshot = await turnosQuery.get();

    if (turnosConTrasladoSnapshot.empty) {
      const disponible = verificarDisponibilidadTraslado([], mascotas);
      return { disponible };
    }

    const turnosDelDia = [];
    for (const doc of turnosConTrasladoSnapshot.docs) {
        if(doc.id === turnoIdAIgnorar){
            continue;
        }
        const pathParts = doc.ref.path.split('/');
        const userId = pathParts[1];
        const mascotaId = pathParts[3];

        const mascotaDoc = await db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).get();
        if (mascotaDoc.exists) {
            turnosDelDia.push({ mascota: { tamaño: mascotaDoc.data().tamaño } });
        }
    }
    
    const disponible = verificarDisponibilidadTraslado(turnosDelDia, mascotas);

    return { disponible };

  } catch (error) {
    return { disponible: false, error: `Error del servidor: ${error.message}` };
  }
}

export async function getTurnosByUserId({ userId }) {
  if (!userId) {
    return { success: false, error: 'ID de usuario no proporcionado.' };
  }

  try {
    const db = admin.firestore();
    const turnosSnapshot = await db.collectionGroup('turnos')
                                   .where('clienteId', '==', userId)
                                   .orderBy('fecha', 'desc')
                                   .orderBy('tipo', 'desc')
                                   .get();

    if (turnosSnapshot.empty) {
      return { success: true, data: { proximos: [], historial: [] } };
    }

    const ahora = new Date();
    const proximos = [];
    const historial = [];

    const processedTurnosPromises = turnosSnapshot.docs.map(async (doc) => {
      const turno = doc.data();

      if (!turno.fecha || typeof turno.fecha.toDate !== 'function') {
        return null;
      }
      
      const fechaTurno = turno.fecha.toDate();
      const pathParts = doc.ref.path.split('/');
      const mascotaId = pathParts[3];
      
      let mascotaNombre = turno.mascotaNombre || 'Mascota no registrada';
      if (!turno.mascotaNombre && mascotaId) {
          const mascotaDoc = await db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).get();
          if (mascotaDoc.exists()) {
              mascotaNombre = mascotaDoc.data().nombre || mascotaNombre;
          }
      }

      const turnoProcesado = {
        id: doc.id,
        userId: userId, 
        mascotaId: mascotaId, 
        servicioNombre: turno.servicioNombre || 'Servicio no especificado',
        estado: turno.estado || 'desconocido',
        tipo: turno.tipo || 'general',
        fecha: fechaTurno.toISOString(),
        mascota: { nombre: mascotaNombre }
      };

      return turnoProcesado;
    });
    
    const resultados = await Promise.all(processedTurnosPromises);
    const turnosValidos = resultados.filter(t => t !== null);

    for (const turno of turnosValidos) {
        const fechaTurno = new Date(turno.fecha);
        if (turno.estado === 'finalizado' || turno.estado === 'cancelado' || (fechaTurno < ahora && turno.estado !== 'reprogramar')) {
            historial.push(turno);
        } else {
            proximos.push(turno);
        }
    }

    proximos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return { success: true, data: { proximos, historial } };

  } catch (error) {
    return { success: false, error: `Error del servidor al buscar los turnos: ${error.message}` };
  }
}

export async function reprogramarTurnoPorUsuario({ turnoId, userId, mascotaId, nuevaFecha }) {
  if (!turnoId || !userId || !mascotaId || !nuevaFecha) {
    return { success: false, error: 'Faltan datos esenciales para la reprogramación.' };
  }

  try {
    const db = admin.firestore();
    const turnoRef = db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).collection('turnos').doc(turnoId);
    const turnoDoc = await turnoRef.get();

    if (!turnoDoc.exists) {
      return { success: false, error: 'El turno que intentas modificar ya no existe.' };
    }
    if (turnoDoc.data().estado !== 'reprogramar') {
      return { success: false, error: 'Este turno no puede ser reprogramado en este momento.' };
    }

    await turnoRef.update({
      fecha: new Date(nuevaFecha), 
      estado: 'pendiente'
    });

    revalidatePath('/turnos/mis-turnos');
    revalidatePath('/admin/turnos');
    return { success: true };

  } catch (error) {
    return { success: false, error: `Ocurrió un error en el servidor: ${error.message}` };
  }
}

export async function getTurnoDetailsForReprogramming({ turnoId, userId, mascotaId }) {
  if (!turnoId || !userId || !mascotaId) {
    return { success: false, error: 'Faltan datos para obtener los detalles del turno.' };
  }

  try {
    const db = admin.firestore();
    const turnoRef = db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).collection('turnos').doc(turnoId);
    const turnoDoc = await turnoRef.get();

    if (!turnoDoc.exists) {
      return { success: false, error: 'No se encontró el turno especificado.' };
    }
    
    const mascotaRef = db.collection('users').doc(userId).collection('mascotas').doc(mascotaId);
    const mascotaDoc = await mascotaRef.get();
     if (!mascotaDoc.exists) {
      return { success: false, error: 'No se encontró la mascota asociada al turno.' };
    }

    const turnoData = turnoDoc.data();
    const mascotaData = mascotaDoc.data();

    return {
      success: true,
      data: {
        tipo: turnoData.tipo,
        necesitaTraslado: turnoData.necesitaTraslado || false,
        mascota: {
            id: mascotaDoc.id,
            nombre: mascotaData.nombre,
            tamaño: mascotaData.tamaño
        }
      }
    };

  } catch (error) {
    return { success: false, error: `Error del servidor al buscar los detalles del turno: ${error.message}` };
  }
}

export async function getAvailableSlotsForReprogramming({ fecha, tipo, necesitaTraslado, mascota, turnoId }) {
  if (!fecha || !tipo || !mascota) {
      return { success: false, error: "Datos insuficientes para verificar la disponibilidad." };
  }

  try {
      const db = admin.firestore();
      const timeZone = 'America/Argentina/Buenos_Aires';
      const targetDate = dayjs.tz(fecha, timeZone);

      if (necesitaTraslado) {
          const disponibilidadTraslado = await checkTrasladoAvailability({ fecha: targetDate.format('YYYY-MM-DD'), mascotas: [mascota], turnoIdAIgnorar: turnoId });
          if (disponibilidadTraslado.error) {
               throw new Error(`La verificación de traslado falló: ${disponibilidadTraslado.error}`);
          }
          if (!disponibilidadTraslado.disponible) {
              return { success: true, data: { horarios: [] }, error: "No hay espacio en el vehículo de traslado para este día." };
          }
      }

      const startOfDay = targetDate.startOf('day').toDate();
      const endOfDay = targetDate.endOf('day').toDate();

      let turnosQuery = db.collectionGroup('turnos')
          .where('tipo', '==', tipo)
          .where('fecha', '>=', startOfDay)
          .where('fecha', '<=', endOfDay);

      const turnosSnapshot = await turnosQuery.get();

      const horariosOcupados = turnosSnapshot.docs.map(doc => {
          if(doc.id === turnoId){
              return null;
          }
          return doc.data().horario;
      }).filter(h => h !== null);
      
      let horariosDisponibles = [];
      if (tipo === 'clinica') {
          const todosLosHorarios = [];
          for (let h = 9; h < 18; h++) {
              todosLosHorarios.push(`${h.toString().padStart(2, '0')}:00`);
              todosLosHorarios.push(`${h.toString().padStart(2, '0')}:30`);
          }
          horariosDisponibles = todosLosHorarios.filter(h => !horariosOcupados.includes(h));
      } else if (tipo === 'peluqueria') {
          const cuposPeluqueriaRef = db.collection('turnos_peluqueria').doc(targetDate.format('YYYY-MM-DD'));
          const cuposDoc = await cuposPeluqueriaRef.get();
          const cuposData = cuposDoc.exists ? cuposDoc.data() : { cuposManana: 4, cuposTarde: 4 };

          const countManana = horariosOcupados.filter(h => h === 'mañana').length;
          const countTarde = horariosOcupados.filter(h => h === 'tarde').length;
          
          if (cuposData.cuposManana > countManana) horariosDisponibles.push('mañana');
          if (cuposData.cuposTarde > countTarde) horariosDisponibles.push('tarde');
      }

      return { success: true, data: { horarios: horariosDisponibles } };

  } catch (error) {
      return { success: false, error: `Error del servidor: ${error.message}` };
  }
}
