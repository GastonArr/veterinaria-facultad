'use server';

import { revalidatePath } from 'next/cache';
import admin from '@/lib/firebaseAdmin';
import { isValidArgentineDni, sanitizeDni } from '@/lib/utils/dni';
import { validateArgentinePhone } from '@/lib/utils/phone';


export async function signInWithGoogle(idToken) {
  if (!idToken) {
    return { success: false, error: 'No se proporcionó un token de ID.' };
  }

  const auth = admin.auth();
  const firestore = admin.firestore();

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const displayName = decodedToken.name || '';

    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    let userRole = 'dueño';
    let profileCompleted = false;

    if (userDoc.exists) {
      const userData = userDoc.data();
      userRole = userData.role || userRole;
      profileCompleted = userData.profileCompleted || false;
    } else {
      const [nombre, ...apellidoParts] = displayName.split(' ');
      const apellido = apellidoParts.join(' ');
      
      try {
        await auth.getUser(uid);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          await auth.createUser({
            uid: uid,
            email: email,
            displayName: displayName
          });
        } else {
          throw error;
        }
      }

      await userDocRef.set({
        nombre: nombre || '',
        apellido: apellido || '',
        email: email,
        role: userRole,
        profileCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      await auth.setCustomUserClaims(uid, { role: userRole });
    }

    const customToken = await auth.createCustomToken(uid);

    return {
      success: true,
      token: customToken,
      user: {
        uid,
        email,
        role: userRole,
        profileCompleted: profileCompleted
      }
    };

  } catch (error) {
    console.error('Error en signInWithGoogle:', error);
    if (error.code === 'auth/id-token-expired') {
        return { success: false, error: 'El token de sesión ha expirado. Por favor, inicia sesión de nuevo.' };
    }
    return { success: false, error: 'Ocurrió un error en el servidor durante el inicio de sesión con Google.' };
  }
}

