'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { getTurnosForReports } from '@/lib/actions/turnos.admin.actions';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const formatDate = (iso) => new Date(iso).toLocaleDateString('es-AR', { timeZone: TIME_ZONE });
const formatTime = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
const formatDateTime = (iso) => `${formatDate(iso)} ${formatTime(iso)} hs`;
const formatMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const normalizeType = (tipo = '') => (tipo.toLowerCase().includes('pelu') ? 'peluqueria' : 'clinica');
const isFinalizado = (estado = '') => ['finalizado', 'servicio terminado', 'peluqueria finalizada'].includes(estado.toLowerCase());

function getResponsable(turno) {
  const base = normalizeType(turno.tipo) === 'clinica' ? 'Médica veterinaria' : 'Peluquera canina';
  return turno.necesitaTraslado ? `${base} + Transportista (Incluye traslado)` : base;
}

export default function InformesDashboard() {
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [traslado, setTraslado] = useState('todos');
  const [orden, setOrden] = useState('desc');
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    startTransition(async () => {
      const res = await getTurnosForReports();
      if (res.success) setTurnos(res.data || []);
      else setError(res.error || 'No se pudieron cargar los turnos.');
    });
  }, []);

  const estadosDisponibles = useMemo(() => [...new Set(turnos.map(t => t.estado).filter(Boolean))], [turnos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const startAt = startDate ? new Date(`${startDate}T00:00:00-03:00`) : null;
    const endAt = endDate ? new Date(`${endDate}T23:59:59-03:00`) : null;

    const data = turnos.filter((t) => {
      const tType = normalizeType(t.tipo);
      const dt = t.fecha ? new Date(t.fecha) : null;
      if (!dt) return false;
      if (term) {
        const hay = `${t.mascota?.nombre || ''} ${t.user?.nombre || ''} ${t.user?.apellido || ''} ${t.servicioNombre || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (tipo !== 'todos' && tType !== tipo) return false;
      if (estado !== 'todos' && t.estado !== estado) return false;
      if (traslado === 'si' && !t.necesitaTraslado) return false;
      if (traslado === 'no' && t.necesitaTraslado) return false;
      if (startAt && dt < startAt) return false;
      if (endAt && dt > endAt) return false;
      return true;
    });

    data.sort((a, b) => (orden === 'asc' ? new Date(a.fecha) - new Date(b.fecha) : new Date(b.fecha) - new Date(a.fecha)));
    return data;
  }, [turnos, search, tipo, estado, traslado, startDate, endDate, orden]);

  const resumen = useMemo(() => ({
    total: filtered.length,
    clinica: filtered.filter(t => normalizeType(t.tipo) === 'clinica').length,
    peluqueria: filtered.filter(t => normalizeType(t.tipo) === 'peluqueria').length,
    traslado: filtered.filter(t => t.necesitaTraslado).length,
    cancelados: filtered.filter(t => (t.estado || '').toLowerCase() === 'cancelado').length,
    finalizados: filtered.filter(t => isFinalizado(t.estado)).length,
  }), [filtered]);

  const mensual = useMemo(() => {
    const subset = turnos.filter((t) => {
      if (!t.fecha) return false;
      const d = new Date(t.fecha);
      return String(d.getUTCFullYear()) === year && String(d.getUTCMonth() + 1).padStart(2, '0') === month;
    });
    const total = subset.length;
    const clinica = subset.filter(t => normalizeType(t.tipo) === 'clinica');
    const pelu = subset.filter(t => normalizeType(t.tipo) === 'peluqueria');
    const cancelados = subset.filter(t => (t.estado || '').toLowerCase() === 'cancelado').length;
    const pendientes = subset.filter(t => (t.estado || '').toLowerCase() === 'pendiente').length;
    const confirmados = subset.filter(t => (t.estado || '').toLowerCase() === 'confirmado').length;
    const finalizados = subset.filter(t => isFinalizado(t.estado)).length;
    const totalRev = subset.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
    const revClin = clinica.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
    const revPelu = pelu.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
    const services = {};
    const byDay = {};
    const byState = {};
    subset.forEach((t) => {
      const svc = t.servicioNombre || 'Sin servicio';
      services[svc] = (services[svc] || 0) + 1;
      const day = formatDate(t.fecha);
      byDay[day] = (byDay[day] || 0) + 1;
      const st = t.estado || 'sin estado';
      byState[st] = (byState[st] || 0) + 1;
    });
    const topService = Object.entries(services).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
    const topDay = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
    return {
      subset, total, clinica: clinica.length, peluqueria: pelu.length, traslado: subset.filter(t=>t.necesitaTraslado).length,
      cancelados, pendientes, confirmados, finalizados, topService, topDay,
      totalRev, revClin, revPelu,
      cancelPct: total ? (cancelados * 100) / total : 0,
      finalPct: total ? (finalizados * 100) / total : 0,
      services: Object.entries(services).sort((a,b)=>b[1]-a[1]), byDay: Object.entries(byDay).sort((a,b)=>new Date(a[0].split('/').reverse().join('-'))-new Date(b[0].split('/').reverse().join('-'))), byState: Object.entries(byState).sort((a,b)=>b[1]-a[1])
    };
  }, [turnos, month, year]);

  const exportCsv = () => {
    const rows = filtered.map((t) => [
      formatDate(t.fecha), formatTime(t.fecha), t.mascota?.nombre || '', `${t.user?.nombre || ''} ${t.user?.apellido || ''}`.trim(), t.user?.email || '',
      t.servicioNombre || '', normalizeType(t.tipo), getResponsable(t), t.estado || '', t.necesitaTraslado ? 'Sí' : 'No', t.precio ?? '', t.metodoPago || '', t.motivoCancelacion || ''
    ]);
    const headers = ['Fecha','Hora','Mascota','Dueño','Email del dueño','Servicio','Tipo','Responsable','Estado','Traslado','Precio','Método de pago','Motivo de cancelación'];
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listado_turnos_${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="rounded-lg bg-red-100 p-4 text-red-700">{error}</div>;

  return <div className="space-y-6">
    <h1 className="text-3xl font-bold text-gray-800">Listados e Informes</h1>
    <section className="rounded-2xl border bg-white p-4">
      <h2 className="text-xl font-semibold mb-4">Listado operativo de turnos</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 text-sm">{[
        ['Total',resumen.total],['Clínica',resumen.clinica],['Peluquería',resumen.peluqueria],['Con traslado',resumen.traslado],['Cancelados',resumen.cancelados],['Finalizados',resumen.finalizados]
      ].map(([k,v])=><div key={k} className="rounded border bg-gray-50 p-3"><p className="text-gray-500">{k}</p><p className="text-xl font-bold">{v}</p></div>)}</div>
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <input className="border rounded px-3 py-2" placeholder="Buscar mascota, dueño o servicio" value={search} onChange={(e)=>setSearch(e.target.value)} />
        <select className="border rounded px-3 py-2" value={tipo} onChange={(e)=>setTipo(e.target.value)}><option value="todos">Todos</option><option value="clinica">Clínica</option><option value="peluqueria">Peluquería</option></select>
        <select className="border rounded px-3 py-2" value={estado} onChange={(e)=>setEstado(e.target.value)}><option value="todos">Todos los estados</option>{estadosDisponibles.map(e=><option key={e} value={e}>{e}</option>)}</select>
        <select className="border rounded px-3 py-2" value={traslado} onChange={(e)=>setTraslado(e.target.value)}><option value="todos">Con y sin traslado</option><option value="si">Solo con traslado</option><option value="no">Solo sin traslado</option></select>
        <input type="date" className="border rounded px-3 py-2" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
        <select className="border rounded px-3 py-2" value={orden} onChange={(e)=>setOrden(e.target.value)}><option value="desc">Fecha descendente</option><option value="asc">Fecha ascendente</option></select>
        <button onClick={exportCsv} className="rounded bg-blue-600 text-white px-3 py-2">Exportar CSV</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm"><thead><tr className="bg-gray-50 text-left"><th className="p-2">Fecha/Hora</th><th className="p-2">Mascota</th><th className="p-2">Dueño</th><th className="p-2">Servicio</th><th className="p-2">Tipo</th><th className="p-2">Responsable</th><th className="p-2">Estado</th><th className="p-2">Pago</th><th className="p-2">Precio</th><th className="p-2">Traslado</th><th className="p-2">Motivo cancelación</th><th className="p-2">Comentario / medicamentos</th></tr></thead>
        <tbody>{filtered.map(t=><tr key={t.id} className="border-t align-top"><td className="p-2">{formatDateTime(t.fecha)}</td><td className="p-2">{t.mascota?.nombre || 'N/A'}</td><td className="p-2">{t.user?.nombre} {t.user?.apellido}</td><td className="p-2">{t.servicioNombre || 'N/A'}</td><td className="p-2">{normalizeType(t.tipo)}</td><td className="p-2">{getResponsable(t)}</td><td className="p-2">{t.estado}</td><td className="p-2">{t.metodoPago || '-'}</td><td className="p-2">{typeof t.precio !== 'undefined' && t.precio !== null ? formatMoney(Number(t.precio)) : '-'}</td><td className="p-2">{t.necesitaTraslado ? 'Sí' : 'No'}</td><td className="p-2">{t.motivoCancelacion || '-'}</td><td className="p-2">{t.comentario || '-'} {t.medicamentosSuministrados?.length ? `| Meds: ${t.medicamentosSuministrados.join(', ')}` : ''}</td></tr>)}
        {!filtered.length && <tr><td colSpan={12} className="p-4 text-center text-gray-500">No hay turnos para los filtros seleccionados.</td></tr>}</tbody></table>
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-4">
      <h2 className="text-xl font-semibold mb-4">Informe mensual de servicios y atención</h2>
      <div className="flex gap-3 mb-4"><select className="border rounded px-3 py-2" value={month} onChange={(e)=>setMonth(e.target.value)}>{Array.from({length:12}).map((_,i)=>{const v=String(i+1).padStart(2,'0');return <option key={v} value={v}>{v}</option>;})}</select><input className="border rounded px-3 py-2 w-28" value={year} onChange={(e)=>setYear(e.target.value.replace(/\D/g,''))} /></div>
      {!mensual.total ? <p className="text-gray-600">No hay turnos registrados para el período seleccionado.</p> : <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">{[
        ['Total mes',mensual.total],['Clínica',mensual.clinica],['Peluquería',mensual.peluqueria],['Con traslado',mensual.traslado],['Cancelados',mensual.cancelados],['Pendientes',mensual.pendientes],['Confirmados',mensual.confirmados],['Finalizados',mensual.finalizados],['Servicio más solicitado',mensual.topService],['Día más cargado',mensual.topDay],['% cancelación',`${mensual.cancelPct.toFixed(1)}%`],['% finalización',`${mensual.finalPct.toFixed(1)}%`]
      ].map(([k,v])=><div key={k} className="rounded border bg-gray-50 p-3"><p className="text-gray-500">{k}</p><p className="text-base font-bold">{v}</p></div>)}</div>
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="rounded border p-3"><h3 className="font-semibold">Recaudación estimada</h3><p>Total: {formatMoney(mensual.totalRev)}</p><p>Clínica: {formatMoney(mensual.revClin)}</p><p>Peluquería: {formatMoney(mensual.revPelu)}</p></div>
        <div className="rounded border p-3"><h3 className="font-semibold">Distribución por tipo</h3><p>Clínica: {mensual.clinica}</p><p>Peluquería: {mensual.peluqueria}</p><p>Traslado: {mensual.traslado}</p></div>
        <div className="rounded border p-3"><h3 className="font-semibold">Distribución por estado</h3>{mensual.byState.map(([k,v])=><p key={k}>{k}: {v}</p>)}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded border p-3"><h3 className="font-semibold mb-2">Servicios más solicitados</h3>{mensual.services.map(([k,v])=><p key={k}>{k}: {v}</p>)}</div>
        <div className="rounded border p-3"><h3 className="font-semibold mb-2">Turnos por día</h3>{mensual.byDay.map(([k,v])=><p key={k}>{k}: {v}</p>)}</div>
      </div></>}
    </section>
    {isPending && <p className="text-sm text-gray-500">Cargando...</p>}
  </div>;
}
