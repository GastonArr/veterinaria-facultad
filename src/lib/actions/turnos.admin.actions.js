'use server';

import admin from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const db = admin.firestore();

const toISOStringOrNull = (timestamp) => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  return null;
};

export async function getTurnsForAdminDashboard() {
  try {
    const timeZone = 'America/Argentina/Buenos_Aires';

    const turnosSnapshot = await db.collectionGroup('turnos')
                                 .orderBy('fecha', 'desc')
                                 .orderBy('tipo', 'asc')
                                 .get();

    if (turnosSnapshot.empty) {
      return { success: true, data: { hoy: [], proximos: [], finalizados: [], paraProgramar: [], mensual: [], todos: [] } };
    }

    const usersCache = new Map();
    const mascotasCache = new Map();

    const enrichedTurnosPromises = turnosSnapshot.docs.map(async (doc) => {
      const turnoData = doc.data();
      const userId = turnoData.clienteId;
      const mascotaId = turnoData.mascotaId;
      
      let serializableUser = { id: userId, nombre: 'Usuario', apellido: 'Eliminado', email: 'N/A' };
      let serializableMascota = { id: mascotaId, nombre: 'Mascota Eliminada', especie: 'N/A', fechaNacimiento: null };

      if (userId) {
        if (usersCache.has(userId)) {
          serializableUser = usersCache.get(userId);
        } else {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            serializableUser = {
              id: userDoc.id,
              nombre: userData.nombre || 'N/A',
              apellido: userData.apellido || 'N/A',
              email: userData.email || 'N/A',
            };
            usersCache.set(userId, serializableUser);
          }
        }
      }
      
      if (userId && mascotaId) {
        const mascotaCacheKey = `${userId}-${mascotaId}`;
        if (mascotasCache.has(mascotaCacheKey)) {
            serializableMascota = mascotasCache.get(mascotaCacheKey);
        } else {
            const mascotaDoc = await db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).get();
            if (mascotaDoc.exists) {
                const mascotaData = mascotaDoc.data();
                serializableMascota = {
                  id: mascotaDoc.id,
                  nombre: mascotaData.nombre || 'N/A',
                  especie: mascotaData.especie || 'N/A',
                  raza: mascotaData.raza || 'N/A',
                  fechaNacimiento: toISOStringOrNull(mascotaData.fechaNacimiento),
                };
                mascotasCache.set(mascotaCacheKey, serializableMascota);
            }
        }
      }

      return {
        id: doc.id,
        userId: turnoData.clienteId,
        mascotaId: turnoData.mascotaId,
        tipo: turnoData.tipo,
        servicioNombre: turnoData.servicioNombre,
        estado: turnoData.estado,
        necesitaTraslado: turnoData.necesitaTraslado || false,
        fecha: toISOStringOrNull(turnoData.fecha),
        motivoCancelacion: turnoData.motivoCancelacion || '',
        comentario: turnoData.comentario || '',
        medicamentosSuministrados: turnoData.medicamentosSuministrados || [],
        user: serializableUser,
        mascota: serializableMascota,
      };
    });

    const enrichedTurnos = await Promise.all(enrichedTurnosPromises);

    const nowInArgentina = dayjs().tz(timeZone);
    const startOfTodayInArgentina = nowInArgentina.startOf('day');
    const endOfTodayInArgentina = nowInArgentina.endOf('day');
    const startOfMonthInArgentina = nowInArgentina.startOf('month');
    const endOfMonthInArgentina = nowInArgentina.endOf('month');

    const hoy = [];
    const proximos = [];
    const finalizados = [];
    const paraProgramar = [];
    const mensual = [];
    const todos = [...enrichedTurnos];

    for (const turno of enrichedTurnos) {
      if (!turno.fecha) continue;
      const fechaTurno = dayjs(turno.fecha);
      const esDeHoy =
        (fechaTurno.isAfter(startOfTodayInArgentina) || fechaTurno.isSame(startOfTodayInArgentina)) &&
        (fechaTurno.isBefore(endOfTodayInArgentina) || fechaTurno.isSame(endOfTodayInArgentina));

      if (turno.estado === 'cancelado' || turno.estado === 'reprogramar') {
        paraProgramar.push(turno);
        continue;
      }

      if (turno.estado === 'finalizado' || turno.estado === 'servicio terminado') {
        finalizados.push(turno);
        continue;
      }

      if (turno.estado === 'pendiente' && (fechaTurno.isAfter(nowInArgentina) || fechaTurno.isSame(nowInArgentina))) {
        proximos.push(turno);
        continue;
      }

      if (turno.estado === 'confirmado' && esDeHoy) {
        hoy.push(turno);
        continue;
      }

      if (
        turno.estado === 'confirmado' &&
        fechaTurno.isAfter(endOfTodayInArgentina) &&
        (fechaTurno.isSame(startOfMonthInArgentina) || fechaTurno.isAfter(startOfMonthInArgentina)) &&
        (fechaTurno.isSame(endOfMonthInArgentina) || fechaTurno.isBefore(endOfMonthInArgentina))
      ) {
        mensual.push(turno);
        continue;
      }

      if (fechaTurno.isBefore(startOfTodayInArgentina) && (turno.estado === 'pendiente' || turno.estado === 'confirmado')) {
        finalizados.push(turno);
      }
    }
    
    proximos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    finalizados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    hoy.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    paraProgramar.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    mensual.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return { success: true, data: { hoy, proximos, finalizados, paraProgramar, mensual, todos } };

  } catch (error) {
    console.error("Error en getTurnsForAdminDashboard:", error);
    return { success: false, error: `Error del servidor: ${error.message}.` };
  }
}


