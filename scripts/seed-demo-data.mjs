import admin from 'firebase-admin';

const DEMO_TAG = 'demo-seed-informes-v1';
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const args = new Set(process.argv.slice(2));
const shouldClear = args.has('--clear');
const shouldReset = args.has('--reset');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = requireEnv('FIREBASE_PROJECT_ID');
  const clientEmail = requireEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    }),
  });
}

const db = initializeFirebaseAdmin().firestore();

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

const users = [
  {
    id: 'demo-cliente-sofia-pereyra',
    nombre: 'Sofía',
    apellido: 'Pereyra',
    email: 'sofia.pereyra.demo@magalimartin.test',
    dni: '32145876',
    telefonoPrincipal: '2954123456',
    barrio: 'Villa Alonso',
    calle: 'Almirante Brown',
    altura: '1240',
    mascotas: [
      { id: 'luna', nombre: 'Luna', especie: 'Perro', raza: 'Caniche toy', tamaño: 'pequeño', sexo: 'hembra' },
      { id: 'milo', nombre: 'Milo', especie: 'Gato', raza: 'Europeo común', tamaño: 'pequeño', sexo: 'macho' },
    ],
  },
  {
    id: 'demo-cliente-matias-roldan',
    nombre: 'Matías',
    apellido: 'Roldán',
    email: 'matias.roldan.demo@magalimartin.test',
    dni: '28456123',
    telefonoPrincipal: '2954234567',
    barrio: 'Centro',
    calle: 'Av. San Martín',
    altura: '842',
    mascotas: [
      { id: 'toby', nombre: 'Toby', especie: 'Perro', raza: 'Labrador', tamaño: 'grande', sexo: 'macho' },
      { id: 'nina', nombre: 'Nina', especie: 'Perro', raza: 'Mestiza', tamaño: 'mediano', sexo: 'hembra' },
    ],
  },
  {
    id: 'demo-cliente-carla-benitez',
    nombre: 'Carla',
    apellido: 'Benítez',
    email: 'carla.benitez.demo@magalimartin.test',
    dni: '36789124',
    telefonoPrincipal: '2954345678',
    barrio: 'Fitte',
    calle: 'Chile',
    altura: '530',
    mascotas: [
      { id: 'roma', nombre: 'Roma', especie: 'Perro', raza: 'Bulldog francés', tamaño: 'pequeño', sexo: 'hembra' },
      { id: 'simba', nombre: 'Simba', especie: 'Gato', raza: 'Naranja doméstico', tamaño: 'mediano', sexo: 'macho' },
    ],
  },
  {
    id: 'demo-cliente-julian-gomez',
    nombre: 'Julián',
    apellido: 'Gómez',
    email: 'julian.gomez.demo@magalimartin.test',
    dni: '30111222',
    telefonoPrincipal: '2954456789',
    barrio: 'Plan 5000',
    calle: 'México',
    altura: '1722',
    mascotas: [
      { id: 'bruno', nombre: 'Bruno', especie: 'Perro', raza: 'Ovejero alemán', tamaño: 'grande', sexo: 'macho' },
      { id: 'kiara', nombre: 'Kiara', especie: 'Perro', raza: 'Cocker spaniel', tamaño: 'mediano', sexo: 'hembra' },
    ],
  },
  {
    id: 'demo-cliente-valentina-acosta',
    nombre: 'Valentina',
    apellido: 'Acosta',
    email: 'valentina.acosta.demo@magalimartin.test',
    dni: '39654781',
    telefonoPrincipal: '2954567890',
    barrio: 'Colonia Escalante',
    calle: 'Urquiza',
    altura: '315',
    mascotas: [
      { id: 'olivia', nombre: 'Olivia', especie: 'Perro', raza: 'Shih tzu', tamaño: 'pequeño', sexo: 'hembra' },
      { id: 'thor', nombre: 'Thor', especie: 'Perro', raza: 'Pitbull', tamaño: 'grande', sexo: 'macho' },
    ],
  },
  {
    id: 'demo-cliente-ricardo-sosa',
    nombre: 'Ricardo',
    apellido: 'Sosa',
    email: 'ricardo.sosa.demo@magalimartin.test',
    dni: '25777444',
    telefonoPrincipal: '2954678901',
    barrio: 'Butaló',
    calle: 'Hucal',
    altura: '261',
    mascotas: [
      { id: 'coco', nombre: 'Coco', especie: 'Perro', raza: 'Yorkshire', tamaño: 'pequeño', sexo: 'macho' },
      { id: 'mora', nombre: 'Mora', especie: 'Gato', raza: 'Siamés', tamaño: 'pequeño', sexo: 'hembra' },
    ],
  },
];

