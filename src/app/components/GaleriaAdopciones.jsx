import { getMascotasEnAdopcion } from '@/lib/actions/adopciones.actions.js';
import AdopcionCardClient from './AdopcionCardClient';

// --- Componente Principal de la Galería ---
export default async function GaleriaAdopciones() {
    const resultado = await getMascotasEnAdopcion();

    if (resultado.error) {
        return (
            <div className="bg-red-50 text-red-700 p-8 rounded-xl text-center border border-red-200">
                <p className="font-bold text-lg mb-2">¡Ups! Hubo un problema</p>
                <p>No se pudo cargar la galería de adopciones. Estamos trabajando para solucionarlo.</p>
            </div>
        );
    }
    if (resultado.length === 0) {
        return (
            <div className="w-full">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-balance uppercase">Mascotas en adopción SANTA ROSA.</h2>
                    <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500">
                        ¡Por el momento todas nuestras mascotas han encontrado un hogar!
                    </p>
                </div>
            </div>
        );
    }

    const mascotas = resultado;

    return (
        <div className="w-full">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-balance uppercase">Mascotas en adopción SANTA ROSA.</h2>
                <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500">
                    ¡Estas hermosas mascotas están buscando un hogar!
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {mascotas.map(mascota => (
                    <AdopcionCardClient key={mascota.id} mascota={mascota} />
                ))}
            </div>
        </div>
    );
}
