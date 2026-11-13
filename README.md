# Giftwise

Wishlist and gift-fund dashboards for wedding guests and organisers.

- **Organiser**: create events, add wishlist gifts (link and photo) and cash funds with a goal, see who chose what.
- **Guest**: join with an invite link or code (name and relationship), pick a gift or pledge an amount. Guests never see other guests' choices; taken gifts and full funds simply disappear.
- Events are fully isolated from each other.

## Run locally

```bash
# 1. MongoDB (local docker image)
docker compose up -d

# 2. API (http://localhost:4000)
cd server
cp .env.example .env      # then set JWT_SECRET to a long random string
npm install
npm run dev

# 3. Web app (http://localhost:5173)
cd client
npm install
npm run dev
```

To use your own database, set `MONGODB_URI` in `server/.env`.

## Production

`cd client && npm run build`, then `cd server && npm start`. The API serves the built web app too.
