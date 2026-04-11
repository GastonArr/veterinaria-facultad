'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { actualizarPerfil } from '@/lib/actions/user.actions.js';
import SubHeader from '@/app/components/SubHeader';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaExclamationTriangle, FaSave, FaEdit, FaTimes, FaKey } from 'react-icons/fa';
import { BARRIOS_SANTA_ROSA, CIUDAD_FIJA, PROVINCIA_FIJA, construirDireccion } from '@/lib/utils/direccion';

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
        if ((name === 'dni' || name.includes('telefono') || name === 'altura') && value && !/^[0-9]*$/.test(value)) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
        if (!user || !user.email) {
            setNotification({ message: 'No se pudo identificar tu correo electrónico.', type: 'error' });
            return;
        }

        try {
            await resetPassword(user.email);
            setNotification({ message: '¡Correo enviado! Revisa tu bandeja de entrada.', type: 'success' });
        } catch (error) {
            setNotification({ message: 'No se pudo enviar el correo de restablecimiento.', type: 'error' });
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
                            <InfoField label="Teléfono Principal" value={formData.telefonoPrincipal} icon={FaPhone} name="telefonoPrincipal" isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField label="Teléfono Secundario" value={formData.telefonoSecundario} icon={FaPhone} name="telefonoSecundario" isEditing={isEditing} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="bg-white shadow-xl rounded-2xl p-6 mt-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Contacto de Emergencia</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InfoField label="Nombre de Contacto" value={formData.nombreContactoEmergencia} icon={FaExclamationTriangle} name="nombreContactoEmergencia" isEditing={isEditing} onChange={handleInputChange} />
                            <InfoField label="Teléfono de Emergencia" value={formData.telefonoContactoEmergencia} icon={FaPhone} name="telefonoContactoEmergencia" isEditing={isEditing} onChange={handleInputChange} />
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
                            <button onClick={handlePasswordReset} className={`flex items-center text-white py-2 px-4 rounded-lg transition whitespace-nowrap ${isEditing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`} disabled={isEditing}>
                                <FaKey className="mr-2" /> Enviar enlace
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
