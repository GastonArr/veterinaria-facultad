'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function VerificarEmailPage() {
  const router = useRouter();
  const { user, signOut, refreshCurrentUser, sendVerificationEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const completarRegistroPendiente = async (verifiedUser) => {
    const pendingRegistrationRaw = localStorage.getItem('pendingRegistrationProfile');
    if (!pendingRegistrationRaw) return { success: true };

    const pendingRegistration = JSON.parse(pendingRegistrationRaw);
    const idToken = await verifiedUser.getIdToken(true);

    const response = await fetch('/api/auth/complete-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        profileData: {
          ...pendingRegistration,
          email: verifiedUser.email || pendingRegistration.email || '',
        },
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) return { success: false, error: result.error };
    localStorage.removeItem('pendingRegistrationProfile');
    return { success: true };
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const refreshedUser = await refreshCurrentUser();

      if (refreshedUser?.emailVerified) {
        const completionResult = await completarRegistroPendiente(refreshedUser);
        if (!completionResult.success) {
          setError(completionResult.error || 'No pudimos completar tu perfil.');
          return;
        }
        setSuccessMessage('¡Correo verificado correctamente! Redirigiendo...');
        router.push('/');
      } else {
        setError('Todavía no verificaste tu correo. Revisá también la carpeta de spam.');
      }
    } catch (err) {
      console.error('Error al validar verificación de email:', err);
      setError('No pudimos validar tu correo en este momento. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await sendVerificationEmail();
      setSuccessMessage('Te reenviamos el enlace de verificación. Revisá tu correo.');
    } catch (err) {
      console.error('Error al reenviar email de verificación:', err);
      setError('No se pudo reenviar el enlace de verificación. Intentá más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      localStorage.removeItem('pendingRegistrationProfile');
      await signOut();
      router.push('/login?register=1');
    } catch (err) {
      console.error('Error al cancelar el registro:', err);
      setError('No pudimos cancelar el registro en este momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Verificá tu correo</h1>
        <p className="text-sm text-gray-600 mt-3">
          Te enviamos un enlace para confirmar tu cuenta. Cuando lo abras desde tu email, volvé acá y tocá
          <span className="font-semibold"> “Ya verifiqué mi correo”</span>.
        </p>

        {error && <p className="mt-4 bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</p>}
        {successMessage && (
          <p className="mt-4 bg-green-100 text-green-700 p-3 rounded-lg text-sm">{successMessage}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {!user && (
            <p className="text-sm text-gray-600">
              Iniciá sesión con tu cuenta para validar la verificación del correo.
            </p>
          )}
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={loading || !user}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            Ya verifiqué mi correo
          </button>

          <button
            type="button"
            onClick={handleResendEmail}
            disabled={loading}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            Reenviar enlace
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-3 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors disabled:opacity-60"
          >
            Cancelar y volver al registro
          </button>
        </div>
      </section>
    </main>
  );
}
