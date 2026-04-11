export const PROVINCIA_FIJA = 'La Pampa';
export const CIUDAD_FIJA = 'Santa Rosa';

// Barrios relevados a partir de nomenclaturas y comunicaciones públicas de la Municipalidad de Santa Rosa.
export const BARRIOS_SANTA_ROSA = [
  'Centro',
  'Villa Alonso',
  'Villa Elvina',
  'Villa Santillán',
  'Villa Germinal',
  'Villa Elisa',
  'Villa del Busto',
  'Villa Tomás Mason Norte',
  'Villa Tomás Mason Sur',
  'Colonia Escalante',
  'Congreso',
  'Zona Norte',
  'Zona Oeste Quintas',
  'Santa María de La Pampa',
  'Malvinas Argentinas',
  'San Cayetano',
  'Matadero',
  'Plan 5000',
  'Butaló',
  'El Faro',
  'Los Hornos',
  'Pueblos Originarios',
  'Néstor Kirchner',
  'Favaloro',
  'Barrio Jardín',
];

export function construirDireccion({ calle = '', altura = '', barrio = '' }) {
  const calleNormalizada = calle.trim();
  const alturaNormalizada = altura.toString().trim();
  const barrioNormalizado = barrio.trim();

  const calleYAltura = [calleNormalizada, alturaNormalizada].filter(Boolean).join(' ');

  return [
    calleYAltura,
    barrioNormalizado ? `Barrio ${barrioNormalizado}` : '',
    CIUDAD_FIJA,
    PROVINCIA_FIJA,
  ]
    .filter(Boolean)
    .join(', ');
}
