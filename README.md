# Emergency Info Card Generator

Generate personal Emergency Info Cards with unique shareable links like `https://ruthwikredd.xyz/{id}`. Mobile-friendly, red/white emergency theme, with PDF download and share.

## Features
- Create a card with: Full Name, Insurance Status, Preferred Hospitals, Allergies, Family Doctor, Blood Type, Current Medication, Emergency Contact Number (+country code)
- Short unique alphanumeric ID per card
- Public page at `/{id}` rendering the card
- Emergency Hotlines (India) section fixed on the card
- Share Link button and Download as PDF button
- Data stored securely in MongoDB; no public listing, only retrievable by direct link

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- Frontend: HTML/CSS/Vanilla JS

## Setup
1. Clone/download this repo into your server or local machine.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set `MONGO_URI` to your MongoDB connection string
   - Optionally set `MONGO_DB` (defaults to the DB in your URI)
   - Optionally set `PORT` (default 5000)
4. Run the server (dev hot reload):
   ```bash
   npm run dev
   ```
   Or production:
   ```bash
   npm start
   ```
5. Open http://localhost:5000 to use the app.

## Deploying to your domain `ruthwikredd.xyz`
- Point your domain to the server running this Node app (e.g., via Nginx reverse proxy to port 5000)
- Ensure HTTPS via Let’s Encrypt
- Cards will be accessible at `https://ruthwikredd.xyz/{id}`

## Notes
- IDs are generated with `nanoid` to be short and unique
- API endpoints:
  - `POST /api/cards` create a card (JSON body)
  - `GET /api/cards/:id` fetch card by unique ID
- The card page is a client-rendered page (`public/card.html`) which fetches `/api/cards/:id` based on the current path and renders it.
