'use server';

import admin from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';

const db = admin.firestore();

// Función auxiliar para convertir Timestamps a un formato serializable (ISO string)
const safeToISOString = (timestamp) => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  // Si ya es un string, lo devuelve. Si no, devuelve null para evitar errores.
  return (typeof timestamp === 'string') ? timestamp : null;
};

// Convierte recursivamente objetos de Firestore (Timestamp, arrays, mapas)
// a valores serializables para poder pasarlos de Server Components a Client Components.
const serializeFirestoreValue = (value) => {
  if (value === null || value === undefined) return value;

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreValue(nestedValue)])
    );
  }

  return value;
};

export async function getAllUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
      return [];
    }
    
    // Usamos .map para transformar los datos de cada usuario
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...serializeFirestoreValue(data),
      };
    });
    
    return users;

  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    return []; // Devolver array vacío en caso de error para no romper la UI
  }
}

export async function getUserByIdAndPets(userId) {
  if (!userId) {
    return { error: "ID de usuario no proporcionado." };
  }

  try {
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { error: "Cliente no encontrado." };
    }

    const userData = userDoc.data();

    const mascotasSnapshot = await userDocRef.collection('mascotas').get();
    const mascotas = [];
    mascotasSnapshot.forEach(doc => {
      const mascotaData = doc.data();
      mascotas.push({
        id: doc.id,
        ...mascotaData,
        // Convertir a ISO string para consistencia
        fechaNacimiento: safeToISOString(mascotaData.fechaNacimiento),
        createdAt: safeToISOString(mascotaData.createdAt),
      });
    });

    return {
      user: { id: userDoc.id, ...userData },
      mascotas: mascotas,
    };

  } catch (error) {
    console.error(`Error al obtener el usuario y sus mascotas (ID: ${userId}):`, error);
    return { error: "Ocurrió un error al cargar los datos del cliente." };
  }
}

export async function getAllAppointmentsWithDetails() {
  try {
    const turnosSnapshot = await db.collectionGroup('turnos').orderBy('fecha', 'desc').get();
    if (turnosSnapshot.empty) {
      return [];
    }

    const appointments = [];
    const ownersCache = {}; // Cache para no buscar el mismo usuario varias veces

    for (const turnoDoc of turnosSnapshot.docs) {
      const turnoData = turnoDoc.data();
      
      const userId = turnoData.clienteId;

      if (!userId) {
        console.warn(`Turno con ID ${turnoDoc.id} no tiene clienteId. Saltando...`);
        continue;
      }

      let ownerData;
      if (ownersCache[userId]) {
        ownerData = ownersCache[userId];
      } else {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          ownerData = userDoc.data();
          ownersCache[userId] = ownerData; // Guardar en cache
        } else {
          ownerData = { nombre: 'Usuario Desconocido', apellido: '' };
        }
      }
      
      appointments.push({
        id: turnoDoc.id,
        ...turnoData,
        fecha: safeToISOString(turnoData.fecha),
        creadoEn: safeToISOString(turnoData.creadoEn),
        owner: {
          id: userId,
          nombre: ownerData.nombre,
          apellido: ownerData.apellido,
          email: ownerData.email,
        },
        userId: userId, 
        mascotaId: turnoData.mascotaId,
        turnoId: turnoDoc.id
      });
    }

    return appointments;

  } catch (error) {
    console.error("Error al obtener todos los turnos:", error);
    return [];
  }
}

/**
 * @action updateUserRole
 * @description Actualiza el rol de un usuario tanto en Firestore como en los Custom Claims de Firebase Authentication.
 * @param {string} userId - El ID del usuario a modificar.
 * @param {string} newRole - El nuevo rol a asignar. Roles válidos: 'admin', 'dueño', 'peluqueria', 'transporte'.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function updateUserRole(userId, newRole) {
  const auth = admin.auth();
  const db = admin.firestore();

  const validRoles = ['admin', 'dueño', 'peluqueria', 'transporte'];

  if (!userId || !newRole) {
    return { success: false, error: 'Faltan el ID de usuario o el nuevo rol.' };
  }

  if (!validRoles.includes(newRole)) {
    return { success: false, error: `El rol '${newRole}' no es válido.` };
  }

  try {
    // 1. Actualizar el Custom Claim en Firebase Auth (Paso CRÍTICO para la seguridad)
    await auth.setCustomUserClaims(userId, { role: newRole });

    // 2. Actualizar el rol en el documento de Firestore para consistencia de datos
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ role: newRole });

    // 3. Revalidar la ruta para que la UI se actualice
    revalidatePath('/admin/empleados');
    
    console.log(`Rol del usuario ${userId} actualizado a ${newRole} exitosamente.`);
    return { success: true, message: `El rol del usuario ha sido actualizado a ${newRole}.` };

  } catch (error) {
    console.error(`Error al actualizar el rol del usuario ${userId}:`, error);
    if (error.code === 'auth/user-not-found') {
        return { success: false, error: 'El usuario no fue encontrado en el sistema de autenticación.' };
    }
    return { success: false, error: 'Ocurrió un error en el servidor al intentar actualizar el rol.' };
  }
}

/**
 * Elimina por completo un usuario del sistema (Firestore + Auth),
 * incluyendo toda su información anidada (mascotas, turnos, historial, etc.).
 */
export async function deleteUserCompletely({ userId, requestedByUserId }) {
  if (!userId) {
    return { success: false, error: 'Falta el ID del usuario a eliminar.' };
  }

  if (requestedByUserId && userId === requestedByUserId) {
    return { success: false, error: 'No puedes eliminar tu propio usuario administrador.' };
  }

  const auth = admin.auth();
  const userRef = db.collection('users').doc(userId);

  try {
    // 1) Borra TODO el árbol de documentos dentro de users/{userId}
    // (mascotas, turnos, carnetSanitario, etc.).
    await db.recursiveDelete(userRef);

    // 2) Borra el usuario de Firebase Authentication.
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    revalidatePath('/admin/empleados');
    revalidatePath('/admin/clientes');
    revalidatePath('/admin/turnos');
    revalidatePath('/turnos/mis-turnos');
    revalidatePath('/mascotas');

    return { success: true, message: 'Usuario eliminado por completo.' };
  } catch (error) {
    console.error(`Error al eliminar por completo al usuario ${userId}:`, error);
    return { success: false, error: 'No se pudo eliminar el usuario por completo.' };
  }
}