const schedule = [
  { user: 0, pet: 0, offset: -42, hour: 9, minute: 0, tipo: 'clinica', servicioNombre: 'Consulta general', estado: 'finalizado', precio: 25000, metodoPago: 'efectivo', comentario: 'Control general completo. Peso estable, mucosas normales y buen ánimo.', meds: ['Complejo vitamínico x 7 días'] },
  { user: 0, pet: 0, offset: -36, hour: 14, minute: 0, tipo: 'peluqueria', servicioNombre: 'Baño + corte higiénico', estado: 'servicio terminado', precio: 12000, metodoPago: 'transferencia', traslado: true, comentario: 'Se realizó baño hipoalergénico y corte higiénico. Se entregó perfumada.' },
  { user: 0, pet: 1, offset: -18, hour: 10, minute: 30, tipo: 'clinica', servicioNombre: 'Vacunación anual', estado: 'finalizado', precio: 18000, metodoPago: 'efectivo', comentario: 'Aplicada vacuna triple felina. Se recomienda observación 24 hs.', meds: ['Vacuna triple felina'] },
  { user: 1, pet: 0, offset: -25, hour: 16, minute: 0, tipo: 'peluqueria', servicioNombre: 'Baño sanitario perro grande', estado: 'cancelado', precio: 18000, metodoPago: 'transferencia', traslado: true, canceladoPor: 'transportista', motivo: 'El vehículo tuvo una demora por corte de calle y no se pudo retirar a tiempo.', comentario: 'Cancelación operativa informada por transporte.' },
  { user: 1, pet: 1, offset: -9, hour: 11, minute: 0, tipo: 'clinica', servicioNombre: 'Control dermatológico', estado: 'reprogramar', precio: 28000, metodoPago: 'efectivo', comentario: 'La administración solicitó reprogramar por agenda médica completa.' },
  { user: 1, pet: 1, offset: 4, hour: 15, minute: 30, tipo: 'clinica', servicioNombre: 'Revisión de piel', estado: 'confirmado', precio: 28000, metodoPago: 'efectivo', comentario: 'Turno confirmado para evaluar irritación recurrente.' },
  { user: 2, pet: 0, offset: -31, hour: 13, minute: 0, tipo: 'peluqueria', servicioNombre: 'Corte de raza + baño', estado: 'cancelado', precio: 15000, metodoPago: 'efectivo', traslado: false, canceladoPor: 'cliente', motivo: 'La mascota amaneció con decaimiento y la dueña prefirió esperar.', comentario: 'Cliente avisó con anticipación.' },
  { user: 2, pet: 0, offset: -12, hour: 17, minute: 0, tipo: 'peluqueria', servicioNombre: 'Baño medicado', estado: 'peluqueria finalizada', precio: 14000, metodoPago: 'transferencia', traslado: true, comentario: 'Se usó shampoo medicado indicado por veterinaria. Pelo con menos descamación.' },
  { user: 2, pet: 1, offset: 1, hour: 9, minute: 30, tipo: 'clinica', servicioNombre: 'Consulta por inapetencia', estado: 'pendiente', precio: 25000, metodoPago: 'efectivo', comentario: 'Pendiente de confirmación por administración.' },
  { user: 3, pet: 0, offset: -60, hour: 8, minute: 30, tipo: 'clinica', servicioNombre: 'Consulta traumatológica', estado: 'finalizado', precio: 32000, metodoPago: 'transferencia', comentario: 'Marcha normal al control. Continuar caminatas cortas.', meds: ['Meloxicam 3 días'] },
  { user: 3, pet: 0, offset: -5, hour: 12, minute: 0, tipo: 'peluqueria', servicioNombre: 'Deslanado + baño profundo', estado: 'cancelado', precio: 22000, metodoPago: 'efectivo', traslado: true, canceladoPor: 'peluquera', motivo: 'La peluquera informó irritación en piel y recomendó evaluación médica previa.', comentario: 'No se realizó el servicio para evitar empeorar la piel.' },
  { user: 3, pet: 1, offset: 8, hour: 18, minute: 0, tipo: 'peluqueria', servicioNombre: 'Baño + corte de mantenimiento', estado: 'traslado confirmado', precio: 13000, metodoPago: 'transferencia', traslado: true, comentario: 'Traslado confirmado. Retiro coordinado por la tarde.' },
  { user: 4, pet: 0, offset: -20, hour: 15, minute: 0, tipo: 'clinica', servicioNombre: 'Limpieza dental', estado: 'cancelado', precio: 45000, metodoPago: 'transferencia', traslado: false, canceladoPor: 'admin', motivo: 'Se canceló por mantenimiento programado del consultorio.', comentario: 'Administración ofreció prioridad para reprogramación.' },
  { user: 4, pet: 0, offset: 12, hour: 10, minute: 0, tipo: 'clinica', servicioNombre: 'Evaluación prequirúrgica', estado: 'pendiente', precio: 30000, metodoPago: 'efectivo', comentario: 'Solicitar ayuno y estudios previos si confirma cirugía.' },
  { user: 4, pet: 1, offset: -2, hour: 19, minute: 0, tipo: 'peluqueria', servicioNombre: 'Baño perro grande', estado: 'buscando', precio: 19000, metodoPago: 'efectivo', traslado: true, comentario: 'Transportista en camino al domicilio del cliente.' },
  { user: 5, pet: 0, offset: -14, hour: 11, minute: 30, tipo: 'peluqueria', servicioNombre: 'Corte tijera + baño', estado: 'servicio terminado', precio: 12500, metodoPago: 'transferencia', traslado: false, comentario: 'Corte a tijera prolijo. Se detectaron nudos detrás de orejas.' },
  { user: 5, pet: 1, offset: -7, hour: 9, minute: 0, tipo: 'clinica', servicioNombre: 'Control renal', estado: 'finalizado', precio: 27000, metodoPago: 'efectivo', comentario: 'Control renal estable. Repetir análisis en 3 meses.', meds: ['Alimento renal indicado'] },
  { user: 5, pet: 1, offset: 3, hour: 16, minute: 30, tipo: 'clinica', servicioNombre: 'Extracción de sangre', estado: 'confirmado', precio: 22000, metodoPago: 'transferencia', comentario: 'Confirmado. La mascota debe asistir con 8 hs de ayuno.' },
];

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
    servicioId: item.servicioNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    servicioNombre: item.servicioNombre,
    precio: item.precio,
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

  for (const user of users) {
    for (const pet of user.mascotas) {
      const turnosSnapshot = await db.collection('users').doc(user.id).collection('mascotas').doc(pet.id).collection('turnos').get();
      deletedTurnos += await deleteBatch(turnosSnapshot);
    }
    const mascotasSnapshot = await db.collection('users').doc(user.id).collection('mascotas').get();
    deletedMascotas += await deleteBatch(mascotasSnapshot);
    const userRef = db.collection('users').doc(user.id);
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data()?.demoSeed === DEMO_TAG) {
      await userRef.delete();
      deletedUsers += 1;
    }
  }

  console.log(`Datos demo eliminados: ${deletedUsers} usuarios, ${deletedMascotas} mascotas, ${deletedTurnos} turnos.`);
}

async function seedData() {
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
