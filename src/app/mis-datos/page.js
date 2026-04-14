'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { actualizarPerfil } from '@/lib/actions/user.actions.js';
import SubHeader from '@/app/components/SubHeader';
import BackLink from '@/app/components/BackLink';
import Modal from '@/app/components/Modal';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaExclamationTriangle, FaSave, FaEdit, FaTimes, FaKey, FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import { BARRIOS_SANTA_ROSA, CIUDAD_FIJA, PROVINCIA_FIJA, construirDireccion } from '@/lib/utils/direccion';
import { buildArgentinePhone, splitArgentinePhone, validateArgentinePhone } from '@/lib/utils/phone';

const BARRIO_OTRO_VALUE = '__OTRO_BARRIO__';

const InfoField = ({ label, value, icon, name, isEditing, onChange, isEditable = true }) => {
    const Icon = icon;
    const canEdit = isEditing && isEditable;

    return (
        <div className="flex items-center mb-4 bg-gray-50 p-3 rounded-lg">
            <Icon className={`mr-4 ${canEdit ? 'text-blue-500' : 'text-gray-400'}`} size={20} />
            <div className="flex-grow">
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                {canEdit ? (
                    <input
                        type={name.includes('telefono') || name === 'dni' || name === 'altura' ? 'tel' : 'text'}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        className="w-full text-lg text-gray-800 bg-white border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition"
                        maxLength={name === 'dni' ? 8 : undefined}
                    />
                ) : (
                    <p className={`text-lg ${isEditable ? 'text-gray-800' : 'text-gray-500'}`}>{value || (isEditable ? 'No especificado' : 'No modificable')}</p>
                )}
            </div>
        </div>
    );
};

