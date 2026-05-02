'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getTurnosByUserId } from '@/lib/actions/turnos.user.actions';

const MENSAJES_ESTADO = {
  confirmado: 'La veterinaria confirmó tu turno.',
  'traslado confirmado': 'El transporte confirmó el traslado.',
  buscando: 'El transporte está en camino para buscar a tu mascota.',
  buscado: 'Tu mascota ya fue retirada y está viajando a la veterinaria.',
  veterinaria: 'Tu mascota llegó a la veterinaria.',
  'peluqueria iniciada': 'La peluquería ya comenzó.',
  'peluqueria finalizada': 'La peluquería finalizó.',
  'devolucion confirmada': 'La devolución al domicilio fue confirmada.',
  devolviendo: 'El transporte está devolviendo a tu mascota.',
  reprogramar: 'Este turno necesita reprogramación.',
};

const getMensajeEstado = (turno) => {
  const mensajeBase = MENSAJES_ESTADO[turno.estado] || 'Seguimos trabajando en tu turno.';
  const mostrarRecordatorioPreparacion = turno.necesitaTraslado && ['confirmado', 'traslado confirmado', 'buscando'].includes(turno.estado);

  if (!mostrarRecordatorioPreparacion) return mensajeBase;
  return `${mensajeBase} Recordá preparar a tu mascota seca, limpia y lista 20 minutos antes.`;
};

export default function EstadoTurnosActivosCliente() {
  const { user } = useAuth();
  const [turnosActivos, setTurnosActivos] = useState([]);
  const [avisosCancelacion, setAvisosCancelacion] = useState([]);

  const getDismissedKey = (turnoId) => `cancelacion-servicio-aceptada-${turnoId}`;
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const wasDismissedToday = (turnoId) => {
    if (typeof window === 'undefined') return false;
    const rawValue = window.localStorage.getItem(getDismissedKey(turnoId));
    return rawValue === todayKey();
  };

  const dismissAviso = (turnoId) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getDismissedKey(turnoId), todayKey());
    }
    setAvisosCancelacion((prev) => prev.filter((turno) => turno.id !== turnoId));
  };

  useEffect(() => {
    const cargarTurnos = async () => {
      if (!user?.uid) {
        setTurnosActivos([]);
        setAvisosCancelacion([]);
        return;
      }
      const result = await getTurnosByUserId({ userId: user.uid });
      if (result.success) {
        setTurnosActivos(result.data?.proximos || []);
        const hoy = todayKey();
        const cancelacionesDelDia = (result.data?.historial || []).filter((turno) => (
          turno.estado === 'cancelado'
          && ['transportista', 'admin', 'peluquera'].includes(turno.canceladoPor)
          && typeof turno.fecha === 'string'
          && turno.fecha.slice(0, 10) === hoy
          && !wasDismissedToday(turno.id)
        ));
        setAvisosCancelacion(cancelacionesDelDia);
      } else {
        setTurnosActivos([]);
        setAvisosCancelacion([]);
      }
    };

    cargarTurnos();
  }, [user?.uid]);

  if (!turnosActivos.length && !avisosCancelacion.length) return null;

  return (
    <section className="mb-8 md:mb-10 rounded-xl border border-emerald-100 bg-emerald-50 p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg md:text-xl font-bold text-emerald-900">Estado de tus turnos activos</h2>
        <Link href="/turnos/mis-turnos" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
          Ver detalle
        </Link>
      </div>
      {!!avisosCancelacion.length && (
        <div className="mt-3 space-y-3">
          {avisosCancelacion.map((turno) => (
            <article key={turno.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-bold text-red-800">Traslado cancelado: {turno.servicioNombre}</p>
              <p className="text-xs text-red-700 mt-1 font-semibold">
                {turno.canceladoPor === 'admin' && 'Cancelado por administración'}
                {turno.canceladoPor === 'transportista' && 'Cancelado por transporte'}
                {turno.canceladoPor === 'peluquera' && 'Cancelado por peluquería'}
              </p>
              <p className="text-sm text-red-900 mt-1">{turno.motivoCancelacion?.trim() || 'El responsable del servicio informó un inconveniente.'}</p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => dismissAviso(turno.id)}
                  className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Aceptar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="mt-3 space-y-3">
        {turnosActivos.map((turno) => (
          <article key={turno.id} className="rounded-lg border border-emerald-200 bg-white p-3">
            <p className="text-sm font-bold text-gray-800">{turno.servicioNombre} · {turno.mascota?.nombre || 'Mascota'}</p>
            <p className="text-xs uppercase font-semibold text-emerald-700 mt-1">Estado: {turno.estado}</p>
            <p className="text-sm text-gray-700 mt-1">{getMensajeEstado(turno)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
