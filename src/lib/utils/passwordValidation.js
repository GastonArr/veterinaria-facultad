const PASSWORD_REQUIREMENTS = [
  { id: 'length', text: 'Al menos 8 caracteres', regex: /.{8,}/ },
  { id: 'lowercase', text: 'Al menos una letra minúscula (a-z)', regex: /[a-z]/ },
  { id: 'uppercase', text: 'Al menos una letra mayúscula (A-Z)', regex: /[A-Z]/ },
  { id: 'number', text: 'Al menos un número (0-9)', regex: /\d/ },
  { id: 'special', text: 'Al menos un carácter especial (!@#$...)', regex: /[^A-Za-z0-9]/ },
];

export function getPasswordValidation(password = '') {
  const unmetRequirements = PASSWORD_REQUIREMENTS.filter((requirement) => !requirement.regex.test(password));

  return {
    isValid: unmetRequirements.length === 0,
    unmetRequirements,
  };
}

export { PASSWORD_REQUIREMENTS };
