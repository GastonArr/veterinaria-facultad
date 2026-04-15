import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { completarPerfil } from '@/lib/actions/user.actions.js';

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

    const result = await completarPerfil(userId, profileData || {});

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo completar el perfil.' },
        { status: 400 }
      );
    }

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
