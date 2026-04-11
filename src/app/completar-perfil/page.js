// Historia de Usuario 6: Completar Perfil de Usuario - Versión Rediseñada
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { completarPerfil } from '@/lib/actions/user.actions.js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaExclamationTriangle } from 'react-icons/fa';
import { BARRIOS_SANTA_ROSA, CIUDAD_FIJA, PROVINCIA_FIJA, construirDireccion } from '@/lib/utils/direccion';

const BARRIO_OTRO_VALUE = '__OTRO_BARRIO__';

const FormInput = ({ id, name, type, placeholder, value, onChange, required = false, maxLength, label, icon: Icon, error }) => (
    <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor={id}>{label}</label>
        <div className={`flex items-center bg-gray-50 p-3 rounded-lg border-2 ${error ? 'border-red-500' : 'border-transparent focus-within:border-blue-500'} transition-colors`}>
            <Icon className="text-gray-400 mr-3" size={20} />
            <input
                className="flex-grow text-lg text-gray-800 bg-transparent focus:outline-none"
                id={id} name={name} type={type} placeholder={placeholder} value={value}
                onChange={onChange} required={required} maxLength={maxLength}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
            />
        </div>
        {error && <p id={`${id}-error`} className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
);

export default function CompletarPerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profileLoading, setProfileLoading] = useState(true);
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
  const [errors, setErrors] = useState({});
  const [barrioSeleccionado, setBarrioSeleccionado] = useState('');
  const mostrarCampoBarrioManual = barrioSeleccionado === BARRIO_OTRO_VALUE;

  const validacionDatosCompletarPerfil = (data) => {
    const errors = {};
    if (!data.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    else if (!/^[a-zA-Z\s]+$/.test(data.nombre)) errors.nombre = 'El nombre solo puede contener letras.';

    if (!data.apellido.trim()) errors.apellido = 'El apellido es obligatorio.';
    else if (!/^[a-zA-Z\s]+$/.test(data.apellido)) errors.apellido = 'El apellido solo puede contener letras.';

    if (!data.dni.trim()) errors.dni = 'El DNI es obligatorio.';
    else if (!/^\d{7,8}$/.test(data.dni)) errors.dni = 'El DNI debe tener entre 7 y 8 números.';

    if (!data.barrio.trim()) errors.barrio = 'El barrio es obligatorio.';
    if (!data.calle.trim()) errors.calle = 'La calle es obligatoria.';
    if (!data.altura.trim()) errors.altura = 'La altura es obligatoria.';

    if (!data.telefonoPrincipal.trim()) errors.telefonoPrincipal = 'El teléfono principal es obligatorio.';
    else if (!/^\d{10,15}$/.test(data.telefonoPrincipal)) errors.telefonoPrincipal = 'El teléfono debe tener entre 10 y 15 números.';
    
    if (data.telefonoSecundario.trim() && !/^\d{10,15}$/.test(data.telefonoSecundario)) errors.telefonoSecundario = 'Si se ingresa, el teléfono debe tener entre 10 y 15 números.';

    if (!data.nombreContactoEmergencia.trim()) errors.nombreContactoEmergencia = 'El nombre de contacto de emergencia es obligatorio.';
    else if (!/^[a-zA-Z\s]+$/.test(data.nombreContactoEmergencia)) errors.nombreContactoEmergencia = 'El nombre solo puede contener letras.';

    if (!data.telefonoContactoEmergencia.trim()) errors.telefonoContactoEmergencia = 'El teléfono de emergencia es obligatorio.';
    else if (!/^\d{10,15}$/.test(data.telefonoContactoEmergencia)) errors.telefonoContactoEmergencia = 'El teléfono debe tener entre 10 y 15 números.';
    
    return errors;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return router.replace('/login');

    const checkProfile = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().profileCompleted) {
            toast.success('Tu perfil ya está completo.', { duration: 2000 });
            return router.replace('/');
        }

        const [firstName, ...lastNameParts] = user.displayName?.split(' ') || ['', ''];
        setFormData(prev => ({ ...prev, nombre: firstName, apellido: lastNameParts.join(' ') }));
        setProfileLoading(false);
    };

    checkProfile();
  }, [user, authLoading, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === 'dni' || name.includes('telefono') || name === 'altura') && value && !/^[0-9]*$/.test(value)) return;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
        setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
  };

  const handleBarrioChange = (e) => {
    const { value } = e.target;
    setBarrioSeleccionado(value);
    if (value === BARRIO_OTRO_VALUE) {
      setFormData(prev => ({ ...prev, barrio: '' }));
      if (errors.barrio) {
        setErrors(prevErrors => ({ ...prevErrors, barrio: null }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, barrio: value }));
    if (errors.barrio) {
      setErrors(prevErrors => ({ ...prevErrors, barrio: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Tu sesión ha expirado.');

    const validationErrors = validacionDatosCompletarPerfil(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
        return toast.error('Por favor, revisa los errores en el formulario.');
    }

    startTransition(async () => {
      const result = await completarPerfil(user.uid, {
        ...formData,
        email: user.email || '',
        direccion: construirDireccion(formData),
      });
      if (result.success) {
        toast.success('¡Perfil completado! Redirigiendo...');
        setTimeout(() => router.push(result.role === 'admin' ? '/admin' : '/'), 1500);
      } else {
        toast.error(result.error || 'Hubo un error al guardar tu perfil.');
      }
    });
  };

  if (authLoading || profileLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="loader border-4 border-gray-200 border-t-blue-500 rounded-full w-12 h-12 animate-spin"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
        <Toaster position="bottom-center" />
        <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Completa tu Perfil</h1>
                <p className="text-lg text-gray-600 mt-2">¡Casi listo! Solo necesitamos unos datos más para crear tu cuenta.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Información Personal</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <FormInput id="nombre" name="nombre" type="text" label="Nombre" icon={FaUser} value={formData.nombre} onChange={handleChange} required error={errors.nombre} />
                        <FormInput id="apellido" name="apellido" type="text" label="Apellido" icon={FaUser} value={formData.apellido} onChange={handleChange} required error={errors.apellido} />
                    </div>
                    <FormInput id="dni" name="dni" type="tel" label="DNI" icon={FaIdCard} placeholder="Sin puntos" value={formData.dni} onChange={handleChange} required maxLength="8" error={errors.dni} />
                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Provincia y Ciudad</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input value={formData.provincia} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600" />
                            <input value={formData.ciudad} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600" />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Barrio</label>
                        <select name="barrioSeleccionado" value={barrioSeleccionado} onChange={handleBarrioChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" required>
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
                                onChange={handleChange}
                                className="w-full mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                required
                            />
                        )}
                        {errors.barrio && <p className="text-red-600 text-xs mt-1">{errors.barrio}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <FormInput id="calle" name="calle" type="text" label="Calle" icon={FaMapMarkerAlt} placeholder="Av. Siempreviva" value={formData.calle} onChange={handleChange} required error={errors.calle} />
                        <FormInput id="altura" name="altura" type="text" label="Altura" icon={FaMapMarkerAlt} placeholder="742" value={formData.altura} onChange={handleChange} required error={errors.altura} />
                    </div>
                </div>

                <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Información de Contacto</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <FormInput id="telefonoPrincipal" name="telefonoPrincipal" type="tel" label="Teléfono Principal" icon={FaPhone} placeholder="1122334455" value={formData.telefonoPrincipal} onChange={handleChange} required error={errors.telefonoPrincipal} />
                        <FormInput id="telefonoSecundario" name="telefonoSecundario" type="tel" label="Teléfono Secundario" icon={FaPhone} placeholder="(Opcional)" value={formData.telefonoSecundario} onChange={handleChange} error={errors.telefonoSecundario} />
                    </div>
                </div>

                <div className="bg-white shadow-xl rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Contacto de Emergencia</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                         <FormInput id="nombreContactoEmergencia" name="nombreContactoEmergencia" type="text" label="Nombre" icon={FaExclamationTriangle} placeholder="Jane Doe" value={formData.nombreContactoEmergencia} onChange={handleChange} required error={errors.nombreContactoEmergencia} />
                        <FormInput id="telefonoContactoEmergencia" name="telefonoContactoEmergencia" type="tel" label="Teléfono" icon={FaPhone} placeholder="1188776655" value={formData.telefonoContactoEmergencia} onChange={handleChange} required error={errors.telefonoContactoEmergencia} />
                    </div>
                </div>

                <div className="mt-8">
                    <button type="submit" disabled={isPending} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        {isPending ? 'Guardando...' : 'Guardar y Finalizar'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}
