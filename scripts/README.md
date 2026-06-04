# Scripts de datos demo

## `npm run seed:demo`

Carga datos variados en Firestore para probar listados e informes sin tener que crear turnos manualmente.

El script usa las mismas credenciales de Firebase Admin que la app:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Qué crea

- 6 clientes demo con datos de contacto.
- 12 mascotas demo.
- 18 turnos en `users/{userId}/mascotas/{mascotaId}/turnos/{turnoId}`.
- Turnos de clínica y peluquería.
- Turnos con y sin traslado.
- Estados variados: `pendiente`, `confirmado`, `traslado confirmado`, `buscando`, `reprogramar`, `finalizado`, `peluqueria finalizada`, `servicio terminado` y `cancelado`.
- Cancelaciones variadas por `cliente`, `admin`, `transportista` y `peluquera`.
- Motivos de cancelación, comentarios y medicamentos suministrados en turnos clínicos.

### Comandos

```bash
npm run seed:demo
```

Vuelve a escribir los mismos documentos demo de forma determinística.

```bash
npm run seed:demo -- --reset
```

Borra primero los datos demo conocidos y luego los vuelve a cargar.

```bash
npm run seed:demo -- --clear
```

Borra solamente los datos demo conocidos.

> Los documentos creados incluyen `demoSeed: "demo-seed-informes-v1"` para identificarlos fácilmente.
