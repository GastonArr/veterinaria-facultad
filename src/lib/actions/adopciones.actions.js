'use server';

import admin from '@/lib/firebaseAdmin';

// ... (la función getMascotasEnAdopcion se mantiene igual)
export async function getMascotasEnAdopcion() {
  const firestore = admin.firestore();
  try {
    const snapshot = await firestore
      .collectionGroup('mascotas')
      .where('enAdopcion', '==', true)
      .orderBy('fechaNacimiento', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    const mascotas = snapshot.docs.map(doc => {
      const data = doc.data();
      const fechaNacimiento = data.fechaNacimiento?.toDate ? data.fechaNacimiento.toDate().toISOString() : null;
      const fechaRegistro = data.fechaRegistro?.toDate ? data.fechaRegistro.toDate().toISOString() : null;

      return {
        id: doc.id,
        path: doc.ref.path,
        ...data,
        fechaNacimiento,
        fechaRegistro,
      };
    });

    return mascotas;

  } catch (error) {
    console.error('Error inesperado al obtener las mascotas en adopción:', error);
    return [];
  }
}

/**
 * @function toggleCandidatoAdopcion
 * @description Agrega o quita al usuario de la lista de candidatos con un solo clic.
 * @param {string} mascotaPath - La ruta completa del documento de la mascota.
 * @param {object} datos - { uid, nombre, telefono }
 */
export async function toggleCandidatoAdopcion(mascotaPath, datos) {
  if (!mascotaPath || typeof mascotaPath !== 'string') {
    return { success: false, message: 'La referencia a la mascota no es válida.' };
  }
  if (!datos || !datos.uid) {
    return { success: false, message: 'Debes iniciar sesión para postularte.' };
  }

  const firestore = admin.firestore();
  try {
    const mascotaRef = firestore.doc(mascotaPath);
    let actionTaken = '';

    await firestore.runTransaction(async (t) => {
      const docSnap = await t.get(mascotaRef);
      if (!docSnap.exists) throw new Error("La mascota no existe");

      const data = docSnap.data();
      let candidatos = data.candidatos || [];

      const exists = candidatos.some(c => c.uid === datos.uid);

      if (exists) {
        candidatos = candidatos.filter(c => c.uid !== datos.uid);
        actionTaken = 'removed';
      } else {
        candidatos.push({
          uid: datos.uid,
          nombre: datos.nombre || 'Usuario',
          telefono: datos.telefono || 'Sin teléfono',
          fecha: new Date().toISOString()
        });
        actionTaken = 'added';
      }

      t.update(mascotaRef, { candidatos });
    });

    if (actionTaken === 'added') {
      return { success: true, message: '¡Postulación enviada exitosamente!' };
    } else {
      return { success: true, message: 'Postulación retirada.' };
    }

  } catch (error) {
    console.error('Error al procesar la postulación en Firestore:', error);
    return { success: false, message: 'No se pudo procesar tu solicitud ahora. Inténtalo más tarde.' };
  }
}
