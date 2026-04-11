'use client'

import { useState, useEffect } from 'react'; // hook 
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const requirements = [
    { id: 1, text: 'Al menos 8 caracteres', regex: /.{8,}/ },
    { id: 2, text: 'Al menos una letra minúscula (a-z)', regex: /[a-z]/ },
    { id: 3, text: 'Al menos una letra mayúscula (A-Z)', regex: /[A-Z]/ },
    { id: 4, text: 'Al menos un número (0-9)', regex: /\d/ },
    { id: 5, text: 'Al menos un carácter especial (!@#$...)', regex: /[^A-Za-z0-9]/ },
];

const PasswordStrengthMeter = ({ password, onStrengthChange }) => {
    const [strength, setStrength] = useState({ percentage: 0, label: '', color: 'bg-gray-200' });
    const [metRequirements, setMetRequirements] = useState([]);

    useEffect(() => {
        const satisfied = requirements.filter(req => req.regex.test(password));
        const score = satisfied.length;

        if (onStrengthChange) {
            onStrengthChange(score);
        }

        setMetRequirements(satisfied.map(req => req.id));

        const percentage = (score / requirements.length) * 100;
        let label = 'Muy Débil';
        let color = 'bg-red-500';

        if (password.length === 0) {
            label = '';
            color = 'bg-gray-200';
        } else if (score <= 2) {
            label = 'Débil';
            color = 'bg-orange-500';
        } else if (score === 3) {
            label = 'Regular';
            color = 'bg-yellow-500';
        } else if (score === 4) {
            label = 'Buena';
            color = 'bg-blue-500';
        } else if (score === 5) {
            label = 'Fuerte';
            color = 'bg-green-500';
        }

        setStrength({ percentage, label, color });

    }, [password, onStrengthChange]);

    return (
        <div className="w-full transition-all duration-300">
            {password.length > 0 && (
                <>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                            style={{ width: `${strength.percentage}%` }}
                        ></div>
                    </div>
                    <p className={`text-xs text-right font-semibold transition-colors duration-500 text-gray-600`}>
                        Seguridad: {strength.label}
                    </p>
                </>
            )}
            <div className="mt-3 space-y-1">
                {requirements.map(req => {
                    const isMet = metRequirements.includes(req.id);
                    return (
                        <div key={req.id} className="flex items-center text-xs">
                            {isMet ? (
                                <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                            ) : (
                                <FaTimesCircle className="text-gray-400 mr-2 flex-shrink-0" />
                            )}
                            <span className={isMet ? 'text-gray-800' : 'text-gray-500'}>
                                {req.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
