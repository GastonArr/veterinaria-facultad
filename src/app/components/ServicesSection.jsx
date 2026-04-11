
'use client';

import { FaStethoscope, FaCut, FaHeart } from 'react-icons/fa';

const ServiceCard = ({ icon, title, description, href }) => {
    const Icon = icon;
    return (
        <a href={href} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 ease-in-out group">
            <div className="mb-6 text-center">
                <Icon className="text-5xl text-violet-500 group-hover:text-violet-600 transition-colors duration-300 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 text-center mb-3">{title}</h3>
            <p className="text-gray-600 text-center leading-relaxed">{description}</p>
        </a>
    );
};

export default function ServicesSection() {
    return (
        <section id="servicios" className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold text-gray-900">Nuestros Servicios</h2>
                    <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">Todo lo que necesitas para el bienestar de tu mascota en un solo lugar.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <ServiceCard 
                        icon={FaStethoscope}
                        title="Consultas Veterinarias"
                        description="Atención médica completa, desde chequeos de rutina hasta emergencias. Tu mascota en las mejores manos."
                        href="/turnos/consulta"
                    />
                    <ServiceCard 
                        icon={FaCut}
                        title="Peluquería Canina"
                        description="Estilo, higiene y cuidado para que tu perro luzca y se sienta genial. Ofrecemos servicio con transporte."
                        href="/turnos/peluqueria"
                    />
                    <ServiceCard 
                        icon={FaHeart}
                        title="Adopciones"
                        description="¿Buscas un nuevo miembro para tu familia? Conoce las mascotas que esperan un hogar lleno de amor."
                        href="/adopciones"
                    />
                </div>
            </div>
        </section>
    );
}
