'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { actualizarPerfil } from '@/lib/actions/user.actions.js';
import SubHeader from '@/app/components/SubHeader';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaExclamationTriangle, FaSave, FaEdit, FaTimes, FaKey } from 'react-icons/fa';
import Link from 'next/link';
import { FaUserShield , FaChevronRight } from 'react-icons/fa';
import { CIUDAD_FIJA, PROVINCIA_FIJA, construirDireccion } from '@/lib/utils/direccion';
// Componente para un campo de información, ahora con una prop `isEditable`
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
                        type={name.includes('telefono') || name === 'dni' ? 'tel' : 'text'}
                        name={name}
                        value={value}
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
const RoleSpecificButton = ({ role }) => {
    const roles = {
      admin: { href: '/admin', label: 'Panel de Administrador' },
      peluqueria: { href: '/admin/empleados/peluqueria', label: 'Portal de Peluquería' },
      transporte: { href: '/admin/empleados/transporte', label: 'Portal de Transporte' }
    };
  
    if (!role || !roles[role]) {
      return null; // No se muestra nada si el rol no es válido o no existe
    }
  
    const { href, label } = roles[role];
  
    return (
        <div className="mb-8">
          <Link 
            href={href} 
            className="flex items-center justify-between w-full p-4 text-left bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 group"
          >
            <div className="flex items-center gap-4">
              {/* Icono destacado */}
              <div className="p-3 bg-violet-100 rounded-xl">
                <FaUserShield className="text-violet-600" size={22} />
              </div>
              {/* Etiqueta del rol */}
              <span className="text-lg font-bold text-gray-800">{label}</span>
            </div>
            {/* Flecha indicadora */}
            <FaChevronRight className="text-gray-400 group-hover:text-violet-600 transition-colors" size={20} />
          </Link>
        </div>
    );
   
  };
// Componente para mostrar notificaciones
const Notification = ({ message, type, onClose }) => {
    if (!message) return null;
    const baseClasses = "p-4 rounded-lg flex justify-between items-center mb-4 shadow-lg";
    const typeClasses = type === 'success' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <span>{message}</span>
            <button onClick={onClose} className="text-xl font-bold">&times;</button>
        </div>
    );
};

export default function MisDatosPage() {
    const { user, resetPassword } = useAuth();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [isPasswordProvider, setIsPasswordProvider] = useState(false);

    useEffect(() => {
        if (user) {
            // Check the provider
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
                        setFormData(data);
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
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'dni' || name.includes('telefono')) && value && !/^[0-9]*$/.test(value)) return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setNotification({ message: '', type: '' });
        const result = await actualizarPerfil(user.uid, {
            ...formData,
            direccion: construirDireccion(formData),
            provincia: formData.provincia || PROVINCIA_FIJA,
            ciudad: formData.ciudad || CIUDAD_FIJA,
        });
        if (result.success) {
            // Actualizamos la vista solo con los datos que pueden cambiar
            const updatedViewData = { ...userData, ...result.updatedData };
            setUserData(updatedViewData);
            setFormData(updatedViewData);
            setIsEditing(false);
            setNotification({ message: result.message, type: 'success' });
        } else {
            setNotification({ message: result.error, type: 'error' });
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
            {userData && <RoleSpecificButton role={userData.role} />}

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
                                    <button type="submit" className="flex items-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition">
                                        <FaSave className="mr-2" /> Guardar
                                    </button>
                                    <button type="button" onClick={() => { setIsEditing(false); setFormData(userData); }} className="flex items-center bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition">
                                        <FaTimes className="mr-2" /> Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InfoField label="Nombre" value={formData.nombre} icon={FaUser} name="nombre" isEditing={isEditing} onChange={handleInputChange} isEditable={false} />
                            <InfoField label="Apellido" value={formData.apellido} icon={FaUser} name="apellido" isEditing={isEditing} onChange={handleInputChange} isEditable={false} />
                            <InfoField label="DNI" value={formData.dni} icon={FaIdCard} name="dni" isEditing={isEditing} onChange={handleInputChange} isEditable={false} />
                            <InfoField label="Email registrado" value={formData.email || user?.email} icon={FaUser} name="email" isEditing={false} onChange={handleInputChange} isEditable={false} />
                            <InfoField label="Domicilio" value={formData.direccion || construirDireccion(formData)} icon={FaMapMarkerAlt} name="direccion" isEditing={false} onChange={handleInputChange} isEditable={false} />
                        </div>
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
