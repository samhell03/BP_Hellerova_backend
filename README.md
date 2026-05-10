# Aplikace pro cestovatele – backend

Backendová část webové aplikace TravelApp slouží jako serverová logika pro správu uživatelů, výletů a souvisejících dat. Poskytuje REST API, které komunikuje s frontendovou částí aplikace.

Projekt je vytvořen v prostředí Node.js s využitím frameworku Express.js a databáze MongoDB.

---

## Použité technologie

- Node.js
- Express.js
- MongoDB + Mongoose
- JSON Web Token (JWT)
- bcrypt
- dotenv
- cors
- axios
- google-auth-library
- Brevo (odesílání e-mailů)

---

## Požadavky

Pro spuštění projektu je potřeba mít nainstalováno:

- Node.js
- npm
- MongoDB (lokálně nebo MongoDB Atlas)

---

## Instalace

Naklonování repozitáře:

```bash
git clone https://github.com/samhell03/BP_Hellerova_backend.git
```

Přechod do složky projektu:

```bash
cd BP_Hellerova_backend
```

Instalace závislostí:

```bash
npm install
```

---

## Konfigurace (.env)

V kořenové složce vytvoř soubor `.env`:

```env
PORT=5000
MONGO_URL=mongodb://127.0.0.1:27017/travelApp
FRONTEND_URL=http://127.0.0.1:5173
JWT_SECRET=heslo

GOOGLE_CLIENT_ID=_google_client_id

BREVO_API_KEY=brevo_api_klic
BREVO_SENDER_EMAIL=email
```

⚠️ Soubor `.env` se nikdy neukládá do repozitáře.

---

## Spuštění projektu

Vývojový režim:

```bash
npm run dev
```

Produkční režim:

```bash
npm start
```

Backend poběží na:

```
http://127.0.0.1:5000
```

---

## Struktura projektu

```
controllers/   logika aplikace
models/        databázové modely
routes/        API endpointy
middleware/    autentizace (JWT)
services/      pomocné služby (např. email)
app.js         vstupní bod aplikace
```

---

## Autentizace

Některé endpointy vyžadují JWT token:

```
Authorization: Bearer <token>
```

---

## API endpointy

Základní URL:

```
http://127.0.0.1:5000/api
```

---

### Auth

| metoda | endpoint | popis |
|--------|----------|------|
| POST | /api/auth/register | registrace |
| POST | /api/auth/login | přihlášení |
| POST | /api/auth/google | přihlášení přes Google |
| GET | /api/auth/me | aktuální uživatel |
| PUT | /api/auth/change-password | změna hesla |
| POST | /api/auth/forgot-password | zapomenuté heslo |
| POST | /api/auth/reset-password | reset hesla |

---

### Trips

| metoda | endpoint | popis |
|--------|----------|------|
| GET | /api/trips | všechny výlety |
| POST | /api/trips | vytvoření výletu |
| GET | /api/trips/:id | detail |
| PUT | /api/trips/:id | úprava |
| DELETE | /api/trips/:id | smazání |

---

### Packages

| metoda | endpoint | popis |
|--------|----------|------|
| GET | /api/packages/trip/:tripId | balíčky |
| POST | /api/packages/import-template | import |
| PUT | /api/packages/:id | úprava |
| DELETE | /api/packages/:id | smazání |

---

### Notes

| metoda | endpoint | popis |
|--------|----------|------|
| GET | /api/notes/trip/:tripId | poznámky |
| POST | /api/notes/trip/:tripId | vytvoření |
| PUT | /api/notes/:id | úprava |
| DELETE | /api/notes/:id | smazání |

---

### Notifications

| metoda | endpoint | popis |
|--------|----------|------|
| GET | /api/notifications | notifikace |
| PUT | /api/notifications/:id/read | označit jako přečtené |

---

### Countries

| metoda | endpoint | popis |
|--------|----------|------|
| GET | /api/countries | seznam zemí |
| GET | /api/countries/cities/search | města |

---

## Nasazení

Backend je možné nasadit například na službu Render.

⚠️ Při použití free verze může dojít k uspání serveru. První požadavek pak může trvat déle.

---

## Odkazy
https://muj-planovac-vyletu.vercel.app

---

## Autor

Samira Hellerová  
Bakalářská práce
