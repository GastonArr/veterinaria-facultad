'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import { documentarTurno } from '@/lib/actions/turnos.admin.actions.js';

export default function DocumentarTurnoModal({ isOpen, onClose, turno, medicamentosCatalog }) {
  const [comentario, setComentario] = useState('');
  const [selectedMedicamentos, setSelectedMedicamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (turno) {
      setComentario(turno.comentario || '');
      setSelectedMedicamentos(turno.medicamentosSuministrados || []);
      setError(null);
      setSuccess(false);
    }
  }, [turno]);

  if (!isOpen || !turno) return null;

  const handleToggleMedicamento = (medId, medObj) => {
    setSelectedMedicamentos((prev) => {
      const exists = prev.find((m) => m.id === medId);
      if (exists) {
        return prev.filter((m) => m.id !== medId);
      } else {
        return [...prev, { id: medId, nombre: medObj.nombre, precio: medObj.precio }];
      }
    });
  };

  const esPeluqueria = turno?.tipo === 'peluqueria';

  const handleSave = async () => {
    if (esPeluqueria && !comentario.trim()) {
      setError('Para turnos de peluquería, el historial del corte es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await documentarTurno({
        userId: turno.userId,
        mascotaId: turno.mascotaId,
        turnoId: turno.id,
        comentario,
        medicamentosSuministrados: esPeluqueria ? [] : selectedMedicamentos
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose(true); // pass true to indicate it was saved successfully so parent can refresh if needed
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Error inesperado al intentar guardar la documentación.");
    } finally {
      setLoading(false);
    }
  };

  const medsEntries = medicamentosCatalog ? Object.entries(medicamentosCatalog) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50">
      <div className="relative w-full max-w-2xl p-4 md:h-auto">
        <div className="relative bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b rounded-t">
            <h3 className="text-xl font-medium text-gray-900">
              Documentar Turno de {turno.mascota?.nombre}
            </h3>
            <button
              onClick={() => onClose()}
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Comentario */}
            <div>
              <label htmlFor="comentario" className="block mb-2 text-sm font-medium text-gray-900">
                {esPeluqueria ? 'Historial del corte' : 'Comentarios / Historia Clínica'}
              </label>
              <p className="mb-2 text-xs text-gray-500">
                {esPeluqueria
                  ? 'Registrá aquí el detalle del corte y observaciones de peluquería.'
                  : 'Registrá aquí el historial de la visita (diagnóstico, evolución, indicaciones y observaciones clínicas).'}
              </p>
              <textarea
                id="comentario"
                rows="4"
                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder={esPeluqueria ? 'Escribe aquí el detalle del corte realizado...' : 'Escribe aquí las observaciones de la consulta...'}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              ></textarea>
            </div>

            {/* Medicamentos */}
            {!esPeluqueria && <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Medicamentos Suministrados (Opcional)
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Seleccioná los medicamentos aplicados durante la atención para que queden asentados en el historial del turno.
              </p>
              {medsEntries.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay medicamentos en el catálogo (revisa la pestaña de servicios).</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {medsEntries.map(([medId, medObj]) => {
                    const isSelected = selectedMedicamentos.some(m => m.id === medId);
                    return (
                      <div 
                        key={medId} 
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => handleToggleMedicamento(medId, medObj)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{medObj.nombre}</p>
                          <p className="text-xs text-gray-500">${medObj.precio}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>}
            
            {/* Feedback */}
            {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
            {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-lg">¡Documentación guardada correctamente!</div>}
          </div>

          {/* Footer */}
          <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b justify-end">
            <button
              onClick={() => onClose()}
              type="button"
              className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              type="button"
              className="inline-flex items-center text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-blue-300"
            >
              {loading && <FaSpinner className="mr-2 animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