const PhoneEditableField = ({ label, name, value, isEditing, onPartChange }) => {
    const { areaCode, number } = splitArgentinePhone(value || '');

    return (
        <div className="flex items-center mb-4 bg-gray-50 p-3 rounded-lg">
            <FaPhone className={`mr-4 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} size={20} />
            <div className="flex-grow">
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                {isEditing ? (
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="tel"
                            value={areaCode}
                            onChange={(e) => onPartChange(name, 'areaCode', e.target.value)}
                            placeholder="Área (sin 0)"
                            maxLength={4}
                            className="w-full text-lg text-gray-800 bg-white border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition px-1"
                        />
                        <input
                            type="tel"
                            value={number}
                            onChange={(e) => onPartChange(name, 'number', e.target.value)}
                            placeholder="Número (sin 15)"
                            maxLength={8}
                            className="w-full text-lg text-gray-800 bg-white border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 transition px-1"
                        />
                    </div>
                ) : (
                    <p className="text-lg text-gray-800">{value || 'No especificado'}</p>
                )}
            </div>
        </div>
    );
};


const Notification = ({ message, type, onClose }) => {
    if (!message) return null;
    const baseClasses = 'p-4 rounded-lg flex justify-between items-center mb-4 shadow-lg';
    const typeClasses = type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <span>{message}</span>
            <button onClick={onClose} className="text-xl font-bold">&times;</button>
        </div>
    );
};

const buildEditableFormData = (data = {}) => ({
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    dni: data.dni || '',
    email: data.email || '',
    telefonoPrincipal: data.telefonoPrincipal || '',
    telefonoSecundario: data.telefonoSecundario || '',
    provincia: data.provincia || PROVINCIA_FIJA,
    ciudad: data.ciudad || CIUDAD_FIJA,
    barrio: data.barrio || '',
    calle: data.calle || '',
    altura: data.altura || '',
    direccion: data.direccion || '',
    nombreContactoEmergencia: data.nombreContactoEmergencia || '',
    telefonoContactoEmergencia: data.telefonoContactoEmergencia || '',
});

export default function MisDatosPage() {
    const { user, resetPassword } = useAuth();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(buildEditableFormData());
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [isPasswordProvider, setIsPasswordProvider] = useState(false);
    const [showPasswordResetConfirmModal, setShowPasswordResetConfirmModal] = useState(false);
    const [showPasswordResetSuccessModal, setShowPasswordResetSuccessModal] = useState(false);
    const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
    const [barrioSeleccionado, setBarrioSeleccionado] = useState('');
    const mostrarCampoBarrioManual = barrioSeleccionado === BARRIO_OTRO_VALUE;

    useEffect(() => {
        if (!user) return;

        if (user.providerData && user.providerData.length > 0) {
            const provider = user.providerData[0].providerId;
            setIsPasswordProvider(provider === 'password');
        }

        const fetchUserData = async () => {
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setFormData(buildEditableFormData(data));

                    if (data.barrio) {
                        const esBarrioConocido = BARRIOS_SANTA_ROSA.includes(data.barrio);
                        setBarrioSeleccionado(esBarrioConocido ? data.barrio : BARRIO_OTRO_VALUE);
                    }
                } else {
                    setNotification({ message: 'No se pudieron cargar tus datos.', type: 'error' });
                }
            } catch (error) {
                setNotification({ message: 'Error al conectar con la base de datos.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'dni' || name === 'altura') && value && !/^[0-9]*$/.test(value)) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhonePartChange = (fieldName, partName, partValue) => {
        if (partValue && !/^\d*$/.test(partValue)) return;
        const currentParts = splitArgentinePhone(formData[fieldName]);
        const updatedPhone = buildArgentinePhone(
            partName === 'areaCode' ? partValue : currentParts.areaCode,
            partName === 'number' ? partValue : currentParts.number,
        );
        setFormData((prev) => ({ ...prev, [fieldName]: updatedPhone }));
    };

    const handleBarrioChange = (e) => {
        const { value } = e.target;
        setBarrioSeleccionado(value);

        if (value === BARRIO_OTRO_VALUE) {
            setFormData((prev) => ({ ...prev, barrio: '' }));
            return;
        }

        setFormData((prev) => ({ ...prev, barrio: value }));
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData(buildEditableFormData(userData));

        if (userData?.barrio) {
            const esBarrioConocido = BARRIOS_SANTA_ROSA.includes(userData.barrio);
            setBarrioSeleccionado(esBarrioConocido ? userData.barrio : BARRIO_OTRO_VALUE);
        } else {
            setBarrioSeleccionado('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || isSaving) return;

        setNotification({ message: '', type: '' });
        if (!window.confirm('¿Confirmás que querés guardar los cambios de tu información personal?')) return;

        const payload = {
            nombre: (formData.nombre || '').trim(),
            apellido: (formData.apellido || '').trim(),
            telefonoPrincipal: (formData.telefonoPrincipal || '').trim(),
            telefonoSecundario: (formData.telefonoSecundario || '').trim(),
            provincia: formData.provincia || PROVINCIA_FIJA,
            ciudad: formData.ciudad || CIUDAD_FIJA,
            barrio: (formData.barrio || '').trim(),
            calle: (formData.calle || '').trim(),
            altura: (formData.altura || '').trim(),
            direccion: construirDireccion(formData),
            nombreContactoEmergencia: (formData.nombreContactoEmergencia || '').trim(),
            telefonoContactoEmergencia: (formData.telefonoContactoEmergencia || '').trim(),
        };

        const telefonoPrincipalValidation = validateArgentinePhone(payload.telefonoPrincipal);
        if (!telefonoPrincipalValidation.isValid) {
            setNotification({ message: `Teléfono principal: ${telefonoPrincipalValidation.error}`, type: 'error' });
            return;
        }
        if (payload.telefonoSecundario) {
            const telefonoSecundarioValidation = validateArgentinePhone(payload.telefonoSecundario);
            if (!telefonoSecundarioValidation.isValid) {
                setNotification({ message: `Teléfono secundario: ${telefonoSecundarioValidation.error}`, type: 'error' });
                return;
            }
        }
        const telefonoEmergenciaValidation = validateArgentinePhone(payload.telefonoContactoEmergencia);
        if (!telefonoEmergenciaValidation.isValid) {
            setNotification({ message: `Teléfono de emergencia: ${telefonoEmergenciaValidation.error}`, type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const result = await actualizarPerfil(user.uid, payload);
            if (!result.success) {
                setNotification({ message: result.error || 'No se pudieron guardar los cambios.', type: 'error' });
                return;
            }

            const updatedViewData = { ...userData, ...payload };
            setUserData(updatedViewData);
            setFormData(buildEditableFormData(updatedViewData));
            setIsEditing(false);
            setNotification({ message: result.message || '¡Datos actualizados con éxito!', type: 'success' });
        } catch (error) {
            setNotification({ message: 'No se pudieron guardar los cambios. Intentá nuevamente.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!user || !user.email || isSendingResetEmail) {
            setNotification({ message: 'No se pudo identificar tu correo electrónico.', type: 'error' });
            return;
        }

        setIsSendingResetEmail(true);
        try {
            await resetPassword(user.email);
            setShowPasswordResetConfirmModal(false);
            setShowPasswordResetSuccessModal(true);
        } catch (error) {
            setNotification({ message: 'No se pudo enviar el correo de restablecimiento.', type: 'error' });
        } finally {
            setIsSendingResetEmail(false);
        }
    };


    if (loading) {
        return <div className="text-center mt-10">Cargando tus datos...</div>;
    }

    if (!userData) {
        return <div className="text-center mt-10 text-red-500">No se pudieron cargar los datos del perfil.</div>;
    }

    return (
        <>
            <SubHeader title="Mis Datos" />
            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <BackLink href="/" className="mb-4 inline-block" />
                <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

                <form onSubmit={handleSubmit}>
                    <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Información Personal</h2>
                            {!isEditing ? (
                                <button type="button" onClick={() => setIsEditing(true)} className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition">
                                    <FaEdit className="mr-2" /> Editar
                                </button>
                            ) : (
                                <div className="space-x-2">
                                    <button type="submit" disabled={isSaving} className="inline-flex items-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition disabled:opacity-60 disabled:cursor-not-allowed">
                                        <FaSave className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button type="button" onClick={handleCancelEdit} disabled={isSaving} className="inline-flex items-center bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed">
                                        <FaTimes className="mr-2" /> Cancelar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InfoField label="Nombre" value={formData.nombre} icon={FaUser} name="nombre" isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField label="Apellido" value={formData.apellido} icon={FaUser} name="apellido" isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField label="DNI" value={formData.dni} icon={FaIdCard} name="dni" isEditing={isEditing} onChange={handleInputChange} isEditable={false} />
                            <InfoField label="Email registrado" value={formData.email || user?.email} icon={FaUser} name="email" isEditing={false} onChange={handleInputChange} isEditable={false} />
                        </div>

                        <div className="mb-4 mt-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Provincia y Ciudad</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input value={formData.provincia || PROVINCIA_FIJA} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600" />
                                <input value={formData.ciudad || CIUDAD_FIJA} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Barrio</label>
                            {isEditing ? (
                                <>
                                    <select name="barrioSeleccionado" value={barrioSeleccionado} onChange={handleBarrioChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg">
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
                                            value={formData.barrio || ''}
                                            onChange={handleInputChange}
                                            className="w-full mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                        />
                                    )}
                                </>
                            ) : (
                                <p className="text-lg text-gray-800 bg-gray-50 p-3 rounded-lg">{formData.barrio || 'No especificado'}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InfoField label="Calle" value={formData.calle} icon={FaMapMarkerAlt} name="calle" isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField label="Altura" value={formData.altura} icon={FaMapMarkerAlt} name="altura" isEditing={isEditing} onChange={handleInputChange} />
                        </div>
                        <InfoField label="Domicilio completo" value={formData.direccion || construirDireccion(formData)} icon={FaMapMarkerAlt} name="direccion" isEditing={false} onChange={handleInputChange} isEditable={false} />
                    </div>

                    <div className="bg-white shadow-xl rounded-2xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Información de Contacto</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <PhoneEditableField label="Teléfono Principal" value={formData.telefonoPrincipal} name="telefonoPrincipal" isEditing={isEditing} onPartChange={handlePhonePartChange} />
                            <PhoneEditableField label="Teléfono Secundario" value={formData.telefonoSecundario} name="telefonoSecundario" isEditing={isEditing} onPartChange={handlePhonePartChange} />
                        </div>
                    </div>

                    <div className="bg-white shadow-xl rounded-2xl p-6 mt-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Contacto de Emergencia</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InfoField label="Nombre de Contacto" value={formData.nombreContactoEmergencia} icon={FaExclamationTriangle} name="nombreContactoEmergencia" isEditing={isEditing} onChange={handleInputChange} />
                            <PhoneEditableField label="Teléfono de Emergencia" value={formData.telefonoContactoEmergencia} name="telefonoContactoEmergencia" isEditing={isEditing} onPartChange={handlePhonePartChange} />
                        </div>
                    </div>
                </form>

                {isPasswordProvider && (
                    <div className="bg-white shadow-xl rounded-2xl p-6 mt-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Seguridad de la Cuenta</h2>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-4 rounded-lg">
                            <div className="mb-4 sm:mb-0">
                                <p className="text-lg text-gray-800 font-medium">Cambiar Contraseña</p>
                                <p className="text-sm text-gray-500 max-w-prose">Te enviaremos un enlace seguro a tu correo para que puedas establecer una nueva contraseña.</p>
                            </div>
                            <button onClick={() => setShowPasswordResetConfirmModal(true)} className={`flex items-center text-white py-2 px-4 rounded-lg transition whitespace-nowrap ${isEditing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`} disabled={isEditing || isSendingResetEmail}>
                                <FaKey className="mr-2" /> Enviar enlace
                            </button>
                        </div>
                    </div>
                )}
            </main>


            <Modal isOpen={showPasswordResetConfirmModal} onClose={() => !isSendingResetEmail && setShowPasswordResetConfirmModal(false)}>
                <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                        <FaEnvelope size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmar envío de enlace</h3>
                    <p className="text-gray-600 mb-6">¿Querés que te enviemos el enlace para cambiar tu contraseña a <span className="font-semibold text-gray-800">{user?.email}</span>?</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            type="button"
                            onClick={() => setShowPasswordResetConfirmModal(false)}
                            disabled={isSendingResetEmail}
                            className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handlePasswordReset}
                            disabled={isSendingResetEmail}
                            className="px-5 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSendingResetEmail ? 'Enviando...' : 'Sí, enviar enlace'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showPasswordResetSuccessModal} onClose={() => setShowPasswordResetSuccessModal(false)}>
                <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                        <FaCheckCircle size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Email enviado!</h3>
                    <p className="text-gray-600 mb-2">Te enviamos un correo con el enlace para cambiar tu contraseña.</p>
                    <p className="text-gray-600 mb-6">Revisá tu bandeja de entrada y también la carpeta de <span className="font-semibold">Spam</span> o correo no deseado.</p>
                    <button
                        type="button"
                        onClick={() => setShowPasswordResetSuccessModal(false)}
                        className="px-5 py-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                    >
                        Entendido
                    </button>
                </div>
            </Modal>

        </>
    );
}
