import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { success: false, error: 'Debes ingresar un correo electrónico.' },
        { status: 400 }
      );
    }

    const auth = admin.auth();
    const firestore = admin.firestore();

    let userRecord = null;
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail);
    } catch (authError) {
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    if (!userRecord) {
      return NextResponse.json({ success: true, exists: false });
    }

    const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
    return NextResponse.json({ success: true, exists: userDoc.exists });
  } catch (error) {
    console.error('Error validando email para recuperar contraseña:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo validar el correo en este momento.' },
      { status: 500 }
    );
  }
}
