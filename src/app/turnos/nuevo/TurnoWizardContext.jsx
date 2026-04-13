'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

const TurnoWizardContext = createContext(null);

export const useTurnoWizard = () => {
    const context = useContext(TurnoWizardContext);
    if (!context) {
        throw new Error('useTurnoWizard must be used within a TurnoWizardProvider');
    }
    return context;
};

export const TurnoWizardProvider = ({ children, initialData }) => {
    const {
        mascotas = [],
        catalogoServicios = {},
        configServicios = {},
        diasNoLaborales = [],
        permitirTurnosDiasEspeciales = false
    } = initialData;

    // States from the original component
    const [step, setStep] = useState(1);
    const [selectedMascotaIds, setSelectedMascotaIds] = useState([]);
    const [motivosPorMascota, setMotivosPorMascota] = useState({});
    const [specificServices, setSpecificServices] = useState({});
    const [horarioClinica, setHorarioClinica] = useState({ fecha: undefined, hora: '' });
    const [horarioPeluqueria, setHorarioPeluqueria] = useState({ fecha: undefined, hora: '' });
    const [necesitaTraslado, setNecesitaTraslado] = useState(false);
    const [metodoPago, setMetodoPago] = useState('efectivo');

    // Memoized values from original component
    const selectedMascotas = useMemo(() => mascotas.filter(m => selectedMascotaIds.includes(m.id)), [mascotas, selectedMascotaIds]);

    // Handlers from original component
    const nextStep = () => setStep(p => p + 1);
    const prevStep = () => setStep(p => p - 1);

    const handleMascotaToggle = (mascotaId) => {
        const newSelection = selectedMascotaIds.includes(mascotaId) 
            ? selectedMascotaIds.filter(id => id !== mascotaId) 
            : [...selectedMascotaIds, mascotaId];
        setSelectedMascotaIds(newSelection);

        // Clear data for the deselected pet
        if (!newSelection.includes(mascotaId)) {
            setMotivosPorMascota(p => { const n = {...p}; delete n[mascotaId]; return n; });
            setSpecificServices(p => { const n = {...p}; delete n[mascotaId]; return n; });
        }
    };
    
    const value = {
        // State
        step,
        selectedMascotaIds,
        motivosPorMascota,
        specificServices,
        horarioClinica,
        horarioPeluqueria,
        necesitaTraslado,
        metodoPago,

        // Setters
        setMotivosPorMascota,
        setSpecificServices,
        setHorarioClinica,
        setHorarioPeluqueria,
        setNecesitaTraslado,
        setMetodoPago,

        // Data from server
        mascotas,
        catalogoServicios,
        configServicios,
        diasNoLaborales,
        permitirTurnosDiasEspeciales,

        // Derived state
        selectedMascotas,

        // Handlers
        nextStep,
        prevStep,
        handleMascotaToggle,
    };

    return (
        <TurnoWizardContext.Provider value={value}>
            {children}
        </TurnoWizardContext.Provider>
    );
};
