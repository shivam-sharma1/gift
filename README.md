# Giftwise

Wishlist and gift-fund dashboards for wedding guests and organisers.

- **Organiser**: create events, add wishlist gifts (link and photo) and cash funds with a goal, see who chose what.
- **Guest**: join with an invite link or code (name and relationship), pick a gift or pledge an amount. Guests never see other guests' choices; taken gifts and full funds simply disappear.
- Events are fully isolated from each other.

## Run locally

The app uses the `gift` database on the MongoDB Atlas cluster `Portfolio`. Create `server/.env` with:

```
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=<long random string>
```

In GitHub Actions use secrets with the same names (`DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`).

```bash
# API (http://localhost:4000)
cd server
npm install
npm run dev

# Web app (http://localhost:5173)
cd client
npm install
npm run dev
```

## Deployment

Every push to `main` runs [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml): build and check, deploy the API to Render, then deploy the web app to GitHub Pages.

GitHub repo secrets: `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `RENDER_API_KEY`, `RENDER_SERVICE_ID`.
GitHub repo variable: `API_URL` (the Render service URL, e.g. `https://gift-api.onrender.com`).
Settings, Pages, Source must be set to "GitHub Actions".
