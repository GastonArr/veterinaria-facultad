'use client';

import { useMemo, useState } from 'react';
import { updateTurnoStatusByEmpleado } from '@/lib/actions/turnos.empleado.actions';

const ACTIONS_BY_STATUS = {
  confirmado: { text: 'Iniciar peluquería', newStatus: 'peluqueria iniciada', className: 'bg-blue-600 hover:bg-blue-700' },
  'traslado confirmado': { text: 'Iniciar peluquería', newStatus: 'peluqueria iniciada', className: 'bg-blue-600 hover:bg-blue-700' },
  veterinaria: { text: 'Iniciar peluquería', newStatus: 'peluqueria iniciada', className: 'bg-blue-600 hover:bg-blue-700' },
  'peluqueria iniciada': { text: 'Finalizar peluquería', newStatus: 'peluqueria finalizada', className: 'bg-green-600 hover:bg-green-700' },
};

const STATUS_COLORS = {
  default: 'bg-gray-100 text-gray-800',
  veterinaria: 'bg-indigo-100 text-indigo-800',
  'peluqueria iniciada': 'bg-pink-100 text-pink-800',
  'peluqueria finalizada': 'bg-purple-100 text-purple-800',
  'devolucion confirmada': 'bg-fuchsia-100 text-fuchsia-800',
  'servicio terminado': 'bg-green-100 text-green-800',
  confirmado: 'bg-yellow-100 text-yellow-800',
  'traslado confirmado': 'bg-emerald-100 text-emerald-800',
  buscando: 'bg-blue-100 text-blue-800',
  buscado: 'bg-cyan-100 text-cyan-800',
  devolviendo: 'bg-orange-100 text-orange-800',
};

const formatHour = (fecha) => `${new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;

const ActionButton = ({ turno, onUpdate, isLoading }) => {
  const action = ACTIONS_BY_STATUS[turno.estado];
  if (!action) {
    return <span className="text-sm text-gray-500 italic">Sin acción requerida</span>;
  }

  return (
    <button
      onClick={() => onUpdate({ clienteId: turno.clienteId, mascotaId: turno.mascotaId, turnoId: turno.id, newStatus: action.newStatus })}
      disabled={isLoading}
      className={`w-full md:w-auto text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed ${action.className}`}
    >
      {isLoading ? 'Actualizando...' : action.text}
    </button>
  );
};

const PeluqueriaClientView = ({ initialTurnos }) => {
  const [turnos, setTurnos] = useState(() => (Array.isArray(initialTurnos) ? [...initialTurnos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) : []));
  const [loadingTurnoId, setLoadingTurnoId] = useState(null);
  const [turnoParaFinalizar, setTurnoParaFinalizar] = useState(null);
  const [comentarioCorte, setComentarioCorte] = useState('');
  const [modalError, setModalError] = useState('');

  const handleStatusUpdate = async ({ clienteId, mascotaId, turnoId, newStatus, comentario }) => {
    setLoadingTurnoId(turnoId);
    const result = await updateTurnoStatusByEmpleado({ clienteId, mascotaId, turnoId, newStatus, comentario });

    if (result.success) {
      setTurnos((prevTurnos) =>
        prevTurnos.map((t) => (t.id === turnoId ? { ...t, estado: newStatus, comentario: comentario || t.comentario } : t)),
      );
    } else {
      setModalError(result.error || 'No se pudo actualizar el turno.');
    }
    setLoadingTurnoId(null);
    return result;
  };

  const handleAction = async ({ clienteId, mascotaId, turnoId, newStatus }) => {
    if (newStatus === 'peluqueria finalizada') {
      const turno = turnos.find((t) => t.id === turnoId);
      setTurnoParaFinalizar(turno || null);
      setComentarioCorte(turno?.comentario || '');
      setModalError('');
      return;
    }
    await handleStatusUpdate({ clienteId, mascotaId, turnoId, newStatus });
  };

  const handleConfirmarFinalizacion = async () => {
    if (!turnoParaFinalizar) return;
    if (!comentarioCorte.trim()) {
      setModalError('El historial del corte es obligatorio para finalizar.');
      return;
    }

    const result = await handleStatusUpdate({
      clienteId: turnoParaFinalizar.clienteId,
      mascotaId: turnoParaFinalizar.mascotaId,
      turnoId: turnoParaFinalizar.id,
      newStatus: 'peluqueria finalizada',
      comentario: comentarioCorte.trim(),
    });

    if (result?.success) {
      setTurnoParaFinalizar(null);
      setComentarioCorte('');
    }
  };

  const orderedTurnos = useMemo(() => [...turnos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)), [turnos]);

  return (
    <div className="p-4 md:p-8 bg-slate-50 text-gray-900 min-h-screen">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-fuchsia-700 to-pink-600 text-white p-5 md:p-7 shadow-lg mb-6">
        <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-pink-100">Estudio de estilo</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Panel de Peluquería</h1>
        <p className="text-sm md:text-base text-pink-50 mt-2 max-w-3xl">
          La estética también es bienestar. Seguimiento visual, estado actual y próxima acción, todo en un solo vistazo para celular y escritorio.
        </p>
      </section>

      {orderedTurnos.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">No hay turnos de peluquería pendientes para hoy.</p>
      ) : (
        <div className="grid gap-4">
          {orderedTurnos.map((turno) => {
            const user = turno.user || {};
            return (
              <article key={turno.id} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Horario</p>
                    <p className="text-lg font-bold text-slate-900">{formatHour(turno.fecha)}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Mascota: <span className="font-semibold text-slate-800">{turno.mascota?.nombre || 'Sin nombre'}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Dueño: <span className="font-semibold text-slate-800">{user.nombre || 'N/A'} {user.apellido || ''}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[turno.estado] || STATUS_COLORS.default}`}>{turno.estado}</span>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                      Próxima acción: {ACTIONS_BY_STATUS[turno.estado]?.text || 'Sin acción'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Contacto principal</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{user.telefonoPrincipal || user.telefono || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Contacto secundario</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{user.telefonoSecundario || 'No informado'}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs uppercase tracking-wide text-rose-700">Emergencia</p>
                    <p className="text-sm font-semibold text-rose-700 mt-1">{user.telefonoContactoEmergencia || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <ActionButton turno={turno} onUpdate={handleAction} isLoading={loadingTurnoId === turno.id} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {turnoParaFinalizar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Finalizar peluquería</h2>
            <p className="text-sm text-gray-600 mb-4">
              Completá el historial del corte de <strong>{turnoParaFinalizar.mascota?.nombre}</strong>. Este campo es obligatorio.
            </p>
            <textarea
              value={comentarioCorte}
              onChange={(e) => setComentarioCorte(e.target.value)}
              placeholder="Detalle del corte realizado, observaciones y recomendaciones..."
              rows={5}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
            />
            {modalError && <p className="text-sm text-red-600 mt-3">{modalError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setTurnoParaFinalizar(null);
                  setComentarioCorte('');
                  setModalError('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFinalizacion}
                disabled={loadingTurnoId === turnoParaFinalizar.id}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
              >
                {loadingTurnoId === turnoParaFinalizar.id ? 'Guardando...' : 'Guardar y finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeluqueriaClientView;
