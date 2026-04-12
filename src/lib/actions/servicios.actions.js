'use server';

import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebaseAdmin';

const firestore = admin.firestore();
const serviciosRef = firestore.collection('servicios').doc('catalogo');
const configRef = firestore.collection('configuracion').doc('servicios');
const disponibilidadRef = firestore.collection('configuracion').doc('disponibilidad');
// Referencia a la colección de turnos
const turnosRef = firestore.collection('turnos');

const initialServiceData = { peluqueria: {}, clinica: {}, medicamentos: {} };
const initialConfigData = { peluqueria_activa: false, clinica_activa: false };

// --- Funciones de Servicios y Configuración (sin cambios) ---

export async function obtenerServicios() {
    try {
        const doc = await serviciosRef.get();
        if (!doc.exists) {
            await serviciosRef.set(initialServiceData);
            return initialServiceData;
        }
        return doc.data() || initialServiceData;
    } catch (error) {
        console.error("Error al obtener los servicios:", error);
        return initialServiceData;
    }
}

export async function obtenerConfiguracionServicios() {
    try {
        const doc = await configRef.get();
        if (!doc.exists) {
            await configRef.set(initialConfigData);
            return initialConfigData;
        }
        return doc.data() || initialConfigData;
    } catch (error) {
        console.error("Error al obtener la configuración de servicios:", error);
        return initialConfigData;
    }
}

export async function toggleCategoriaActiva(categoria, estadoActual) {
    try {
        const campo = `${categoria}_activa`;
        await configRef.update({ [campo]: !estadoActual });
        revalidatePath('/admin/servicios');
        revalidatePath('/turnos/nuevo');
        return { success: true };
    } catch (error) {
        console.error(`Error al cambiar estado de ${categoria}:`, error);
        return { success: false, error: 'No se pudo actualizar el estado de la categoría.' };
    }
}

export async function guardarServicio(categoria, servicioId, data) {
    try {
        const updateData = {};
        updateData[`${categoria}.${servicioId}`] = data;
        await serviciosRef.update(updateData);
        revalidatePath('/admin/servicios');
        return { success: true };
    } catch (error) {
        console.error("Error al guardar el servicio:", error);
        return { success: false, error: 'No se pudo guardar el servicio.' };
    }
}

export async function eliminarServicio(categoria, servicioId) {
    try {
        const FieldValue = admin.firestore.FieldValue;
        const updateData = {};
        updateData[`${categoria}.${servicioId}`] = FieldValue.delete();
        await serviciosRef.update(updateData);
        revalidatePath('/admin/servicios');
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar el servicio:", error);
        return { success: false, error: 'No se pudo eliminar el servicio.' };
    }
}

// --- Funciones para Disponibilidad ---

export async function obtenerDiasBloqueados() {
    try {
        const doc = await disponibilidadRef.get();
        if (!doc.exists) return [];
        const data = doc.data();
        return data.diasNoDisponibles || [];
    } catch (error) {
        console.error("Error al obtener los días bloqueados:", error);
        return [];
    }
}

export async function obtenerConfiguracionDisponibilidad() {
    try {
        const doc = await disponibilidadRef.get();
        if (!doc.exists) {
            return { diasNoDisponibles: [], permitirTurnosDiasEspeciales: false };
        }

        const data = doc.data() || {};
        return {
            diasNoDisponibles: data.diasNoDisponibles || [],
            permitirTurnosDiasEspeciales: !!data.permitirTurnosDiasEspeciales,
        };
    } catch (error) {
        console.error("Error al obtener la configuración de disponibilidad:", error);
        return { diasNoDisponibles: [], permitirTurnosDiasEspeciales: false };
    }
}

/**
 * Añade una fecha a la lista de días no disponibles y cancela automáticamente los turnos agendados.
 * @param {string} fecha - La fecha a bloquear en formato YYYY-MM-DD.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function bloquearDia(fecha) {
    const batch = firestore.batch();
    try {
        // 1. Marcar el día como no disponible
        const FieldValue = admin.firestore.FieldValue;
        batch.set(disponibilidadRef, { 
            diasNoDisponibles: FieldValue.arrayUnion(fecha) 
        }, { merge: true });

        // 2. Buscar turnos agendados en esa fecha para cancelarlos
        const turnosAfectadosQuery = turnosRef
            .where('fecha', '==', fecha)
            .where('estado', 'in', ['pendiente', 'confirmado']);
            
        const turnosAfectadosSnapshot = await turnosAfectadosQuery.get();

        let reprogramadosCount = 0;
        if (!turnosAfectadosSnapshot.empty) {
            turnosAfectadosSnapshot.forEach(doc => {
                // 3. Actualizar el estado de cada turno a "reprogramado"
                batch.update(doc.ref, { estado: 'reprogramado' });
                reprogramadosCount++;
            });
        }

        // 4. Ejecutar todas las operaciones en la base de datos
        await batch.commit();

        // 5. Revalidar las rutas para actualizar la UI en todos lados
        revalidatePath('/admin/servicios'); // Calendario del admin
        revalidatePath('/turnos/nuevo');     // Formulario de nuevos turnos para usuarios
        revalidatePath('/mis-turnos');         // Lista de turnos del usuario

        console.log(`Día ${fecha} bloqueado. Se han reprogramado automáticamente ${reprogramadosCount} turnos.`);

        return { success: true, message: `Día bloqueado. Se reprogramaron ${reprogramadosCount} turnos.` };

    } catch (error) {
        console.error(`Error al bloquear el día ${fecha} y cancelar turnos:`, error);
        return { success: false, error: 'No se pudo completar la operación.' };
    }
}

/**
 * Elimina una fecha de la lista de días no disponibles.
 * @param {string} fecha - La fecha a desbloquear en formato YYYY-MM-DD.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function desbloquearDia(fecha) {
    try {
        const FieldValue = admin.firestore.FieldValue;
        await disponibilidadRef.update({
            diasNoDisponibles: FieldValue.arrayRemove(fecha)
        });

        revalidatePath('/admin/servicios');
        revalidatePath('/turnos/nuevo');
        // No es necesario revalidar /mis-turnos aquí, ya que no se revierten los estados.

        return { success: true };
    } catch (error) {
        console.error(`Error al desbloquear el día ${fecha}:`, error);
        return { success: false, error: 'No se pudo desbloquear la fecha.' };
    }
}


export async function actualizarServicio(categoria, servicioId, data) {
    try {
        const updateData = {};
        updateData[`${categoria}.${servicioId}`] = data;
        await serviciosRef.update(updateData);
        revalidatePath('/admin/servicios');
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar el servicio:", error);
        return { success: false, error: 'No se pudo actualizar el servicio.' };
    }
}
