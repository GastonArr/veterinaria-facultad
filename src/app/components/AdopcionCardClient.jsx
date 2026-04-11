'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { HeartIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { toggleCandidatoAdopcion } from '@/lib/actions/adopciones.actions';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdopcionCardClient({ mascota }) {
    const { user, isLoggedIn } = useAuth();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const imageUrl = `https://loremflickr.com/500/500/${mascota.especie || 'animal'}?random=${mascota.id}`;

    const candidatos = mascota.candidatos || [];
    const isCandidate = isLoggedIn && candidatos.some(c => c.uid === user?.uid);

    const calcularEdad = (fechaNac) => {
        if (!fechaNac) return 'Edad desconocida';
        const nacimiento = new Date(fechaNac);
        const hoy = new Date();
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        if (edad < 0) return 'Próximamente!';
        if (edad === 0) return 'Menos de 1 año';
        return `${edad} años`;
    };

    const handleToggleAdopcion = (e) => {
        e.preventDefault();

        if (!isLoggedIn) {
            alert("Por favor, inicia sesión o regístrate para postularte.");
            return;
        }

        startTransition(async () => {
            const nombreCompleto = user.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : user.displayName;
            const datos = {
                uid: user.uid,
                nombre: nombreCompleto || 'Usuario',
                telefono: user.telefonoPrincipal || user.telefono || ''
            };

            const res = await toggleCandidatoAdopcion(mascota.path, datos);
            if (res.success) {
                // Forzamos al enrutador a refrescar los datos del servidor para ver el botón actualizado
                router.refresh();
            } else {
                alert("Hubo un error: " + res.message);
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-200/80 flex flex-col h-full relative">
            <div className="relative h-60 w-full shrink-0">
                <Image
                    className="object-cover"
                    src={mascota.fotoUrl || imageUrl}
                    alt={`Foto de ${mascota.nombre}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                />
                <div className="absolute top-0 right-0 bg-violet-100 text-violet-800 text-xs font-bold px-3 py-1 m-3 rounded-full shadow-sm">EN ADOPCIÓN</div>
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-baseline">
                    <h3 className="text-2xl font-bold text-gray-800">{mascota.nombre}</h3>
                    <p className="text-sm font-semibold text-violet-600 capitalize">{mascota.sexo}</p>
                </div>
                <div className="flex justify-between items-baseline mb-4 flex-grow">
                    <p className="text-md font-medium text-gray-600 capitalize">{mascota.raza || 'Mestizo'}</p>
                    <p className="text-sm font-medium text-gray-500">{calcularEdad(mascota.fechaNacimiento)}</p>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-auto">
                    <button
                        onClick={handleToggleAdopcion}
                        disabled={isPending}
                        className={`w-full font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 border-2 ${isCandidate
                            ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-red-500 hover:border-red-200'
                            : 'bg-white text-rose-500 border-rose-500 hover:bg-rose-500 hover:text-white shadow-sm'
                            }`}
                    >
                        {isPending ? (
                            'Procesando...'
                        ) : isCandidate ? (
                            <>
                                <XMarkIcon className="h-5 w-5" />
                                Quitar mi postulación
                            </>
                        ) : (
                            <>
                                <HeartIcon className="h-5 w-5" />
                                ¡Quiero Adoptar!
                            </>
                        )}
                    </button>
                    {isCandidate && !isPending && (
                        <p className="text-center text-xs text-emerald-600 font-bold mt-2">
                            ✓ Te has postulado
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
