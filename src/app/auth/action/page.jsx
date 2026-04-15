'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import PasswordStrengthMeter from '@/app/components/PasswordStrengthMeter';
import { getPasswordValidation } from '@/lib/utils/passwordValidation';

function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyResetCode, handlePasswordReset, verifyEmailWithCode } = useAuth();

    const [oobCode, setOobCode] = useState(null);
    const [mode, setMode] = useState(null);
    const [isValidCode, setIsValidCode] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const modeParam = searchParams.get('mode');
        const codeParam = searchParams.get('oobCode');

        setMode(modeParam);
        setOobCode(codeParam);

        if (!codeParam) {
            setError('URL inválida. Falta el código de acción.');
            setIsVerifying(false);
            return;
        }

        if (modeParam === 'verifyEmail') {
            verifyEmailWithCode(codeParam)
                .then(() => {
                    setIsValidCode(true);
                    setError(null);
                    setSuccess(true);
                })
                .catch((err) => {
                    if (err.code === 'auth/expired-action-code') {
                        setError('El enlace de verificación expiró. Volvé a solicitar uno.');
                    } else {
                        setError('No se pudo verificar el correo. El enlace puede ser inválido o usado.');
                    }
                    setIsValidCode(false);
                })
                .finally(() => {
                    setIsVerifying(false);
                });
            return;
        }

        if (modeParam === 'resetPassword') {
            verifyResetCode(codeParam)
                .then(() => {
                    setIsValidCode(true);
                    setError(null);
                })
                .catch((err) => {
                    if (err.code === 'auth/expired-action-code') {
                        setError('El enlace ha expirado. Por favor, solicita uno nuevo.');
                    } else {
                        setError('El enlace no es válido. Puede que ya haya sido utilizado.');
                    }
                    setIsValidCode(false);
                })
                .finally(() => {
                    setIsVerifying(false);
                });
            return;
        }

        setError('Tipo de enlace inválido.');
        setIsVerifying(false);
    }, [searchParams, verifyResetCode, verifyEmailWithCode]);

    useEffect(() => {
        if (!success || mode !== 'resetPassword') return;

        const redirectTimeout = setTimeout(() => {
            router.push('/login');
        }, 2500);

        return () => clearTimeout(redirectTimeout);
    }, [success, mode, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        const passwordValidation = getPasswordValidation(newPassword);
        if (!passwordValidation.isValid) {
            setError(`La contraseña no cumple con los requisitos: ${passwordValidation.unmetRequirements[0].text}.`);
            return;
        }

        setIsSubmitting(true);

        try {
            await handlePasswordReset(oobCode, newPassword);
            setSuccess(true);
        } catch {
            setError('Hubo un error al cambiar la contraseña. Por favor, intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (isVerifying) {
            return <p className="text-center text-gray-500">Verificando enlace...</p>;
        }

        if (success) {
            if (mode === 'verifyEmail') {
                return (
                    <div className="text-center space-y-3">
                        <h2 className="text-2xl font-bold text-green-600">¡Correo verificado!</h2>
                        <p className="text-sm text-gray-700">Tu cuenta ya quedó validada correctamente.</p>
                        <Link href="/verificar-email" className="inline-block mt-2 text-sm font-semibold text-blue-600 hover:underline">
                            Volver a la pantalla de verificación
                        </Link>
                    </div>
                );
            }

            return (
                <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold text-green-600">¡Contraseña actualizada!</h2>
                    <p className="text-sm text-gray-700">Tu contraseña se cambió exitosamente.</p>
                    <p className="text-xs text-gray-500">Por seguridad, volvé a iniciar sesión. Redirigiendo...</p>
                    <Link href="/login" className="inline-block mt-2 text-sm font-semibold text-blue-600 hover:underline">
                        Ir a Iniciar Sesión ahora
                    </Link>
                </div>
            );
        }

        if (error && !isValidCode) {
            return (
                <div className="text-center">
                    <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>
                    {mode === 'verifyEmail' ? (
                        <Link href="/verificar-email" className="text-sm text-blue-600 hover:underline font-semibold">
                            Volver a verificar correo
                        </Link>
                    ) : (
                        <Link href="/login/forgot-password" className="text-sm text-blue-600 hover:underline font-semibold">
                            Solicitar nuevo enlace
                        </Link>
                    )}
                </div>
            );
        }

        if (mode !== 'resetPassword') {
            return <p className="text-center text-gray-500">Procesando acción...</p>;
        }

        return (
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center text-sm">{error}</p>}

                <div>
                    <label htmlFor="newPassword" className="text-xs font-semibold text-gray-600">Nueva Contraseña</label>
                    <div className="relative mt-1">
                        <input
                            id="newPassword"
                            name="newPassword"
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </div>

                <PasswordStrengthMeter password={newPassword} />

                <div>
                    <label htmlFor="confirmPassword" className="text-xs font-semibold text-gray-600">Confirmar Contraseña</label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="mt-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-300"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
            </form>
        );
    };

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm mx-auto">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
                    {mode === 'verifyEmail' ? 'Verificación de Correo' : 'Restablecer Contraseña'}
                </h1>
                <div className="bg-white p-8 rounded-2xl shadow-lg w-full">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ResetPasswordPage />
        </Suspense>
    );
}
