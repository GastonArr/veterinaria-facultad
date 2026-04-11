'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    // Main container with background image
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/patron1.jpg')" }}
    >
      {/* Main centered card with blur effect */}
      <div className="relative w-full max-w-lg mx-auto p-8 rounded-2xl shadow-2xl bg-white/25 backdrop-blur-lg text-gray-800">
        
        {/* Faint logo in the background of the card */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <Image 
                src="/LOGO.svg" 
                alt="Logo background" 
                width={400} 
                height={200}
            />
        </div>

        {/* Content container to be above the background logo */}
        <div className="relative z-10 flex flex-col items-center">
            {/* Main Logo */}
            <div className="mb-6">
                <Image 
                    src="/LOGO.svg" 
                    alt="Magalí Martin Veterinaria" 
                    width={220}
                    height={110}
                />
            </div>
            
            {/* Welcome Title */}
            <h1 className="text-3xl font-bold mb-4 text-center">
              ¡Bienvenido a la <span className="font-extrabold text-teal-900">Veterinaria Online!</span>
            </h1>
            
            {/* Description Text */}
            <div className="my-6 text-base space-y-2 font-medium">
              <p>Aquí puedes encontrar la mejor atención para tus mascotas.</p>
              <p>Reservar turnos para la veterinaria y la peluquería de tus mascotas.</p>
              <p>Gestionar adopciones y toda la información de tus mascotas en un solo lugar.</p>
            </div>
            
            {/* Login Button */}
            <Link 
              href="/login" 
              className="mt-4 w-full max-w-xs text-center bg-violet-600 hover:bg-violet-900 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg"
            >
                Ingresar
            </Link>
        </div>
      </div>
    </div>
  );
}
