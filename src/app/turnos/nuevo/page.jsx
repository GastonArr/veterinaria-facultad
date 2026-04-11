'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Toaster, toast } from 'react-hot-toast';
import { FaSpinner, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

// Context and Step Components
import { TurnoWizardProvider, useTurnoWizard } from './TurnoWizardContext';
import Paso1 from './form/paso1';
import Paso2 from './form/paso2';
import Paso3 from './form/paso3';
import Paso4 from './form/paso4';
import Paso5 from './form/paso5';

// Server Actions
import { obtenerConfiguracionServicios, getDiasNoLaborales } from '@/lib/actions/config.actions.js';

// Main component that renders the current step
const WizardStepRenderer = () => {
    const { step, prevStep } = useTurnoWizard();

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Paso1 />;
            case 2:
                return <Paso2 />;
            case 3:
                return <Paso3 />;
            case 4:
                return <Paso4 />;
            case 5:
                return <Paso5 />;
            default:
                return <div>Paso no encontrado</div>;
        }
    };

    return (
        <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border mt-10 mb-20">
            <Toaster position="top-center" />
            <div className="p-4 sm:p-6 border-b">
                <button onClick={prevStep} disabled={step === 1} className="flex items-center gap-2 text-sm font-semibold text-gray-600 disabled:opacity-50">
                    <FaArrowLeft /> Volver
                </button>
            </div>

            <div className="p-6 sm:p-8 md:p-10">
                {renderStep()}
            </div>

        </section>
    );
};

// The main page component that provides the context
export default function NuevoTurnoWizardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const normalizeFirestoreValue = (value) => {
        if (value === null || value === undefined) return value;
        if (Array.isArray(value)) return value.map(normalizeFirestoreValue);
        if (typeof value === 'object') {
            if (typeof value.toDate === 'function') {
                return value.toDate().toISOString();
            }

            const normalizedObject = {};
            for (const [key, nestedValue] of Object.entries(value)) {
                normalizedObject[key] = normalizeFirestoreValue(nestedValue);
            }
            return normalizedObject;
        }
        return value;
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirectTo=/turnos/nuevo');
            return;
        }

        if (user) {
            const loadInitialData = async () => {
                setLoading(true);
                try {
                    const [mascotasSnap, serviciosSnap, configResult, diasResult] = await Promise.all([
                        getDocs(query(collection(db, 'users', user.uid, 'mascotas'), orderBy('nombre', 'asc'))),
                        getDoc(doc(db, 'servicios', 'catalogo')),
                        obtenerConfiguracionServicios(),
                        getDiasNoLaborales(),
                    ]);

                    const mascotas = mascotasSnap.docs.map((doc) => ({
                        id: doc.id,
                        ...normalizeFirestoreValue(doc.data()),
                    }));
                    
                    let catalogoServicios = { clinica: [], peluqueria: [] };
                    if (serviciosSnap.exists()) {
                        const data = serviciosSnap.data();
                        catalogoServicios = {
                            clinica: Object.entries(data.clinica || {}).map(([id, val]) => ({ id, ...val })),
                            peluqueria: Object.entries(data.peluqueria || {}).map(([id, val]) => ({ id, ...val }))
                        };
                    }

                    if (!configResult.success) toast.error("Error al cargar la configuración de servicios.");
                    if (!diasResult.success) toast.error("Error al cargar los días no laborales.");

                    setInitialData({
                        mascotas,
                        catalogoServicios,
                        configServicios: configResult.data || {},
                        diasNoLaborales: diasResult.data ? diasResult.data.map(d => new Date(d)) : [],
                    });

                } catch (err) {
                    console.error("Error loading initial data:", err);
                    setError('Ocurrió un error al cargar los datos necesarios para crear un turno.');
                } finally {
                    setLoading(false);
                }
            };
            loadInitialData();
        }
    }, [user, authLoading, router]);

    if (loading || authLoading) {
        return <div className="p-12 text-center"><FaSpinner className="animate-spin text-4xl mx-auto text-blue-500" /></div>;
    }

    if (error) {
        return <div className="p-12 text-center text-red-500">Error: {error}</div>;
    }

    if (initialData && initialData.mascotas.length === 0) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-xl font-bold mb-4">No tienes mascotas registradas</h3>
                <Link href="/mascotas/nueva" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 inline-flex items-center gap-2">
                    Registrar Mascota
                </Link>
            </div>
        );
    }

    return (
        <TurnoWizardProvider initialData={initialData}>
            <WizardStepRenderer />
        </TurnoWizardProvider>
    );
}
