'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import PasswordStrengthMeter from '@/app/components/PasswordStrengthMeter';
import { BARRIOS_SANTA_ROSA, CIUDAD_FIJA, PROVINCIA_FIJA, construirDireccion } from '@/lib/utils/direccion';
import { getPasswordValidation } from '@/lib/utils/passwordValidation';
import { formatDni, isValidArgentineDni, sanitizeDni } from '@/lib/utils/dni';
import { buildArgentinePhone, validateArgentinePhone } from '@/lib/utils/phone';

const BARRIO_OTRO_VALUE = '__OTRO_BARRIO__';

const PhonePairInput = ({ fieldName, areaCode, number, onPartChange, required = false, helperText = null }) => {
    return (
        <div className="space-y-2">
            {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
            <div className="grid grid-cols-2 gap-3">
            <input
                placeholder="Área (sin 0)"
                value={areaCode}
                onChange={(e) => onPartChange(fieldName, 'areaCode', e.target.value)}
                required={required}
                maxLength={4}
                className="w-full p-3 bg-gray-50 border-gray-200 rounded-lg"
                type="tel"
                inputMode="numeric"
            />
            <input
                placeholder="Número (sin 15)"
                value={number}
                onChange={(e) => onPartChange(fieldName, 'number', e.target.value)}
                required={required}
                maxLength={8}
                className="w-full p-3 bg-gray-50 border-gray-200 rounded-lg"
                type="tel"
                inputMode="numeric"
            />
            </div>
        </div>
    );
};

export default function LoginPage() {
    const {
        user,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmailAndPassword,
        sendVerificationEmail,
        refreshCurrentUser,
    } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '', apellido: '', dni: '', telefonoPrincipal: '', telefonoSecundario: '', 
        provincia: PROVINCIA_FIJA,
        ciudad: CIUDAD_FIJA,
        barrio: '',
        calle: '',
        altura: '',
        direccion: '',
        nombreContactoEmergencia: '', telefonoContactoEmergencia: ''
    });
    const [phoneParts, setPhoneParts] = useState({
        telefonoPrincipal: { areaCode: '', number: '' },
        telefonoContactoEmergencia: { areaCode: '', number: '' },
    });
    const [barrioSeleccionado, setBarrioSeleccionado] = useState('');
    const mostrarCampoBarrioManual = barrioSeleccionado === BARRIO_OTRO_VALUE;
    const requiereVerificacionEmail =
        user?.providerData?.some(provider => provider.providerId === 'password') && !user?.emailVerified;

    useEffect(() => {
        if (searchParams.get('register') === '1') {
            setIsRegistering(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            if (requiereVerificacionEmail) {
                router.push('/verificar-email');
                return;
            }
            if (user.profileCompleted) {
                router.push('/');
            } else {
                router.push('/completar-perfil');
            }
        }
    }, [user, requiereVerificacionEmail, router]);

    const handleLoginWithGoogle = async () => {
        setError(null);
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error('Fallo al iniciar sesión con Google', error);
            setError('Fallo al iniciar sesión con Google. Por favor, intenta de nuevo.');
        }
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (isRegistering) {
            if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");
            const passwordValidation = getPasswordValidation(password);
            if (!passwordValidation.isValid) {
                return setError(`La contraseña no cumple con los requisitos: ${passwordValidation.unmetRequirements[0].text}.`);
            }
            if (!isValidArgentineDni(formData.dni)) {
                return setError('Ingresá un DNI argentino válido (7 u 8 dígitos, con o sin puntos).');
            }
            if (!formData.barrio || !formData.calle || !formData.altura) return setError('Debes completar barrio, calle y altura.');
            const telefonoPrincipalValidation = validateArgentinePhone(formData.telefonoPrincipal);
            if (!telefonoPrincipalValidation.isValid) return setError(`Teléfono principal: ${telefonoPrincipalValidation.error}`);
            const telefonoEmergenciaValidation = validateArgentinePhone(formData.telefonoContactoEmergencia);
            if (!telefonoEmergenciaValidation.isValid) return setError(`Teléfono de emergencia: ${telefonoEmergenciaValidation.error}`);
            
            try {
                const direccion = construirDireccion(formData);
                const profileData = { ...formData, dni: sanitizeDni(formData.dni), direccion, email };

                await registerWithEmailAndPassword(email, password);
                localStorage.setItem('pendingRegistrationProfile', JSON.stringify(profileData));
                await sendVerificationEmail();
                router.push('/verificar-email');
            } catch (error) {
                console.error('Fallo al registrar', error);

                if (error?.code === 'auth/email-already-in-use') {
                    try {
                        await loginWithEmail(email, password);
                        const refreshedUser = await refreshCurrentUser();
                        const inicioConPassword = refreshedUser?.providerData?.some(provider => provider.providerId === 'password');

                        if (inicioConPassword && !refreshedUser?.emailVerified) {
                            localStorage.setItem('pendingRegistrationProfile', JSON.stringify(profileData));
                            await sendVerificationEmail();
                            setError('Ya existe una cuenta pendiente de verificación para ese correo. Reenviamos el enlace.');
                            router.push('/verificar-email');
                            return;
                        }
                    } catch {
                        setError('Ese correo ya está registrado. Si no recordás la contraseña, usá “¿Olvidaste tu contraseña?”.');
                        return;
                    }
                }

                setError(error.message || 'No se pudo iniciar el proceso de registro.');
            }
        } else {
            try {
                await loginWithEmail(email, password);
                const refreshedUser = await refreshCurrentUser();
                const inicioConPassword = refreshedUser?.providerData?.some(provider => provider.providerId === 'password');

                if (inicioConPassword && !refreshedUser?.emailVerified) {
                    await sendVerificationEmail();
                    setError('Tu correo no está verificado. Te reenviamos el enlace para verificarlo.');
                    router.push('/verificar-email');
                }
            } catch (error) {
                console.error('Fallo al iniciar sesión', error);
                setError('Email o contraseña incorrectos.');
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'dni') {
            const formattedDni = formatDni(value);
            setFormData(prev => ({ ...prev, dni: formattedDni }));
            return;
        }
        if (name === 'altura' && value && !/^[0-9]+$/.test(value)) return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhonePartChange = (fieldName, partName, partValue) => {
        const sanitizedPart = partValue.replace(/\D/g, '');
        setPhoneParts((prev) => {
            const nextFieldParts = {
                ...prev[fieldName],
                [partName]: (partName === 'areaCode' ? sanitizedPart.slice(0, 4) : sanitizedPart.slice(0, 8)),
            };

            setFormData((prevFormData) => ({
                ...prevFormData,
                [fieldName]: buildArgentinePhone(nextFieldParts.areaCode, nextFieldParts.number),
            }));

            return {
                ...prev,
                [fieldName]: nextFieldParts,
            };
        });
    };

    const handleBarrioChange = (e) => {
        const { value } = e.target;
        setBarrioSeleccionado(value);
        if (value === BARRIO_OTRO_VALUE) {
            setFormData(prev => ({ ...prev, barrio: '' }));
            return;
        }
        setFormData(prev => ({ ...prev, barrio: value }));
    };

    return (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm mx-auto">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">{
                    isRegistering ? 'Crear una Cuenta' : 'Iniciar Sesión'
                }</h1>

                <div className="bg-white p-8 rounded-2xl shadow-lg w-full">
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-center text-sm">{error}</p>}

                    <form onSubmit={handleFormSubmit} className="space-y-5">
                        <div>
                            <label className="text-xs font-semibold text-gray-600">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required 
                                className="mt-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                        </div>

                        <div>
                            <div className="flex justify-between items-baseline">
                                <label className="text-xs font-semibold text-gray-600">Contraseña</label>
                                {!isRegistering && (
                                    <Link href="/login/forgot-password" className="text-xs text-blue-500 hover:underline font-semibold">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                )}
                            </div>
                            <div className="relative mt-1">
                                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500">
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                        
                        {isRegistering && (
                            <>
                                <PasswordStrengthMeter password={password} />
                                <div>
                                    <label className="text-xs font-semibold text-gray-600">Confirmar Contraseña</label>
                                    <div className="relative mt-1">
                                        <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                                    </div>
                                </div>
                                
                                <hr className="my-4"/>

                                <h2 className="text-center text-base font-semibold text-gray-700">Tu Información</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleInputChange} required className="w-full p-3 bg-gray-50 border-gray-200 rounded-lg"/>
                                    <input name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleInputChange} required className="w-full p-3 bg-gray-50 border-gray-200 rounded-lg"/>
                                </div>
                                <input name="dni" placeholder="DNI" value={formData.dni} onChange={handleInputChange} required maxLength="10" className="w-full p-3 bg-gray-50 border-gray-200 rounded-lg"/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input value={formData.provincia} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600"/>
                                    <input value={formData.ciudad} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600"/>
                                </div>
                                <select name="barrioSeleccionado" value={barrioSeleccionado} onChange={handleBarrioChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <option value="">Elegí un barrio de Santa Rosa</option>
                                    {BARRIOS_SANTA_ROSA.map((barrio) => (
                                        <option key={barrio} value={barrio}>{barrio}</option>
                                    ))}
                                    <option value={BARRIO_OTRO_VALUE}>Otros</option>
                                </select>
                                {mostrarCampoBarrioManual && (
                                    <input
                                        name="barrio"
                                        placeholder="Ingresá tu barrio"
                                        value={formData.barrio}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                    />
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="calle" placeholder="Calle" value={formData.calle} onChange={handleInputChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"/>
                                    <input name="altura" placeholder="Altura" value={formData.altura} onChange={handleInputChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"/>
                                </div>
                                <PhonePairInput
                                    fieldName="telefonoPrincipal"
                                    areaCode={phoneParts.telefonoPrincipal.areaCode}
                                    number={phoneParts.telefonoPrincipal.number}
                                    onPartChange={handlePhonePartChange}
                                    helperText="Ingresá tu teléfono: código de área sin 0 y número sin 15 (ej.: 2942 559056 o 299 4641790)."
                                    required
                                />
                                
                                <h2 className="text-center text-base font-semibold text-gray-700">Contacto de Emergencia</h2>
                                <input name="nombreContactoEmergencia" placeholder="Nombre" value={formData.nombreContactoEmergencia} onChange={handleInputChange} required className="w-full p-3 bg-gray-50 border-gray-200 rounded-lg"/>
                                <PhonePairInput fieldName="telefonoContactoEmergencia" areaCode={phoneParts.telefonoContactoEmergencia.areaCode} number={phoneParts.telefonoContactoEmergencia.number} onPartChange={handlePhonePartChange} required />
                            </>
                        )}

                        <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
                            {isRegistering ? 'Registrarse' : 'Entrar'}
                        </button>
                    </form>
                    
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-600">¿{isRegistering ? 'Ya tienes' : 'No tienes'} una cuenta? 
                            <button onClick={() => { setIsRegistering(!isRegistering); setError(null); }} className="font-semibold text-blue-500 hover:underline ml-1">
                                {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
                            </button>
                        </p>
                    </div>
                </div>

                <div className="text-center my-6 text-gray-400 text-xs tracking-wider">o</div>

                <button onClick={handleLoginWithGoogle} 
                    className="w-full flex items-center justify-center py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-md">
                    <span className="text-sm font-semibold text-gray-700 mr-2">Continuar con</span>
                    <span className="text-sm font-bold">
                        <span style={{ color: '#4285F4' }}>G</span>
                        <span style={{ color: '#EA4335' }}>o</span>
                        <span style={{ color: '#FBBC05' }}>o</span>
                        <span style={{ color: '#4285F4' }}>g</span>
                        <span style={{ color: '#34A853' }}>l</span>
                        <span style={{ color: '#EA4335' }}>e</span>
                    </span>
                </button>
            </div>
        </div>
    );
}
