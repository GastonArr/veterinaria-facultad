'use client';

import { useMemo, useState } from 'react';
import { updateTurnoStatusByEmpleado } from '@/lib/actions/turnos.empleado.actions';

const ACTIONS_BY_STATUS = {
  confirmado: { text: 'Confirmar traslado', newStatus: 'traslado confirmado', className: 'bg-emerald-600 hover:bg-emerald-700' },
  'traslado confirmado': { text: 'Iniciar recogida', newStatus: 'buscando', className: 'bg-blue-600 hover:bg-blue-700' },
  buscando: { text: 'Mascota recogida', newStatus: 'buscado', className: 'bg-cyan-600 hover:bg-cyan-700' },
  buscado: { text: 'Entregar en veterinaria', newStatus: 'veterinaria', className: 'bg-indigo-600 hover:bg-indigo-700' },
  'peluqueria finalizada': { text: 'Confirmar vuelta a casa', newStatus: 'devolucion confirmada', className: 'bg-purple-600 hover:bg-purple-700' },
  'devolucion confirmada': { text: 'Iniciar devolución', newStatus: 'devolviendo', className: 'bg-orange-500 hover:bg-orange-600' },
  devolviendo: { text: 'Mascota entregada', newStatus: 'servicio terminado', className: 'bg-green-600 hover:bg-green-700' },
};

const STATUS_COLORS = {
  confirmado: 'bg-blue-100 text-blue-800',
  'traslado confirmado': 'bg-emerald-100 text-emerald-800',
  buscando: 'bg-cyan-100 text-cyan-800',
  buscado: 'bg-sky-100 text-sky-800',
  veterinaria: 'bg-indigo-100 text-indigo-800',
  'peluqueria finalizada': 'bg-purple-100 text-purple-800',
  'devolucion confirmada': 'bg-fuchsia-100 text-fuchsia-800',
  devolviendo: 'bg-orange-100 text-orange-800',
  'servicio terminado': 'bg-lime-200 text-lime-900',
  cancelado: 'bg-rose-200 text-rose-900',
};

const STEPS = ['confirmado', 'traslado confirmado', 'buscando', 'buscado', 'veterinaria', 'peluqueria finalizada', 'devolucion confirmada', 'devolviendo', 'servicio terminado'];

