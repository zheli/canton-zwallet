# canton-zwallet

Non-custodial wallet for the [Canton Network](https://www.canton.network/). Lets external parties register on-chain, hold tokens, and send transfers — all without the validator holding any private keys.

Private keys are derived from a WebAuthn passkey via the PRF extension and never leave the browser.

## Architecture

```
Browser (React SPA)
├── WebAuthn passkey  →  PRF → 32-byte seed → Ed25519 keypair
├── Validator API     →  party registration, topology submission
└── Ledger API        →  holdings query, transfer submission
```

Two backend services are required:

| Service | Default port | Purpose |
|---------|-------------|---------|
| Canton Validator | `5003` | Party registration, topology, transfer factory |
| Canton Ledger (JSON API) | `7575` | Holdings, transaction history |

The dev server proxies both via Vite so the browser never needs to deal with CORS.

---

## Prerequisites

- **[Bun](https://bun.sh)** v1.1+ — used for install, dev, and build
- A running **Canton sandbox** or access to a Canton network (devnet / testnet / mainnet)

Install Bun if you don't have it:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Setup

```bash
git clone <repo-url>
cd canton-zwallet
bun install
```

---

## Development

Start the dev server (hot-reload, proxies API calls to local Canton services):

```bash
bun run dev
```

The app opens at **http://localhost:5173** by default.

### Network selection

Use the network selector in the top-right corner to switch between:

| Network | Validator URL | Ledger URL |
|---------|--------------|------------|
| Sandbox | `localhost:5003` | `localhost:7575` |
| Local Net | `localhost:5003` | `localhost:7575` |
| Dev Net | `validator.dev.global.canton.network` | `ledger.dev.global.canton.network` |
| Test Net | `validator.test.global.canton.network` | `ledger.test.global.canton.network` |
| Main Net | `validator.global.canton.network` | `ledger.global.canton.network` |

For **Sandbox / Local Net**, the Canton services must be running locally. The Vite dev server proxies `/api/validator` → `localhost:5003` and `/api/ledger` → `localhost:4001`.

### Running a local Canton sandbox

Follow the [Canton documentation](https://docs.canton.network/) to start a sandbox:

```bash
# Example — adjust to your Canton installation
canton sandbox start
```

The sandbox exposes the validator on port `5003` and the JSON Ledger API on port `7575` by default.

### JWT authentication

Some validator endpoints require a bearer token. Enter your JWT in the network settings panel inside the app. It is stored only in memory (Zustand store) and never persisted.

---

## Testing

The project uses **[Vitest](https://vitest.dev/)** for unit tests.

```bash
bun run test          # run tests once
bun run test:watch    # watch mode
bun run test:coverage # with coverage report
```

Tests live alongside source files as `*.test.ts` / `*.test.tsx`.

---

## Linting and type-checking

```bash
bun run lint          # ESLint
bun x tsc --noEmit    # TypeScript type check (no emit)
```

---

## Build

Compile TypeScript and bundle for production:

```bash
bun run build
```

Output goes to `dist/`.

Preview the production build locally:

```bash
bun run preview
```

---

## Deployment

The app is a fully static SPA — deploy `dist/` to any static host.

### Option 1 — Static file server (nginx, Caddy, etc.)

```bash
bun run build
# Copy dist/ to your web server's root
```

Nginx example (`/etc/nginx/sites-available/zwallet`):

```nginx
server {
    listen 80;
    server_name zwallet.example.com;
    root /var/www/zwallet/dist;
    index index.html;

    # SPA fallback — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy to Canton validator
    location /api/validator/ {
        proxy_pass http://localhost:5003/;
        proxy_set_header Host $host;
    }

    # Proxy to Canton ledger
    location /api/ledger/ {
        proxy_pass http://localhost:7575/;
        proxy_set_header Host $host;
    }
}
```

### Option 2 — Docker

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker build -t canton-zwallet .
docker run -p 8080:80 canton-zwallet
```

### Option 3 — Cloud / CDN (Vercel, Cloudflare Pages, etc.)

Push to your git host. Configure the build command and output directory:

| Setting | Value |
|---------|-------|
| Build command | `bun run build` |
| Output directory | `dist` |
| Install command | `bun install` |

For remote networks (devnet / testnet / mainnet), no backend proxy is needed — the app talks directly to the public Canton endpoints.

---

## Project structure

```
src/
├── api/          # Canton API clients (validator, ledger, registry)
├── components/   # Shared UI components
├── config/       # Network configuration
├── crypto/       # Ed25519 key ops, WebAuthn passkey, IndexedDB storage
├── hooks/        # TanStack Query hooks (holdings, transactions)
├── store/        # Zustand stores (wallet, network)
├── views/        # Page-level components (Setup, Wallet, Send, History)
├── App.tsx
└── main.tsx
```
