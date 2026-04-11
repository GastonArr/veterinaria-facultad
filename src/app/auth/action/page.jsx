'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import PasswordStrengthMeter, { validatePassword } from '@/app/components/PasswordStrengthMeter';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const { verifyResetCode, handlePasswordReset } = useAuth();


    const [oobCode, setOobCode] = useState(null);
    const [isValidCode, setIsValidCode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const modeParam = searchParams.get('mode');
        const codeParam = searchParams.get('oobCode');

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

        if (!validatePassword(newPassword)) {
            setError('La contraseña no cumple con los requisitos de seguridad.');
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
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="newPassword" className="text-xs font-semibold text-gray-600">Nueva Contraseña</label>
                        <div className="relative mt-1">
                            <input
                                id="newPassword"
                                name="newPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500">
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <div className="mt-2">
                            <PasswordStrengthMeter password={newPassword} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="text-xs font-semibold text-gray-600">Confirmar Contraseña</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            required
                            className="mt-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
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
        <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Restablecer Contraseña</h1>
                </div>
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