const formatHour = (fecha) => `${new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;

const phoneHref = (phone) => `tel:${(phone || '').replace(/\s+/g, '')}`;

const TransportActionButton = ({ turno, onUpdate, isLoading }) => {
  const { estado, clienteId, mascotaId, id } = turno;
  const action = ACTIONS_BY_STATUS[estado];

  if (!action) {
    return <span className="text-sm text-gray-500 italic">Sin acción por ahora</span>;
  }

  return (
    <button
      onClick={() => onUpdate({ clienteId, mascotaId, turnoId: id, newStatus: action.newStatus })}
      disabled={isLoading}
      className={`w-full md:w-auto text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${action.className}`}
    >
      {isLoading ? 'Actualizando...' : action.text}
    </button>
  );
};

const canCancelTraslado = (estado) => !['servicio terminado', 'finalizado', 'cancelado'].includes(estado);

const TransporteClientView = ({ initialTurnos }) => {
  const [turnos, setTurnos] = useState(() =>
    Array.isArray(initialTurnos) ? [...initialTurnos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) : [],
  );
  const [loadingTurnoId, setLoadingTurnoId] = useState(null);

  const handleStatusUpdate = async ({ clienteId, mascotaId, turnoId, newStatus }) => {
    setLoadingTurnoId(turnoId);
    const result = await updateTurnoStatusByEmpleado({ clienteId, mascotaId, turnoId, newStatus });

    if (result.success) {
      setTurnos((prevTurnos) => prevTurnos.map((t) => (t.id === turnoId ? { ...t, estado: newStatus } : t)));
    } else {
      console.error('Fallo al actualizar el turno:', result.error);
    }
    setLoadingTurnoId(null);
  };

  const handleCancelTraslado = async (turno) => {
    const motivo = window.prompt('Indicá el inconveniente ocurrido para cancelar el traslado:');
    if (motivo === null) return;

    const motivoNormalizado = motivo.trim();
    if (!motivoNormalizado) {
      window.alert('Para cancelar el traslado tenés que informar el inconveniente.');
      return;
    }

    setLoadingTurnoId(turno.id);
    const result = await updateTurnoStatusByEmpleado({
      clienteId: turno.clienteId,
      mascotaId: turno.mascotaId,
      turnoId: turno.id,
      newStatus: 'cancelado',
      motivoCancelacion: motivoNormalizado,
      canceladoPor: 'transportista',
    });

    if (result.success) {
      setTurnos((prevTurnos) => prevTurnos.map((t) => (t.id === turno.id ? { ...t, estado: 'cancelado', motivoCancelacion: motivoNormalizado, canceladoPor: 'transportista' } : t)));
    } else {
      console.error('Fallo al cancelar el traslado:', result.error);
    }
    setLoadingTurnoId(null);
  };

  const orderedTurnos = useMemo(() => [...turnos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)), [turnos]);

  return (
    <div className="p-4 md:p-8 bg-slate-50 text-gray-900 min-h-screen">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-700 to-cyan-600 text-white p-5 md:p-7 shadow-lg mb-6">
        <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-cyan-100">Legado del transporte</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Panel de Transporte</h1>
        <p className="text-sm md:text-base text-cyan-50 mt-2 max-w-3xl">
          Cada viaje cuenta una historia: hoy sos quien conecta a cada mascota con su cuidado. Todo lo importante está en una sola vista dinámica.
        </p>
      </section>

      {orderedTurnos.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">No hay tareas de transporte para hoy.</p>
      ) : (
        <div className="grid gap-4">
          {orderedTurnos.map((turno) => {
            const user = turno.user || {};
            const estado = turno.estado;
            const action = ACTIONS_BY_STATUS[estado];
            const progressIndex = Math.max(STEPS.indexOf(estado), 0);
            const progress = Math.round(((progressIndex + 1) / STEPS.length) * 100);

            return (
              <article key={turno.id} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Horario de búsqueda</p>
                    <p className="text-lg font-bold text-slate-900">{formatHour(turno.fecha)}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Mascota: <span className="font-semibold text-slate-800">{turno.mascota?.nombre || 'Sin nombre'}</span> · Dueño:{' '}
                      <span className="font-semibold text-slate-800">{user.nombre || 'N/A'} {user.apellido || ''}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[estado] || 'bg-gray-100 text-gray-800'}`}>{estado}</span>
                    {action && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                        Próxima acción: {action.text}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Dirección</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{user.direccion || 'Sin dirección'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Teléfono principal</p>
                    <a className="text-sm font-medium text-blue-700 hover:underline mt-1 inline-block" href={phoneHref(user.telefonoPrincipal || user.telefono)}>
                      {user.telefonoPrincipal || user.telefono || 'N/A'}
                    </a>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Teléfono secundario</p>
                    <a className="text-sm font-medium text-blue-700 hover:underline mt-1 inline-block" href={phoneHref(user.telefonoSecundario)}>
                      {user.telefonoSecundario || 'No informado'}
                    </a>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-rose-700">Emergencia</p>
                    <a className="text-sm font-semibold text-rose-700 hover:underline mt-1 inline-block" href={phoneHref(user.telefonoContactoEmergencia)}>
                      {user.telefonoContactoEmergencia || 'N/A'}
                    </a>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso del servicio</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex flex-col md:flex-row gap-2">
                    <TransportActionButton turno={turno} onUpdate={handleStatusUpdate} isLoading={loadingTurnoId === turno.id} />
                    {canCancelTraslado(turno.estado) && (
                      <button
                        type="button"
                        onClick={() => handleCancelTraslado(turno)}
                        disabled={loadingTurnoId === turno.id}
                        className="w-full md:w-auto text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed bg-rose-600 hover:bg-rose-700"
                      >
                        {loadingTurnoId === turno.id ? 'Actualizando...' : 'Cancelar traslado'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransporteClientView;
