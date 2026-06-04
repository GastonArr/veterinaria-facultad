# Scripts de datos demo

## `npm run seed:demo`

Carga datos variados en Firestore para probar listados e informes sin tener que crear turnos manualmente.

## Credenciales necesarias

El script escribe en Firestore con Firebase Admin, por eso necesita credenciales de servidor. No alcanza con las variables `NEXT_PUBLIC_*` del frontend.

El script lee automáticamente `.env.local` y `.env` desde la raíz del proyecto. Podés usar cualquiera de estas opciones:

### Opción 1: archivo JSON de cuenta de servicio

1. Entrá a Firebase Console.
2. Abrí **Configuración del proyecto > Cuentas de servicio**.
3. Generá una clave privada JSON.
4. Guardala fuera del repositorio o agregala al `.gitignore` si la dejás en la carpeta del proyecto.
5. Ejecutá:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json npm run seed:demo
```

En PowerShell:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_KEY = ".\serviceAccountKey.json"; npm run seed:demo
```

También podés usar `GOOGLE_APPLICATION_CREDENTIALS` con la misma ruta.

### Opción 2: variables en `.env.local`

```bash
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Si ya tenés `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, el script lo usa como respaldo para el project id, pero igual necesita `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.

## Qué crea

- 6 clientes demo con datos de contacto.
- 12 mascotas demo.
- 18 turnos en `users/{userId}/mascotas/{mascotaId}/turnos/{turnoId}`.
- Turnos de clínica y peluquería.
- Turnos con y sin traslado.
- Estados variados: `pendiente`, `confirmado`, `traslado confirmado`, `buscando`, `reprogramar`, `finalizado`, `peluqueria finalizada`, `servicio terminado` y `cancelado`.
- Cancelaciones variadas por `cliente`, `admin`, `transportista` y `peluquera`.
- Motivos de cancelación, comentarios y medicamentos suministrados en turnos clínicos.

## Comandos

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
