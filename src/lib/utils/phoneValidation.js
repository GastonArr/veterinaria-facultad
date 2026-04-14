export const sanitizePhonePart = (value = '') => value.replace(/\D/g, '');

export const isValidArAreaCode = (areaCode = '') => /^(?!0)\d{2,4}$/.test(areaCode);

export const isValidArLocalNumber = (localNumber = '') => /^\d{6,8}$/.test(localNumber) && !localNumber.startsWith('15');

export const isValidArPhoneParts = ({ areaCode = '', localNumber = '' }) => {
  const area = sanitizePhonePart(areaCode);
  const number = sanitizePhonePart(localNumber);

  if (!isValidArAreaCode(area) || !isValidArLocalNumber(number)) return false;
  return area.length + number.length === 10;
};

export const composeArPhone = ({ areaCode = '', localNumber = '' }) => {
  const area = sanitizePhonePart(areaCode);
  const number = sanitizePhonePart(localNumber);
  return `${area}${number}`;
};

export const splitArPhone = (phone = '') => {
  const digits = sanitizePhonePart(phone);
  if (!digits) return { areaCode: '', localNumber: '' };

  for (let areaLen = 4; areaLen >= 2; areaLen -= 1) {
    const localLen = 10 - areaLen;
    const areaCode = digits.slice(0, areaLen);
    const localNumber = digits.slice(areaLen);
    if (digits.length === 10 && isValidArPhoneParts({ areaCode, localNumber })) {
      return { areaCode, localNumber };
    }
  }

  return { areaCode: digits.slice(0, 4), localNumber: digits.slice(4, 10) };
};

export const isValidArPhoneValue = (phone = '') => {
  const digits = sanitizePhonePart(phone);
  if (digits.length !== 10) return false;
  const { areaCode, localNumber } = splitArPhone(digits);
  return isValidArPhoneParts({ areaCode, localNumber });
};
