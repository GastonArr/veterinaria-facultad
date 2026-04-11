'use client';

import { useEffect, useState } from 'react';
import { FaTimes, FaSpinner, FaBan } from 'react-icons/fa';

export default function CancelarTurnoModal({ isOpen, turno, onClose, onConfirm, isSubmitting }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setError('');
    }
  }, [isOpen, turno?.id]);

  if (!isOpen || !turno) return null;

  const handleConfirm = async () => {
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setError('Ingresá un motivo para cancelar el turno.');
      return;
    }

    setError('');
    await onConfirm(motivoLimpio);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50">
      <div className="relative w-full max-w-xl p-4 md:h-auto">
        <div className="relative bg-white rounded-lg shadow-xl border border-red-100">
          <div className="flex items-center justify-between p-5 border-b border-red-100 rounded-t">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <FaBan className="mr-2 text-red-500" />
              Cancelar turno
            </h3>
            <button
              onClick={() => onClose()}
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
              aria-label="Cerrar"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 p-4">
              <p className="text-sm text-red-800">
                Vas a cancelar el turno de <strong>{turno.mascota?.nombre}</strong> ({turno.user?.nombre} {turno.user?.apellido}).
              </p>
              <p className="text-xs text-red-700 mt-1">
                El motivo que escribas será visible para el cliente en su historial.
              </p>
            </div>

            <div>
              <label htmlFor="motivo-cancelacion" className="block mb-2 text-sm font-medium text-gray-900">
                Motivo de cancelación
              </label>
              <textarea
                id="motivo-cancelacion"
                rows="4"
                maxLength={300}
                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-red-400 focus:border-red-400"
                placeholder="Ej: El profesional no estará disponible en ese horario."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500 text-right">{motivo.length}/300</p>
            </div>

            {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
          </div>

          <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b justify-end">
            <button
              onClick={() => onClose()}
              type="button"
              className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5"
            >
              Volver
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              type="button"
              className="inline-flex items-center text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-red-300"
            >
              {isSubmitting && <FaSpinner className="mr-2 animate-spin" />}
              {isSubmitting ? 'Cancelando...' : 'Confirmar cancelación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
