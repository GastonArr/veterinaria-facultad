import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

const DEMO_TAG = 'demo-seed-informes-v1';
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const args = new Set(process.argv.slice(2));
const shouldClear = args.has('--clear');
const shouldReset = args.has('--reset');

loadLocalEnvFiles();

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadLocalEnvFiles() {
  ['.env.local', '.env'].forEach((fileName) => {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) return;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      const parsed = parseEnvLine(line);
      if (parsed && !process.env[parsed.key]) {
        process.env[parsed.key] = parsed.value;
      }
    });
  });
}

function missingCredentialsMessage(missingNames) {
  return `
No pude inicializar Firebase Admin porque faltan credenciales: ${missingNames.join(', ')}.

El script ahora lee automáticamente .env.local y .env, pero para escribir en Firestore necesita credenciales de servidor, no alcanza con las NEXT_PUBLIC_* del frontend.

Opciones rápidas:
1) En Firebase Console > Configuración del proyecto > Cuentas de servicio, generá una clave privada JSON.
2) Usá una de estas formas:

   A. Guardá el JSON en una ruta local y ejecutá:
      FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json npm run seed:demo

   B. O copiá estos valores en .env.local:
      FIREBASE_PROJECT_ID=tu-project-id
      FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project-id.iam.gserviceaccount.com
      FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

En PowerShell podés setear la ruta así:
$env:FIREBASE_SERVICE_ACCOUNT_KEY = ".\\serviceAccountKey.json"; npm run seed:demo
`;
}

