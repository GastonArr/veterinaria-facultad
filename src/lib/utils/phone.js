const DIGITS_ONLY_REGEX = /\D/g;

export const sanitizePhoneDigits = (value = '') => value.replace(DIGITS_ONLY_REGEX, '');

export const splitArgentinePhone = (value = '') => {
  const digits = sanitizePhoneDigits(value);

  if (!digits) {
    return { areaCode: '', number: '' };
  }

  const areaLength = Math.min(4, Math.max(2, digits.length - 6));
  return {
    areaCode: digits.slice(0, areaLength),
    number: digits.slice(areaLength),
  };
};

export const buildArgentinePhone = (areaCode = '', number = '') => `${sanitizePhoneDigits(areaCode)}${sanitizePhoneDigits(number)}`;

export const validateArgentinePhone = (value = '') => {
  const digits = sanitizePhoneDigits(value);

  if (!digits) {
    return { isValid: false, error: 'Completá código de área y número.' };
  }

  if (!/^\d{10}$/.test(digits)) {
    return { isValid: false, error: 'Debe tener 10 dígitos en total (código de área + número).' };
  }

  const variants = [2, 3, 4]
    .map((areaLength) => ({
      areaCode: digits.slice(0, areaLength),
      number: digits.slice(areaLength),
    }))
    .filter(({ number }) => number.length >= 6 && number.length <= 8)
    .filter(({ areaCode, number }) => !areaCode.startsWith('0') && !number.startsWith('15'));

  if (variants.length === 0) {
    return {
      isValid: false,
      error: 'Ingresá código de área sin 0 y número local sin 15.',
    };
  }

  return { isValid: true, digits };
};
