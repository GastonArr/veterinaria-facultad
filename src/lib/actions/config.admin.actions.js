'use server';

import admin from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const db = admin.firestore();

export async function actualizarDiasNoLaborales({ nuevasFechas, permitirTurnosDiasEspeciales }) {
  if (!Array.isArray(nuevasFechas)) {
    return { success: false, error: 'El formato de los datos proporcionados es incorrecto.' };
  }

  const configRef = db.collection('configuracion').doc('disponibilidad');

  try {
    let reprogramadosCount = 0;

    await db.runTransaction(async (transaction) => {
      const configDoc = await transaction.get(configRef);
      const fechasAntiguas = configDoc.exists ? (configDoc.data().diasNoDisponibles || []) : [];
      
      const fechasUnicas = Array.from(new Set(nuevasFechas));
      console.log(`Fechas recibidas del cliente: ${nuevasFechas.length}. Fechas únicas a procesar: ${fechasUnicas.length}`);

      const fechasRecienBloqueadas = fechasUnicas.filter(fecha => !fechasAntiguas.includes(fecha));

      if (fechasRecienBloqueadas.length > 0) {
        console.log(`Días recién bloqueados detectados: ${fechasRecienBloqueadas.join(', ')}. Buscando turnos para reprogramar...`);
        
        const timeZone = 'America/Argentina/Buenos_Aires';

        for (const fechaStr of fechasRecienBloqueadas) {
            // --- CORRECCIÓN DE ZONA HORARIA ---
            // Se define el inicio y fin del día en la zona horaria de Argentina.
            const startOfDay = dayjs.tz(fechaStr, timeZone).startOf('day').toDate();
            const endOfDay = dayjs.tz(fechaStr, timeZone).endOf('day').toDate();

            console.log(`Buscando turnos en zona horaria de Argentina entre ${startOfDay.toISOString()} y ${endOfDay.toISOString()}`);

            const turnosAfectadosQuery = db.collectionGroup('turnos')
              .where('estado', 'in', ['pendiente', 'confirmado'])
              .where('fecha', '>=', startOfDay)
              .where('fecha', '<', endOfDay);
            
            const turnosAfectadosSnapshot = await turnosAfectadosQuery.get();
            
            if (turnosAfectadosSnapshot.empty) {
                console.log(`No se encontraron turnos para el día ${fechaStr}.`);
            } else {
              console.log(`¡Éxito! La consulta encontró ${turnosAfectadosSnapshot.size} turno(s) para el día ${fechaStr}.`);
              turnosAfectadosSnapshot.forEach(doc => {
                console.log(`Marcando para reprogramar: Turno ID ${doc.id} en la ruta ${doc.ref.path}`);
                transaction.update(doc.ref, { estado: 'reprogramar' });
                reprogramadosCount++;
              });
            }
        }
      }
      // Se guarda la lista de fechas únicas en la base de datos
      transaction.set(configRef, {
        diasNoDisponibles: fechasUnicas,
        permitirTurnosDiasEspeciales: !!permitirTurnosDiasEspeciales
      }, { merge: true });
    });

    console.log(`Operación completada. Se han reprogramado un total de ${reprogramadosCount} turnos.`);

    // Revalidación para que el frontend se actualice
    revalidatePath('/admin/servicios');
    revalidatePath('/turnos/mis-turnos');
    revalidatePath('/admin/turnos');

    return { success: true, reprogramadosCount };

  } catch (error) {
    console.error("Error crítico al actualizar días no laborales:", error);
    return { success: false, error: `Error del servidor: ${error.message}` };
  }
}
