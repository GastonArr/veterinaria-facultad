import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { isValidArgentineDni, sanitizeDni } from '@/lib/utils/dni';
import { validateArgentinePhone } from '@/lib/utils/phone';

function validarPerfil(profileData) {
  const {
    nombre,
    apellido,
    dni,
    telefonoPrincipal,
    telefonoSecundario,
    direccion,
    barrio,
    calle,
    altura,
    nombreContactoEmergencia,
    telefonoContactoEmergencia,
  } = profileData;

  if (!nombre || !apellido) return 'Nombre y apellido son obligatorios.';
  if (!dni || !isValidArgentineDni(dni)) return 'El DNI debe tener un formato argentino válido.';
  if (!direccion || !barrio || !calle || !altura) return 'Dirección incompleta: faltan barrio, calle o altura.';
  if (!telefonoPrincipal) return 'El teléfono principal es obligatorio.';
  if (!nombreContactoEmergencia || !telefonoContactoEmergencia) {
    return 'Los datos del contacto de emergencia son obligatorios.';
  }

  const telefonoPrincipalValidation = validateArgentinePhone(telefonoPrincipal);
  if (!telefonoPrincipalValidation.isValid) return `Teléfono principal: ${telefonoPrincipalValidation.error}`;

  if (telefonoSecundario && telefonoSecundario.trim()) {
    const telefonoSecundarioValidation = validateArgentinePhone(telefonoSecundario);
    if (!telefonoSecundarioValidation.isValid) return `Teléfono secundario: ${telefonoSecundarioValidation.error}`;
  }

  const telefonoEmergenciaValidation = validateArgentinePhone(telefonoContactoEmergencia);
  if (!telefonoEmergenciaValidation.isValid) return `Teléfono de emergencia: ${telefonoEmergenciaValidation.error}`;

  return null;
}

export async function POST(request) {
  try {
    const { idToken, profileData } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Falta el token de autenticación.' },
        { status: 401 }
      );
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar al usuario autenticado.' },
        { status: 401 }
      );
    }

    const validationError = validarPerfil(profileData || {});
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const auth = admin.auth();
    const firestore = admin.firestore();
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
      telefonoContactoEmergencia,
    } = profileData;

    const userRole = 'dueño';
    await auth.updateUser(userId, { displayName: `${nombre} ${apellido}` });
    await auth.setCustomUserClaims(userId, { role: userRole });

    await firestore.collection('users').doc(userId).set(
      {
        nombre,
        apellido,
        dni: sanitizeDni(dni),
        telefonoPrincipal,
        telefonoSecundario: telefonoSecundario || '',
        direccion,
        email: email || decodedToken.email || '',
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
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en complete-registration route:', error);

    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return NextResponse.json(
        { success: false, error: 'Tu sesión expiró. Iniciá sesión nuevamente.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Ocurrió un error al completar el registro.' },
      { status: 500 }
    );
  }
}
