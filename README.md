# Aplikace pro cestovatele – backend
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-API-black?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)

Backendová část webové aplikace vytvořené v rámci bakalářské práce.  
Zajišťuje aplikační logiku, správu dat, autentizaci uživatelů a poskytuje REST API pro frontendovou část aplikace.

Aplikace je navržena jako **klient–server systém**, kde backend komunikuje s frontendem pomocí HTTP požadavků a dat ve formátu JSON.

---

## Online aplikace

Aplikace je dostupná na tomto odkaze:

🔗 https://muj-planovac-vyletu.vercel.app/

---

## Dokumentace

Podrobná uživatelská dokumentace aplikace je dostupná zde:

https://samhell03.github.io/PDO-dokumentace-final/

---

## Použité technologie

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [JSON Web Token (JWT)](https://jwt.io/)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [cors](https://www.npmjs.com/package/cors)
- [axios](https://axios-http.com/)
- [google-auth-library](https://www.npmjs.com/package/google-auth-library)
- [Brevo](https://www.brevo.com/) – e-mailové služby

---

## Hlavní funkcionalita

- registrace uživatele s ověřením e-mailu (ověřovací kód)
- přihlášení pomocí e-mailu a hesla
- přihlášení pomocí Google účtu (OAuth)
- správa uživatelské relace pomocí JWT
- změna hesla s ověřovacím kódem
- obnova zapomenutého hesla
- správa výletů (CRUD operace)
- správa balíčků (počasí, notifikace, checklist)
- práce s poznámkami
- systém notifikací
- integrace externích API (např. počasí)
- odesílání e-mailů (ověřovací kódy)

---

## Bezpečnost

Backend implementuje několik bezpečnostních mechanismů:

- hashování hesel pomocí bcrypt
- autentizace pomocí JWT tokenů
- ochrana endpointů pomocí middleware
- ověřování e-mailu při registraci
- 2FA princip pomocí jednorázových kódů
- oddělení Google účtů (bez správy hesla)

---

## Požadavky na prostředí

Pro spuštění projektu je potřeba:

- [Node.js](https://nodejs.org/) (doporučeno verze 18+)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (lokálně nebo Atlas)
- [Git](https://git-scm.com/)

### Doporučené prostředí

- [Visual Studio Code](https://code.visualstudio.com/)

---

## Instalace projektu

### 1. Naklonování repozitáře

```bash
git clone https://github.com/samhell03/BP_Hellerova_backend.git
```

### 2. Přechod do složky

```bash
cd BP_Hellerova_backend
```

### 3. Instalace závislostí

```bash
npm install
```

---

## Proměnné prostředí

V kořenové složce vytvořte soubor `.env`.

### Příklad obsahu

```env
PORT=5000
MONGO_URL=mongodb://127.0.0.1:27017/travelApp
FRONTEND_URL=http://127.0.0.1:5173
JWT_SECRET=secret

GOOGLE_CLIENT_ID=google_client_id

BREVO_API_KEY=brevo_api_key
BREVO_SENDER_EMAIL=email
```

### Význam proměnných

- `PORT` – port serveru
- `MONGO_URL` – připojení k databázi
- `FRONTEND_URL` – povolený frontend (CORS)
- `JWT_SECRET` – klíč pro podepisování JWT tokenů
- `GOOGLE_CLIENT_ID` – Google OAuth Client ID
- `BREVO_API_KEY` – API klíč služby Brevo pro odesílání e-mailů
- `BREVO_SENDER_EMAIL` – e-mailová adresa odesílatele

---

### Důležité

Soubor `.env` není součástí repozitáře a nesmí obsahovat citlivé údaje ve veřejném kódu.

---

## Spuštění aplikace

### Vývojový režim

```bash
npm run dev
```

### Produkční režim

```bash
npm start
```

---

## Struktura projektu

```txt
controllers/   aplikační logika
models/        databázové modely
routes/        API endpointy
middleware/    autentizace pomocí JWT
services/      služba pro odesílání e-mailů
app.js         vstupní bod aplikace
```

---

## Autentizace

Chráněné endpointy vyžadují JWT token ve tvaru:

```txt
Authorization: Bearer <token>
```

---

## API endpointy

### Auth

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| POST | `/api/auth/register` | registrace uživatele |
| POST | `/api/auth/login` | přihlášení uživatele |
| POST | `/api/auth/google` | přihlášení přes Google |
| GET | `/api/auth/me` | aktuální přihlášený uživatel |
| PUT | `/api/auth/change-password` | změna hesla |
| POST | `/api/auth/forgot-password` | zapomenuté heslo |
| POST | `/api/auth/reset-password` | reset hesla |

### Trips

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/trips` | seznam výletů |
| POST | `/api/trips` | vytvoření výletu |
| GET | `/api/trips/:id` | detail výletu |
| PUT | `/api/trips/:id` | úprava výletu |
| DELETE | `/api/trips/:id` | smazání výletu |

### Packages

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/packages/trip/:tripId` | balíčky k výletu |
| POST | `/api/packages/import-template` | import balíčku |
| PUT | `/api/packages/:id` | úprava balíčku |
| DELETE | `/api/packages/:id` | smazání balíčku |

### Notes

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/notes/trip/:tripId` | poznámky k výletu |
| POST | `/api/notes/trip/:tripId` | vytvoření poznámky |
| PUT | `/api/notes/:id` | úprava poznámky |
| DELETE | `/api/notes/:id` | smazání poznámky |

### Notifications

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/notifications` | seznam notifikací |
| PUT | `/api/notifications/:id/read` | označení notifikace jako přečtené |

### Countries

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/countries` | seznam zemí |
| GET | `/api/countries/cities/search` | vyhledávání měst |

---

## Frontend

Tento repozitář obsahuje pouze backendovou část aplikace.

Frontendová část aplikace je dostupná zde: (https://github.com/samhell03/BP_Hellerova_frontend)

---

## Poznámka k provozu

Backend je nasazen na free hostingu, z tohoto důvodu může být při prvním požadavku delší odezva. Důvodem je tzv. „probuzení serveru“ po delší době neaktivity.

---

**Samira Hellerová – TUL 2026**  
Bakalářská práce
