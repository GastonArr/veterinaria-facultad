'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SubHeader from '@/app/components/SubHeader';
import BackLink from '@/app/components/BackLink';
import { FaPlus, FaCalendarCheck } from 'react-icons/fa';

const TurnoCard = ({ turno }) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Fecha no especificada';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('es-ES', {
            dateStyle: 'full',
            timeStyle: 'short',
        }).format(date);
    };

    const getStatusStyle = (estado) => {
        switch (estado) {
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800';
            case 'confirmado':
                return 'bg-green-100 text-green-800';
            case 'cancelado':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
                <FaCalendarCheck className="text-indigo-500 mr-4" size={30} />
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{turno.mascotaNombre}</h3>
                    <p className={`text-sm font-semibold capitalize px-2 py-1 rounded-full inline-block ${getStatusStyle(turno.estado)}`}>
                        {turno.estado}
                    </p>
                </div>
            </div>
            <p className="text-gray-600"><span className="font-semibold">Fecha:</span> {formatDate(turno.fecha)}</p>
            <p className="text-gray-600"><span className="font-semibold">Motivo:</span> {turno.motivo}</p>
        </div>
    );
};

export default function MisTurnosPage() {
    const { user } = useAuth();
    const [turnos, setTurnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            const fetchTurnos = async () => {
                try {
                    const turnosRef = collection(db, 'users', user.uid, 'turnos');
                    const q = query(turnosRef, orderBy('fecha', 'desc'));
                    
                    const querySnapshot = await getDocs(q);
                    const turnosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setTurnos(turnosData);
                } catch (err) {
                    setError('No se pudieron cargar los turnos. Inténtalo de nuevo más tarde.');
                    console.error("Error detallado:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchTurnos();
        }
    }, [user]);

    return (
        <>
            <SubHeader title="Mis Turnos" />
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <BackLink href="/" className="mb-4 inline-block" />
                <div className="flex justify-end mb-6">
                     <Link href="/turnos/nuevo" className="flex items-center bg-indigo-500 text-white py-2 px-5 rounded-lg hover:bg-indigo-600 transition shadow-lg">
                        <FaPlus className="mr-2" />
                        Solicitar Turno
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500">Cargando tus turnos...</div>
                ) : error ? (
                    <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>
                ) : turnos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {turnos.map(turno => (
                            <TurnoCard key={turno.id} turno={turno} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 mt-10 p-8 bg-white rounded-lg shadow-md">No tienes ningún turno registrado. ¡Solicita uno!</div>
                )}
            </main>
        </>
    );
}