export async function registerWithEmail(userData) {
  const { email, password, nombre, apellido, dni, telefonoPrincipal, telefonoSecundario, direccion, provincia, ciudad, barrio, calle, altura, nombreContactoEmergencia, telefonoContactoEmergencia } = userData;
  const dniNormalizado = sanitizeDni(dni);

  if (!email || !password || !nombre || !apellido || !dniNormalizado) {
    return { success: false, error: 'Faltan datos esenciales para el registro.' };
  }
  if (!isValidArgentineDni(dni)) {
    return { success: false, error: 'El DNI ingresado no tiene un formato argentino válido.' };
  }
  const telefonoPrincipalValidation = validateArgentinePhone(telefonoPrincipal);
  if (!telefonoPrincipalValidation.isValid) {
    return { success: false, error: `Teléfono principal: ${telefonoPrincipalValidation.error}` };
  }
  if (telefonoSecundario && telefonoSecundario.trim()) {
    const telefonoSecundarioValidation = validateArgentinePhone(telefonoSecundario);
    if (!telefonoSecundarioValidation.isValid) {
      return { success: false, error: `Teléfono secundario: ${telefonoSecundarioValidation.error}` };
    }
  }
  const telefonoEmergenciaValidation = validateArgentinePhone(telefonoContactoEmergencia);
  if (!telefonoEmergenciaValidation.isValid) {
    return { success: false, error: `Teléfono de emergencia: ${telefonoEmergenciaValidation.error}` };
  }

  const auth = admin.auth();
  const firestore = admin.firestore();

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${nombre} ${apellido}`,
    });

    const userId = userRecord.uid;
    // MODIFICACIÓN: Rol 'dueño' asignado por defecto a todos los nuevos usuarios.
    const userRole = 'dueño'; 

    await auth.setCustomUserClaims(userId, { role: userRole });

    await firestore.collection('users').doc(userId).set({
      nombre,
      apellido,
      dni: dniNormalizado,
      email,
      telefonoPrincipal,
      telefonoSecundario: telefonoSecundario || '',
      direccion,
      provincia: provincia || 'La Pampa',
      ciudad: ciudad || 'Santa Rosa',
      barrio: barrio || '',
      calle: calle || '',
      altura: altura || '',
      nombreContactoEmergencia,
      telefonoContactoEmergencia,
      role: userRole,
      profileCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    revalidatePath('/');
    
    const customToken = await auth.createCustomToken(userId);

    return { 
      success: true, 
      token: customToken,
      user: {
        uid: userId, 
        email: userRecord.email, 
        role: userRole,
        profileCompleted: true
      } 
    };

  } catch (error) {
    console.error('Error en registerWithEmail:', error);
    if (error.code === 'auth/email-already-exists') {
      return { success: false, error: 'El correo electrónico ya está en uso.' };
    }
    return { success: false, error: 'Ocurrió un error en el servidor durante el registro.' };
  }
}

const validacionDatosCompletarPerfil = (data) => {
  const errors = {};
  const {
      nombre,
      apellido,
      dni,
      telefonoPrincipal,
      telefonoSecundario,
      direccion,
      email,
      provincia,
      ciudad,
      barrio,
      calle,
      altura,
      nombreContactoEmergencia,
      telefonoContactoEmergencia
  } = data;

  if (!nombre || !nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  else if (!/^[a-zA-Z\s]+$/.test(nombre)) errors.nombre = 'El nombre solo puede contener letras.';

  if (!apellido || !apellido.trim()) errors.apellido = 'El apellido es obligatorio.';
  else if (!/^[a-zA-Z\s]+$/.test(apellido)) errors.apellido = 'El apellido solo puede contener letras.';

  if (!dni || !dni.trim()) errors.dni = 'El DNI es obligatorio.';
  else if (!isValidArgentineDni(dni)) errors.dni = 'El DNI debe tener un formato argentino válido.';

  if (!direccion || !direccion.trim()) errors.direccion = 'La dirección es obligatoria.';
  if (!barrio || !barrio.trim()) errors.barrio = 'El barrio es obligatorio.';
  if (!calle || !calle.trim()) errors.calle = 'La calle es obligatoria.';
  if (!altura || !altura.toString().trim()) errors.altura = 'La altura es obligatoria.';

  if (!telefonoPrincipal || !telefonoPrincipal.trim()) errors.telefonoPrincipal = 'El teléfono principal es obligatorio.';
  else {
    const telefonoPrincipalValidation = validateArgentinePhone(telefonoPrincipal);
    if (!telefonoPrincipalValidation.isValid) errors.telefonoPrincipal = telefonoPrincipalValidation.error;
  }

  if (telefonoSecundario && telefonoSecundario.trim()) {
      const telefonoSecundarioValidation = validateArgentinePhone(telefonoSecundario);
      if (!telefonoSecundarioValidation.isValid) errors.telefonoSecundario = telefonoSecundarioValidation.error;
  }

  if (!nombreContactoEmergencia || !nombreContactoEmergencia.trim()) errors.nombreContactoEmergencia = 'El nombre del contacto de emergencia es obligatorio.';
  else if (!/^[a-zA-Z\s]+$/.test(nombreContactoEmergencia)) errors.nombreContactoEmergencia = 'El nombre del contacto de emergencia solo puede contener letras.';

  if (!telefonoContactoEmergencia || !telefonoContactoEmergencia.trim()) errors.telefonoContactoEmergencia = 'El teléfono de emergencia es obligatorio.';
  else {
    const telefonoEmergenciaValidation = validateArgentinePhone(telefonoContactoEmergencia);
    if (!telefonoEmergenciaValidation.isValid) errors.telefonoContactoEmergencia = telefonoEmergenciaValidation.error;
  }

  return errors;
};

export async function completarPerfil(userId, userData) {
  const validationErrors = validacionDatosCompletarPerfil(userData);
  const errorValues = Object.values(validationErrors);

  if (errorValues.length > 0) {
    const errorMessage = errorValues.join(' ');
    return { success: false, error: errorMessage };
  }


  const firestore = admin.firestore();
  const auth = admin.auth();
  const { 
    nombre, 
    apellido, 
    dni, 
    telefonoPrincipal, 
    telefonoSecundario, 
    direccion, 
    email,
    provincia,
    ciudad,
    barrio,
    calle,
    altura,
    nombreContactoEmergencia, 
    telefonoContactoEmergencia 
  } = userData;
  
  const dniNormalizado = sanitizeDni(dni);

  if (!userId) {
    return { success: false, error: 'Error de autenticación: Falta el ID de usuario.' };
  }

  try {
    const userRole = 'dueño';

    await auth.updateUser(userId, {
        displayName: `${nombre} ${apellido}`
    });

    await auth.setCustomUserClaims(userId, { role: userRole });

    await firestore.collection('users').doc(userId).set({
      nombre,
      apellido,
      dni: dniNormalizado,
      telefonoPrincipal,
      telefonoSecundario: telefonoSecundario || '',
      direccion,
      email: email || '',
      provincia: provincia || 'La Pampa',
      ciudad: ciudad || 'Santa Rosa',
      barrio: barrio || '',
      calle: calle || '',
      altura: altura || '',
      nombreContactoEmergencia,
      telefonoContactoEmergencia,
      role: userRole,
      profileCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    revalidatePath('/');
    return { success: true, role: userRole };

  } catch (error) {
    console.error('Error al completar el perfil:', error);
    return { success: false, error: 'Ocurrió un error en el servidor al guardar el perfil.' };
  }
}


export async function agregarMascota(userId, mascotaData) {
    if (!userId) return { success: false, error: 'Usuario no autenticado.' };
    const { nombre, especie, raza, fechaNacimiento, tamaño, enAdopcion } = mascotaData;
    if (!nombre || !especie || !raza || !fechaNacimiento || !tamaño) {
        return { success: false, error: 'Todos los campos son obligatorios.' };
    }
    const firestore = admin.firestore();
    try {
        const mascotaRef = await firestore.collection('users').doc(userId).collection('mascotas').add({
            nombre, especie, raza, fechaNacimiento, tamaño,
            enAdopcion: enAdopcion || false, 
            createdAt: new Date(),
        });
        revalidatePath('/mascotas');
        return { success: true, mascotaId: mascotaRef.id };
    } catch (error) {
        console.error('Error al agregar la mascota:', error);
        return { success: false, error: 'No se pudo registrar la mascota.' };
    }
}

export async function actualizarPerfil(userId, userData) {
  const firestore = admin.firestore();
  const { 
    nombre,
    apellido,
    telefonoPrincipal, 
    telefonoSecundario, 
    direccion, 
    barrio,
    calle,
    altura,
    nombreContactoEmergencia, 
    telefonoContactoEmergencia 
  } = userData;
  
  const datosActualizables = {
    nombre,
    apellido,
    telefonoPrincipal,
    telefonoSecundario: telefonoSecundario || '',
    direccion,
    barrio: barrio || '',
    calle: calle || '',
    altura: altura || '',
    nombreContactoEmergencia,
    telefonoContactoEmergencia,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!userId || !nombre || !apellido || !telefonoPrincipal || !direccion || !nombreContactoEmergencia || !telefonoContactoEmergencia) {
    return { success: false, error: 'Faltan datos esenciales para actualizar.' };
  }
  const telefonoPrincipalValidation = validateArgentinePhone(telefonoPrincipal);
  if (!telefonoPrincipalValidation.isValid) {
    return { success: false, error: `Teléfono principal: ${telefonoPrincipalValidation.error}` };
  }
  if (telefonoSecundario && telefonoSecundario.trim()) {
    const telefonoSecundarioValidation = validateArgentinePhone(telefonoSecundario);
    if (!telefonoSecundarioValidation.isValid) {
      return { success: false, error: `Teléfono secundario: ${telefonoSecundarioValidation.error}` };
    }
  }
  const telefonoEmergenciaValidation = validateArgentinePhone(telefonoContactoEmergencia);
  if (!telefonoEmergenciaValidation.isValid) {
    return { success: false, error: `Teléfono de emergencia: ${telefonoEmergenciaValidation.error}` };
  }

  try {
    await admin.auth().updateUser(userId, {
      displayName: `${nombre} ${apellido}`
    });
    await firestore.collection('users').doc(userId).update(datosActualizables);
    revalidatePath('/mis-datos');
    return { success: true, message: '¡Perfil actualizado con éxito!' };

  } catch (error) {
    console.error('Error al actualizar el perfil en el servidor:', error);
    return { success: false, error: 'Ocurrió un error en el servidor al actualizar tu perfil.' };
  }
}
