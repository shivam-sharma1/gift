# Giftwise

Wishlist and gift-fund dashboards for wedding guests and organisers.

- **Organiser**: create events, add wishlist gifts (link and photo) and cash funds with a goal, see who chose what.
- **Guest**: join with an invite link (name and relationship), pick a gift or pledge an amount. Guests never see other guests' choices; taken gifts and full funds simply disappear.
- Events are fully isolated from each other.

## Run locally

The API stores data in the `gift` database of a MongoDB Atlas cluster. Create `server/.env` (never commit it) with:

```
DB_HOST=<cluster host, e.g. cluster0.abcde.mongodb.net>
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=<long random string>
```

In GitHub Actions use secrets with the same names.

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

GitHub repo secrets: `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `RENDER_API_KEY`, `RENDER_SERVICE_ID`.
GitHub repo variable: `API_URL` (the Render service URL, e.g. `https://gift-api.onrender.com`).
Settings, Pages, Source must be set to "GitHub Actions".
