'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Ingresá un correo electrónico.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'No se pudo validar el correo.');
        return;
      }

      if (!result.exists) {
        setError('Ingresá un correo válido.');
        return;
      }

      await resetPassword(normalizedEmail);
      setSuccessMessage('Te enviamos un enlace para restablecer tu contraseña. Revisá tu bandeja de entrada.');
      setEmail('');
    } catch (submitError) {
      console.error('Error al solicitar recuperación de contraseña:', submitError);
      setError('No se pudo enviar el correo de restablecimiento. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Recuperar Contraseña</h1>

        <div className="bg-white p-8 rounded-2xl shadow-lg w-full">
          {error && (
            <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-center text-sm">{error}</p>
          )}

          {successMessage && (
            <p className="bg-green-100 text-green-700 p-3 rounded-lg mb-6 text-center text-sm">{successMessage}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="tuemail@ejemplo.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Validando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/login" className="text-sm font-semibold text-blue-500 hover:underline">
              Volver a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
