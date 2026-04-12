'use server';
import admin from '@/lib/firebaseAdmin';

/**
 * @action getDiasNoLaborales
 * @description Obtiene todos los días marcados como no laborales por un administrador.
 * Lee el array 'diasNoDisponibles' del documento 'disponibilidad' en la colección 'configuracion'.
 * @returns {Promise<{success: boolean, data?: string[], permitirTurnosDiasEspeciales?: boolean, error?: string}>}
 * Un array de strings (YYYY-MM-DD) correspondientes a los días bloqueados y si se permiten turnos en fines de semana/feriados.
 */
export async function getDiasNoLaborales() {
  try {
    const db = admin.firestore();
    const configRef = db.collection('configuracion').doc('disponibilidad');
    const docSnap = await configRef.get();

    if (!docSnap.exists) {
      console.log("El documento 'disponibilidad' no existe en la colección 'configuracion'. Se retorna un array vacío.");
      return { success: true, data: [], permitirTurnosDiasEspeciales: false };
    }

    const data = docSnap.data();
    // CORRECCIÓN: Se devuelve directamente el array de strings, sin convertirlo a objetos Date.
    // El cliente es responsable de interpretar estos strings en su zona horaria local.
    const dateStrings = data.diasNoDisponibles || [];
    
    return {
      success: true,
      data: dateStrings,
      permitirTurnosDiasEspeciales: !!data.permitirTurnosDiasEspeciales,
    };

  } catch (error) {
    console.error("Error definitivo en getDiasNoLaborales:", error);
    return { success: false, error: 'No se pudieron cargar las configuraciones de días no laborales desde el servidor.' };
  }
}



/**
 * @action obtenerConfiguracionServicios
 * @description Obtiene el estado de activación (activo/inactivo) de las categorías de servicios.
 * Lee los campos 'clinica_activa' y 'peluqueria_activa' del documento 'servicios' en la colección 'configuracion'.
 * @returns {Promise<{success: boolean, data?: {clinica_activa: boolean, peluqueria_activa: boolean}, error?: string}>} Un objeto con el estado de los servicios.
 */
export async function obtenerConfiguracionServicios() {
  try {
    const db = admin.firestore();
    const configRef = db.collection('configuracion').doc('servicios');
    const docSnap = await configRef.get();
    if (!docSnap.exists) {
      console.log("El documento 'servicios' no existe en 'configuracion'. Se retornan valores por defecto (false).");
      // Si no existe, se asume que los servicios están desactivados por seguridad.
      const defaultConfig = { clinica_activa: false, peluqueria_activa: false };
      return { success: true, data: defaultConfig };
    }
    
    const data = docSnap.data();
    // Nos aseguramos de devolver siempre un booleano para evitar errores en el cliente.
    const config = {
      clinica_activa: !!data.clinica_activa,
      peluqueria_activa: !!data.peluqueria_activa,
    };
    return { success: true, data: config };
  } catch (error) {
    console.error("Error en obtenerConfiguracionServicios:", error);
    return { success: false, error: 'No se pudo cargar la configuración de activación de servicios.' };
  }
}
