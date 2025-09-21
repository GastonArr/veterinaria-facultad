
import FormularioNuevaMascota from "@/app/components/FormularioNuevaMascota";

export default function NuevaMascotaPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Añade una nueva mascota
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Completa los datos para crear el perfil de tu compañero.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10">
                    <FormularioNuevaMascota />
                </div>
            </div>
        </div>
    );
}
