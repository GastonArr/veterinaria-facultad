'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyResetCode, handlePasswordReset } = useAuth();


    const [mode, setMode] = useState(null);
    const [oobCode, setOobCode] = useState(null);
    const [isValidCode, setIsValidCode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const modeParam = searchParams.get('mode');
        const codeParam = searchParams.get('oobCode');

        setMode(modeParam);
        setOobCode(codeParam);

        if (modeParam !== 'resetPassword' || !codeParam) {
            setError('URL inválida. Por favor, solicita un nuevo enlace para restablecer tu contraseña.');
            setIsLoading(false);
            return;
        }

      
        verifyResetCode(codeParam)
            .then(() => {
                setIsValidCode(true);
                setError(null);
            })
            .catch(err => {
                if (err.code === 'auth/expired-action-code') {
                    setError('El enlace ha expirado. Por favor, solicita uno nuevo.');
                } else {
                    setError('El enlace no es válido. Puede que ya haya sido utilizado.');
                }
                setIsValidCode(false);
            })
            .finally(() => {
                setIsLoading(false);
            });

    }, [searchParams, verifyResetCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        try {
            await handlePasswordReset(oobCode, newPassword);
            setSuccess(true);
        } catch (err) {
            setError('Hubo un error al cambiar la contraseña. Por favor, intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center text-gray-500">Verificando enlace...</p>;
        }

        if (error) {
            return (
                <div className="text-center">
                    <p className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</p>
                    <Link href="/login/forgot-password">
                        <span className="mt-4 inline-block text-violet-600 hover:underline">Solicitar nuevo enlace</span>
                    </Link>
                </div>
            );
        }

        if (success) {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-4">¡Contraseña actualizada!</h2>
                    <p className="text-gray-700">Tu contraseña ha sido cambiada exitosamente.</p>
                    <Link href="/login">
                        <span className="mt-6 inline-block bg-violet-600 text-white py-3 px-6 rounded-lg hover:bg-violet-700 transition-colors">Ir a Iniciar Sesión</span>
                    </Link>
                </div>
            );
        }

        if (isValidCode) {
            return (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                        <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            );
        }
        
        return null;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
                <div>
                    <h1 className="text-center text-3xl font-extrabold text-gray-900">Restablecer Contraseña</h1>
                </div>
                {renderContent()}
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
