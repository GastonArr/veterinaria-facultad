import Link from 'next/link';

export default function Dashboard({ children }) {
  return (
    <main 
      className="flex-grow bg-cover bg-center"
      style={{ backgroundImage: "url('/patron1.jpg')" }}
    >
      <div className="bg-white bg-opacity-75 backdrop-blur-sm min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          
          {/* ========= SECCIÓN DE TURNOS (CLIENTE) ========= */}
          <section className="text-center mb-20 md:mb-28">
              <div className="flex justify-center items-center">
                  <Link 
                      href="/turnos/nuevo" 
                      className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-5 px-12 rounded-xl text-xl uppercase tracking-wider transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-cyan-300"
                  >
                      Solicitar un Turno
                  </Link>
              </div>
          </section>

          {/* Aquí se renderizarán los componentes de servidor (como GaleriaAdopciones) */}
          {children}

        </div>
      </div>
    </main>
  );
}