export async function updateTurnoStatus({ userId, mascotaId, turnoId, newStatus, newDate, cancelReason }) {
  try {
    if (!userId || !mascotaId || !turnoId || !newStatus) {
      throw new Error("Faltan parámetros requeridos.");
    }
    
    const turnoRef = db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).collection('turnos').doc(turnoId);
    
    const updateData = {
      estado: newStatus
    };

    if (newDate) {
      updateData.fecha = admin.firestore.Timestamp.fromDate(new Date(newDate));
    }

    if (newStatus === 'cancelado') {
      updateData.motivoCancelacion = (cancelReason || '').trim();
    } else {
      updateData.motivoCancelacion = '';
    }

    await turnoRef.update(updateData);
    
    // Revalidar las rutas afectadas para que Next.js actualice la caché.
    revalidatePath('/admin/turnos');
    revalidatePath('/admin/empleados/transporte');
    revalidatePath('/admin/empleados/peluqueria');
    revalidatePath('/turnos/mis-turnos');
    
    return { success: true, message: `Turno actualizado.` };

  } catch (error) {
    console.error("Error en updateTurnoStatus:", error);
    return { success: false, error: `Error al actualizar: ${error.message}` };
  }
}

export async function documentarTurno({ userId, mascotaId, turnoId, comentario, medicamentosSuministrados }) {
  try {
    if (!userId || !mascotaId || !turnoId) {
      throw new Error("Faltan parámetros requeridos para documentar el turno.");
    }
    
    const turnoRef = db.collection('users').doc(userId).collection('mascotas').doc(mascotaId).collection('turnos').doc(turnoId);
    
    const turnoDoc = await turnoRef.get();
    if (!turnoDoc.exists) {
      throw new Error("No se encontró el turno a documentar.");
    }

    const turnoData = turnoDoc.data();
    const esPeluqueria = turnoData?.tipo === 'peluqueria';
    const comentarioNormalizado = (comentario || '').trim();

    if (esPeluqueria && !comentarioNormalizado) {
      throw new Error("El historial del corte es obligatorio para turnos de peluquería.");
    }

    const updateData = {
      comentario: comentarioNormalizado,
      medicamentosSuministrados: esPeluqueria ? [] : (medicamentosSuministrados || [])
    };

    await turnoRef.update(updateData);
    
    revalidatePath('/admin/turnos');
    
    return { success: true, message: "Turno documentado exitosamente." };

  } catch (error) {
    console.error("Error en documentarTurno:", error);
    return { success: false, error: `Error al documentar el turno: ${error.message}` };
  }
}

export async function borrarTurnoCompletoAdmin({ userId, mascotaId, turnoId }) {
  try {
    if (!userId || !mascotaId || !turnoId) {
      throw new Error('Faltan parámetros requeridos para borrar el turno.');
    }

    const turnoRef = db
      .collection('users')
      .doc(userId)
      .collection('mascotas')
      .doc(mascotaId)
      .collection('turnos')
      .doc(turnoId);

    const turnoDoc = await turnoRef.get();
    if (!turnoDoc.exists) {
      throw new Error('No se encontró el turno a eliminar.');
    }

    if (typeof db.recursiveDelete === 'function') {
      await db.recursiveDelete(turnoRef);
    } else {
      await turnoRef.delete();
    }

    revalidatePath('/admin/turnos');
    revalidatePath('/admin/empleados/transporte');
    revalidatePath('/admin/empleados/peluqueria');
    revalidatePath('/turnos/mis-turnos');

    return { success: true, message: 'Turno eliminado por completo.' };
  } catch (error) {
    console.error('Error en borrarTurnoCompletoAdmin:', error);
    return { success: false, error: `Error al borrar el turno: ${error.message}` };
  }
}
