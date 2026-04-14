export const DNI_DIGITS_REGEX = /^\d{7,8}$/;
export const DNI_FORMAT_REGEX = /^(?:\d{1,2}\.?\d{3}\.?\d{3}|\d{7,8})$/;

export const sanitizeDni = (value = '') => value.replace(/\D/g, '');

export const formatDni = (value = '') => {
  const digits = sanitizeDni(value).slice(0, 8);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, digits.length - 3)}.${digits.slice(-3)}`;
  return `${digits.slice(0, digits.length - 6)}.${digits.slice(-6, -3)}.${digits.slice(-3)}`;
};

export const isValidArgentineDni = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!DNI_FORMAT_REGEX.test(trimmed)) return false;
  return DNI_DIGITS_REGEX.test(sanitizeDni(trimmed));
};