function serviceAccountFromJson(jsonValue) {
  const parsed = JSON.parse(jsonValue);
  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key?.replace(/\\n/g, '\n'),
  };
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return serviceAccountFromJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const absolutePath = path.resolve(process.cwd(), keyPath);
    return serviceAccountFromJson(fs.readFileSync(absolutePath, 'utf8'));
  }

  return {
    project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccount();
  const missingNames = [
    ['FIREBASE_PROJECT_ID', serviceAccount.project_id],
    ['FIREBASE_CLIENT_EMAIL', serviceAccount.client_email],
    ['FIREBASE_PRIVATE_KEY', serviceAccount.private_key],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingNames.length > 0) {
    throw new Error(missingCredentialsMessage(missingNames));
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

let db;
try {
  db = initializeFirebaseAdmin().firestore();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function toTimestamp(date, time) {
  return admin.firestore.Timestamp.fromDate(new Date(`${date}T${time}:00-03:00`));
}

function timestampFromOffset(daysOffset, hour, minute = 0) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + daysOffset);
  const date = formatter.format(base);
  return {
    date,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    timestamp: toTimestamp(date, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`),
  };
}

function turnoId(userId, mascotaId, index) {
  return `${DEMO_TAG}-${userId}-${mascotaId}-${String(index + 1).padStart(2, '0')}`;
}

const baseClients = [
  ['Sofía', 'Pereyra', 'Villa Alonso', 'Almirante Brown'],
  ['Matías', 'Roldán', 'Centro', 'Av. San Martín'],
  ['Carla', 'Benítez', 'Fitte', 'Chile'],
  ['Julián', 'Gómez', 'Plan 5000', 'México'],
  ['Valentina', 'Acosta', 'Colonia Escalante', 'Urquiza'],
  ['Ricardo', 'Sosa', 'Butaló', 'Hucal'],
  ['Camila', 'Fernández', 'Villa Santillán', 'Pío XII'],
  ['Nicolás', 'Molina', 'Los Hornos', 'Brasil'],
  ['Mariana', 'López', 'Aeropuerto', 'Tello'],
  ['Agustín', 'Navarro', 'Villa Elisa', 'Raúl B. Díaz'],
  ['Lucía', 'Torres', 'Centro', 'Gil'],
  ['Federico', 'Suárez', 'Villa Alonso', 'Mansilla'],
  ['Paula', 'Herrera', 'Fitte', 'Unanue'],
  ['Germán', 'Castro', 'Butaló', 'Cavero'],
  ['Florencia', 'Medina', 'Plan 5000', 'Utracán'],
  ['Diego', 'Romero', 'Los Fresnos', 'Santiago Marzo'],
  ['Natalia', 'Aguirre', 'Villa del Busto', 'Antártida Argentina'],
  ['Ezequiel', 'Silva', 'Colonia Escalante', 'Jujuy'],
  ['Rocío', 'Vega', 'Villa Parque', 'Entre Ríos'],
  ['Martín', 'Ortega', 'Centro', 'Rivadavia'],
  ['Noelia', 'Ramos', 'Villa Santillán', 'Pasteur'],
  ['Andrés', 'Cabrera', 'Los Hornos', 'Luro'],
  ['Milagros', 'Ponce', 'Butaló', 'Catriló'],
  ['Sebastián', 'Morales', 'Aeropuerto', 'Ameghino'],
  ['Antonella', 'Ibarra', 'Fitte', 'Varela'],
  ['Leandro', 'Fuentes', 'Villa Alonso', 'Córdoba'],
  ['Micaela', 'Ríos', 'Colonia Escalante', 'Mendoza'],
  ['Tomás', 'Villar', 'Plan 5000', 'Santa Cruz'],
  ['Daniela', 'Méndez', 'Villa del Busto', 'Neuquén'],
  ['Pablo', 'Carrizo', 'Los Fresnos', 'Catamarca'],
  ['Julieta', 'Godoy', 'Centro', 'Moreno'],
  ['Maximiliano', 'Luna', 'Villa Elisa', 'Tucumán'],
  ['Gabriela', 'Farias', 'Butaló', 'Toay'],
  ['Emiliano', 'Correa', 'Fitte', 'Córdoba'],
  ['Aldana', 'Mansilla', 'Los Hornos', 'Stieben'],
  ['Hernán', 'Quiroga', 'Aeropuerto', '1 de Mayo'],
  ['Cecilia', 'Arias', 'Villa Santillán', 'Olascoaga'],
  ['Santiago', 'Ferreyra', 'Centro', 'Pellegrini'],
  ['Bárbara', 'Miranda', 'Villa Parque', 'Salta'],
  ['Ignacio', 'Peralta', 'Plan 5000', 'Chaco'],
  ['Josefina', 'Campos', 'Colonia Escalante', 'La Rioja'],
  ['Gonzalo', 'Duarte', 'Villa Alonso', 'San Luis'],
  ['Pilar', 'Sánchez', 'Los Fresnos', 'Formosa'],
  ['Ramiro', 'Vázquez', 'Butaló', 'Victorica'],
  ['Ana', 'Espinosa', 'Fitte', 'España'],
  ['Brenda', 'Núñez', 'Aeropuerto', 'Roque Sáenz Peña'],
  ['Cristian', 'Leiva', 'Villa del Busto', 'Guatraché'],
  ['Eliana', 'Montiel', 'Villa Elisa', 'Cervantes'],
  ['Lucas', 'Paz', 'Centro', '9 de Julio'],
  ['Verónica', 'Álvarez', 'Los Hornos', 'Don Bosco'],
];

const petPairs = [
  [
    { id: 'luna', nombre: 'Luna', especie: 'Perro', raza: 'Caniche toy', tamaño: 'pequeño', sexo: 'hembra' },
    { id: 'milo', nombre: 'Milo', especie: 'Gato', raza: 'Europeo común', tamaño: 'pequeño', sexo: 'macho' },
  ],
  [
    { id: 'toby', nombre: 'Toby', especie: 'Perro', raza: 'Labrador', tamaño: 'grande', sexo: 'macho' },
    { id: 'nina', nombre: 'Nina', especie: 'Perro', raza: 'Mestiza', tamaño: 'mediano', sexo: 'hembra' },
  ],
  [
    { id: 'roma', nombre: 'Roma', especie: 'Perro', raza: 'Bulldog francés', tamaño: 'pequeño', sexo: 'hembra' },
    { id: 'simba', nombre: 'Simba', especie: 'Gato', raza: 'Naranja doméstico', tamaño: 'mediano', sexo: 'macho' },
  ],
  [
    { id: 'bruno', nombre: 'Bruno', especie: 'Perro', raza: 'Ovejero alemán', tamaño: 'grande', sexo: 'macho' },
    { id: 'kiara', nombre: 'Kiara', especie: 'Perro', raza: 'Cocker spaniel', tamaño: 'mediano', sexo: 'hembra' },
  ],
  [
    { id: 'olivia', nombre: 'Olivia', especie: 'Perro', raza: 'Shih tzu', tamaño: 'pequeño', sexo: 'hembra' },
    { id: 'thor', nombre: 'Thor', especie: 'Perro', raza: 'Pitbull', tamaño: 'grande', sexo: 'macho' },
  ],
  [
    { id: 'coco', nombre: 'Coco', especie: 'Perro', raza: 'Yorkshire', tamaño: 'pequeño', sexo: 'macho' },
    { id: 'mora', nombre: 'Mora', especie: 'Gato', raza: 'Siamés', tamaño: 'pequeño', sexo: 'hembra' },
  ],
  [
    { id: 'bimba', nombre: 'Bimba', especie: 'Perro', raza: 'Border collie', tamaño: 'mediano', sexo: 'hembra' },
    { id: 'felix', nombre: 'Félix', especie: 'Gato', raza: 'Atigrado', tamaño: 'pequeño', sexo: 'macho' },
  ],
  [
    { id: 'rocky', nombre: 'Rocky', especie: 'Perro', raza: 'Boxer', tamaño: 'grande', sexo: 'macho' },
    { id: 'uma', nombre: 'Uma', especie: 'Perro', raza: 'Beagle', tamaño: 'mediano', sexo: 'hembra' },
  ],
  [
    { id: 'pancho', nombre: 'Pancho', especie: 'Perro', raza: 'Salchicha', tamaño: 'pequeño', sexo: 'macho' },
    { id: 'cleo', nombre: 'Cleo', especie: 'Gato', raza: 'Carey', tamaño: 'pequeño', sexo: 'hembra' },
  ],
  [
    { id: 'zeus', nombre: 'Zeus', especie: 'Perro', raza: 'Dogo argentino', tamaño: 'grande', sexo: 'macho' },
    { id: 'alma', nombre: 'Alma', especie: 'Perro', raza: 'Mestiza', tamaño: 'mediano', sexo: 'hembra' },
  ],
];

const DEFAULT_SERVICE_CATALOG = {
  clinica: [
    { id: 'consulta_general', nombre: 'Consulta_General', precio: 25000 },
  ],
  peluqueria: [
    { id: 'pelar_4cm', nombre: 'Pelar-4cm', precios: { chico: 10000, mediano: 12000, grande: 15000, muy_grande: 18000 } },
  ],
  medicamentos: [
    { id: 'vacuna_anual', nombre: 'Vacuna anual', precio: 8000 },
    { id: 'antiparasitario', nombre: 'Antiparasitario', precio: 4500 },
    { id: 'antiinflamatorio', nombre: 'Antiinflamatorio', precio: 6000 },
    { id: 'antibiotico', nombre: 'Antibiótico', precio: 7000 },
  ],
};

const TAMAÑO_PRECIOS_MAP = { pequeño: 'chico', mediano: 'mediano', grande: 'grande', muy_grande: 'muy_grande' };

const estados = [
  'finalizado',
  'servicio terminado',
  'cancelado',
  'confirmado',
  'pendiente',
  'traslado confirmado',
  'buscando',
  'reprogramar',
  'peluqueria finalizada',
];

const cancelaciones = [
  { canceladoPor: 'cliente', motivo: 'El cliente avisó que no podía asistir por un imprevisto familiar.' },
  { canceladoPor: 'admin', motivo: 'Administración canceló por reorganización de agenda y ofreció reprogramación prioritaria.' },
  { canceladoPor: 'transportista', motivo: 'El transportista informó demora por corte de calle y no llegó al domicilio a tiempo.' },
  { canceladoPor: 'peluquera', motivo: 'Peluquería recomendó cancelar por irritación en la piel y derivar a consulta médica.' },
];

const comentariosClinica = [
  'Control general completo. Peso estable, mucosas normales y buen ánimo.',
  'Se revisó evolución del cuadro. La mascota respondió bien al tratamiento indicado.',
  'Se recomienda seguimiento en 15 días y observar apetito, ánimo y consumo de agua.',
  'Paciente tranquilo durante la consulta. Se entregaron pautas de alarma al dueño.',
  'Se indicó control preventivo y actualización de libreta sanitaria.',
];

const comentariosPeluqueria = [
  'Se realizó baño hipoalergénico, secado completo y corte prolijo.',
  'Se retiraron nudos detrás de orejas y se recomendó cepillado semanal.',
  'Servicio terminado sin inconvenientes. La mascota toleró bien el baño.',
  'Se usó shampoo medicado indicado por veterinaria y se observó menos descamación.',
  'Corte de mantenimiento realizado. Se avisó al dueño sobre uñas largas.',
];

function slugify(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function objectToList(value) {
  return Object.entries(value || {}).map(([id, data]) => ({ id, ...data }));
}

function normalizeServiceCatalog(data = {}) {
  const clinica = objectToList(data.clinica).filter((service) => service.nombre && typeof service.precio !== 'undefined');
  const peluqueria = objectToList(data.peluqueria).filter((service) => service.nombre && service.precios);
  const medicamentos = objectToList(data.medicamentos).filter((med) => med.nombre && typeof med.precio !== 'undefined');

  return {
    clinica: clinica.length ? clinica : DEFAULT_SERVICE_CATALOG.clinica,
    peluqueria: peluqueria.length ? peluqueria : DEFAULT_SERVICE_CATALOG.peluqueria,
    medicamentos: medicamentos.length ? medicamentos : DEFAULT_SERVICE_CATALOG.medicamentos,
  };
}

async function getServiceCatalog() {
  const catalogDoc = await db.collection('servicios').doc('catalogo').get();
  if (!catalogDoc.exists) {
    console.warn('No existe servicios/catalogo. Se usarán valores demo mínimos para clínica, peluquería y medicamentos.');
    return DEFAULT_SERVICE_CATALOG;
  }

  return normalizeServiceCatalog(catalogDoc.data());
}

function getServicePrice(service, tipo, pet) {
  if (tipo === 'clinica') return Number(service.precio) || 0;

  const sizeKey = TAMAÑO_PRECIOS_MAP[pet.tamaño] || 'chico';
  return Number(service.precios?.[sizeKey] ?? service.precios?.chico ?? 0);
}

function selectMedicamentos(catalog, userIndex, turnIndex, estado) {
  if (estado === 'cancelado' || !catalog.medicamentos.length || (userIndex + turnIndex) % 2 !== 0) {
    return [];
  }

  const first = catalog.medicamentos[(userIndex + turnIndex) % catalog.medicamentos.length];
  const selected = [{ id: first.id, nombre: first.nombre, precio: Number(first.precio) || 0 }];

  if ((userIndex + turnIndex) % 5 === 0 && catalog.medicamentos.length > 1) {
    const second = catalog.medicamentos[(userIndex + turnIndex + 1) % catalog.medicamentos.length];
    if (second.id !== first.id) {
      selected.push({ id: second.id, nombre: second.nombre, precio: Number(second.precio) || 0 });
    }
  }

  return selected;
}

function sumMedicamentos(medicamentos) {
  return (medicamentos || []).reduce((total, med) => total + (Number(med.precio) || 0), 0);
}

function buildDemoUsers() {
  return baseClients.map(([nombre, apellido, barrio, calle], index) => {
    const pair = petPairs[index % petPairs.length].map((pet, petIndex) => ({
      ...pet,
      id: `${pet.id}-${String(index + 1).padStart(2, '0')}-${petIndex + 1}`,
    }));

    return {
      id: `demo-cliente-${slugify(`${nombre}-${apellido}`)}-${String(index + 1).padStart(2, '0')}`,
      nombre,
      apellido,
      email: `${slugify(`${nombre}.${apellido}`)}.${String(index + 1).padStart(2, '0')}@magalimartin.test`,
      dni: String(24000000 + index * 137291).slice(0, 8),
      telefonoPrincipal: `2954${String(120000 + index * 731).padStart(6, '0')}`,
      barrio,
      calle,
      altura: String(250 + index * 37),
      mascotas: pair,
    };
  });
}

function buildDemoSchedule(catalog) {
  const turnos = [];
  const minuteOptions = [0, 30];
  const hourOptions = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19];

  users.forEach((user, userIndex) => {
    const amount = 3 + (userIndex % 3 === 0 ? 1 : 0);
    for (let turnIndex = 0; turnIndex < amount; turnIndex += 1) {
      const pet = user.mascotas[turnIndex % user.mascotas.length];
      const tipo = (userIndex + turnIndex) % 2 === 0 ? 'clinica' : 'peluqueria';
      const services = tipo === 'clinica' ? catalog.clinica : catalog.peluqueria;
      const service = services[(userIndex + turnIndex * 2) % services.length];
      const estado = estados[(userIndex * 2 + turnIndex) % estados.length];
      const cancelacion = cancelaciones[(userIndex + turnIndex) % cancelaciones.length];
      const offset = -330 + ((userIndex * 17 + turnIndex * 41) % 420);
      const hour = hourOptions[(userIndex + turnIndex * 3) % hourOptions.length];
      const minute = minuteOptions[(userIndex + turnIndex) % minuteOptions.length];
      const necesitaTraslado = tipo === 'peluqueria' && (userIndex + turnIndex) % 3 !== 1;
      const medicamentos = tipo === 'clinica' ? selectMedicamentos(catalog, userIndex, turnIndex, estado) : [];
      const precioBaseServicio = getServicePrice(service, tipo, pet);
      const precioMedicamentos = sumMedicamentos(medicamentos);
      const comentarioBase = tipo === 'clinica'
        ? comentariosClinica[(userIndex + turnIndex) % comentariosClinica.length]
        : comentariosPeluqueria[(userIndex + turnIndex) % comentariosPeluqueria.length];
      const comentarioMedicamentos = medicamentos.length
        ? ` Medicación suministrada: ${medicamentos.map((med) => `${med.nombre} ($${med.precio})`).join(', ')}.`
        : '';

      turnos.push({
        user: userIndex,
        pet: turnIndex % user.mascotas.length,
        offset,
        hour,
        minute,
        tipo,
        servicioId: service.id,
        servicioNombre: service.nombre,
        estado,
        precio: precioBaseServicio + precioMedicamentos,
        precioBaseServicio,
        precioMedicamentos,
        metodoPago: (userIndex + turnIndex) % 2 === 0 ? 'efectivo' : 'transferencia',
        traslado: necesitaTraslado,
        canceladoPor: estado === 'cancelado' ? cancelacion.canceladoPor : undefined,
        motivo: estado === 'cancelado' ? cancelacion.motivo : '',
        comentario: estado === 'cancelado'
          ? `${comentarioBase}${comentarioMedicamentos} Registro de cancelación: ${cancelacion.motivo}`
          : `${comentarioBase}${comentarioMedicamentos}`,
        meds: medicamentos,
      });
    }
  });

  return turnos;
}

const users = buildDemoUsers();

function buildUserDoc(user) {
  return {
    nombre: user.nombre,
    apellido: user.apellido,
    dni: user.dni,
    email: user.email,
    telefonoPrincipal: user.telefonoPrincipal,
    telefonoSecundario: '',
    direccion: `${user.calle} ${user.altura}, Santa Rosa, La Pampa`,
    provincia: 'La Pampa',
    ciudad: 'Santa Rosa',
    barrio: user.barrio,
    calle: user.calle,
    altura: user.altura,
    nombreContactoEmergencia: `Contacto de ${user.nombre}`,
    telefonoContactoEmergencia: user.telefonoPrincipal,
    role: 'dueño',
    profileCompleted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    demoSeed: DEMO_TAG,
  };
}

function buildPetDoc(pet, userIndex, petIndex) {
  const createdAt = timestampFromOffset(-90 + userIndex * 3 + petIndex, 10).timestamp;
  return {
    nombre: pet.nombre,
    especie: pet.especie,
    raza: pet.raza,
    tamaño: pet.tamaño,
    sexo: pet.sexo,
    fechaNacimiento: timestampFromOffset(-900 - userIndex * 120 - petIndex * 60, 12).timestamp,
    observaciones: `Mascota demo para informes: ${pet.nombre}, temperamento ${petIndex % 2 ? 'tranquilo' : 'activo'}.`,
    creadoEn: createdAt,
    createdAt,
    demoSeed: DEMO_TAG,
  };
}

function buildTurnoDoc(item, index) {
  const user = users[item.user];
  const pet = user.mascotas[item.pet];
  const slot = timestampFromOffset(item.offset, item.hour, item.minute);
  const isPeluqueria = item.tipo === 'peluqueria';
  const necesitaTraslado = Boolean(item.traslado);
  const doc = {
    fecha: slot.timestamp,
    horario: slot.time,
    tipo: item.tipo,
    mascotaId: pet.id,
    mascotaNombre: pet.nombre,
    mascotaTamaño: pet.tamaño,
    servicioId: item.servicioId || slugify(item.servicioNombre),
    servicioNombre: item.servicioNombre,
    precio: item.precio,
    precioBaseServicio: item.precioBaseServicio,
    precioMedicamentos: item.precioMedicamentos || 0,
    metodoPago: item.metodoPago,
    estado: item.estado,
    creadoEn: timestampFromOffset(item.offset - 10, 9 + (index % 8), index % 2 ? 30 : 0).timestamp,
    necesitaTraslado,
    clienteId: user.id,
    comentario: item.comentario || '',
    medicamentosSuministrados: isPeluqueria ? [] : item.meds || [],
    demoSeed: DEMO_TAG,
  };

  if (item.estado === 'cancelado') {
    doc.motivoCancelacion = item.motivo;
    doc.canceladoPor = item.canceladoPor;
    doc.canceladoEn = timestampFromOffset(item.offset - 1, 18, 15).timestamp;
  } else {
    doc.motivoCancelacion = '';
    doc.canceladoPor = '';
  }

  return doc;
}

async function deleteBatch(querySnapshot) {
  if (querySnapshot.empty) return 0;
  const batch = db.batch();
  querySnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return querySnapshot.size;
}

async function clearSeedData() {
  let deletedTurnos = 0;
  let deletedMascotas = 0;
  let deletedUsers = 0;

  const demoUsersSnapshot = await db.collection('users').where('demoSeed', '==', DEMO_TAG).get();

  for (const userDoc of demoUsersSnapshot.docs) {
    const mascotasSnapshot = await userDoc.ref.collection('mascotas').get();

    for (const mascotaDoc of mascotasSnapshot.docs) {
      const turnosSnapshot = await mascotaDoc.ref.collection('turnos').get();
      deletedTurnos += await deleteBatch(turnosSnapshot);
    }

    deletedMascotas += await deleteBatch(mascotasSnapshot);
    await userDoc.ref.delete();
    deletedUsers += 1;
  }

  console.log(`Datos demo eliminados: ${deletedUsers} usuarios, ${deletedMascotas} mascotas, ${deletedTurnos} turnos.`);
}

async function seedData() {
  const catalog = await getServiceCatalog();
  const schedule = buildDemoSchedule(catalog);
  const batch = db.batch();
  let userCount = 0;
  let petCount = 0;
  let turnoCount = 0;

  users.forEach((user, userIndex) => {
    batch.set(db.collection('users').doc(user.id), buildUserDoc(user), { merge: true });
    userCount += 1;

    user.mascotas.forEach((pet, petIndex) => {
      batch.set(
        db.collection('users').doc(user.id).collection('mascotas').doc(pet.id),
        buildPetDoc(pet, userIndex, petIndex),
        { merge: true },
      );
      petCount += 1;
    });
  });

  schedule.forEach((item, index) => {
    const user = users[item.user];
    const pet = user.mascotas[item.pet];
    batch.set(
      db.collection('users').doc(user.id).collection('mascotas').doc(pet.id).collection('turnos').doc(turnoId(user.id, pet.id, index)),
      buildTurnoDoc(item, index),
      { merge: true },
    );
    turnoCount += 1;
  });

  await batch.commit();
  console.log(`Datos demo cargados: ${userCount} usuarios, ${petCount} mascotas, ${turnoCount} turnos.`);
  console.log('Incluye turnos de clínica/peluquería, con/sin traslado, pendientes, confirmados, finalizados, reprogramar y cancelados por cliente/admin/transportista/peluquera.');
}

try {
  if (shouldClear || shouldReset) {
    await clearSeedData();
  }

  if (!shouldClear) {
    await seedData();
  }

  process.exit(0);
} catch (error) {
  console.error('No se pudieron cargar los datos demo:', error);
  process.exit(1);
}
