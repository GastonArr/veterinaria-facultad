'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SubHeader from '@/app/components/SubHeader';
import BackLink from '@/app/components/BackLink';
import { FaPlus, FaCat, FaDog } from 'react-icons/fa';


const formatDate = (dateInput) => {
    if (!dateInput) return 'No especificada';

    try {
        let date;
        // Caso 1: Es un objeto Timestamp de Firestore (datos nuevos)
        if (typeof dateInput.toDate === 'function') {
            date = dateInput.toDate();
        } 
        // Caso 2: Es un string de fecha como "YYYY-MM-DD" (datos antiguos)
        else if (typeof dateInput === 'string') {
            // Añadimos T00:00:00 para asegurar que la fecha se interprete en la zona horaria local
            // y no se desfase un día por UTC.
            date = new Date(`${dateInput}T00:00:00`);
        }
        // Caso 3: Ya es un objeto Date de JavaScript
        else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            throw new Error('Formato de fecha no reconocido');
        }

        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);

    } catch (error) {
        console.error("Error al formatear la fecha:", dateInput, error);
        return 'Fecha inválida';
    }
};

// Componente para la tarjeta de una mascota
const MascotaCard = ({ mascota }) => {
    const Icon = mascota.especie?.toLowerCase() === 'gato' ? FaCat : FaDog;
    return (
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
            <div>
                <div className="flex items-center mb-4">
                    <Icon className="text-blue-500 mr-4" size={30} />
                    <h3 className="text-2xl font-bold text-gray-800">{mascota.nombre}</h3>
                </div>
                <p className="text-gray-600 capitalize"><span className="font-semibold">Especie:</span> {mascota.especie}</p>
                <p className="text-gray-600 capitalize"><span className="font-semibold">Raza:</span> {mascota.raza}</p>
                {/* APLICAMOS LA FUNCIÓN DE FORMATEO MEJORADA AQUÍ */}
                <p className="text-gray-600"><span className="font-semibold">Fecha de Nacimiento:</span> {formatDate(mascota.fechaNacimiento)}</p>
            </div>
             <Link href={`/mascotas/${mascota.id}/carnet`} className="mt-4 text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition">
                Ver Carnet Sanitario
            </Link>
        </div>
    );
};

export default function MisMascotasPage() {
    const { user } = useAuth();
    const [mascotas, setMascotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            const fetchMascotas = async () => {
                try {
                    const mascotasRef = collection(db, 'users', user.uid, 'mascotas');
                    const q = query(mascotasRef, orderBy('nombre', 'asc'));
                    
                    const querySnapshot = await getDocs(q);
                    const mascotasData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setMascotas(mascotasData);
                } catch (err) {
                    setError('No se pudieron cargar las mascotas. Inténtalo de nuevo más tarde.');
                    console.error("Error detallado:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchMascotas();
        }
    }, [user]);

    return (
        <>
            <SubHeader title="Mis Mascotas" />
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <BackLink href="/" className="mb-4 inline-block" />
                <div className="flex justify-end mb-6">
                     <Link href="/mascotas/nueva" className="flex items-center bg-green-500 text-white py-2 px-5 rounded-lg hover:bg-green-600 transition shadow-lg">
                        <FaPlus className="mr-2" />
                        Añadir Mascota
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500">Cargando tus mascotas...</div>
                ) : error ? (
                    <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>
                ) : mascotas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {mascotas.map(mascota => (
                            <MascotaCard key={mascota.id} mascota={mascota} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 mt-10 p-8 bg-white rounded-lg shadow-md">No tienes ninguna mascota registrada todavía. ¡Añade una!</div>
                )}
            </main>
        </>
    );
}
