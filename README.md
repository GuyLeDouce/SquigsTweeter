# Squigs Tweet Generator

Squigs Tweet Generator is a browser-based Next.js web app for manually generating tweet copy for `@SquigsNFT`. It runs as a standard Railway web service, uses PostgreSQL through Prisma, pulls a random minted NFT from the configured contract with OpenSea, then asks OpenAI for:

- 1 main tweet
- 2 alternate tweets
- 1 first reply

The app is built for GitHub -> Railway deployment, not a local-first workflow.

## What The App Does

On the main dashboard, you can:

- fetch a random minted NFT from `NFT_CONTRACT_ADDRESS`
- preview the NFT image
- inspect token ID, name, and traits
- choose tone, campaign mode, CTA, length, and humanization settings
- generate tweet variants with structured OpenAI output
- regenerate against the same NFT or pull a new one
- copy each output
- download the NFT image

On `/history`, you can:

- review saved generations
- re-copy the main tweet
- favorite stronger outputs
- discard weaker outputs

## Stack

- Next.js App Router + TypeScript
- Route Handlers for server APIs
- Prisma ORM
- PostgreSQL via `DATABASE_URL`
- OpenAI Responses API
- OpenSea NFT API

## Required Railway Environment Variables

Set these in Railway for the web service:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENSEA_API_KEY`
- `NFT_CONTRACT_ADDRESS`
- `CHAIN`
- `MAX_TOKEN_ID`
- `DATABASE_URL`
- `APP_BASE_URL`
- `DEFAULT_HASHTAG`
- `DEFAULT_DISCORD_URL`
- `DEFAULT_SITE_URL`

Notes:

- `CHAIN` should match an OpenSea-supported chain such as `ethereum`. The app also maps common legacy values like `eth-mainnet` to `ethereum`.
- `MAX_TOKEN_ID` is optional. If set, the app will not select or fetch any token above that numeric ID.
- `APP_BASE_URL` is optional. If you set it, use the Railway public URL for the deployed app.
- `DEFAULT_HASHTAG` can be `#SquigsAreWatching`.
- `DATABASE_URL` must point to the Railway Postgres instance.

## Repo Placement

If this code is not already in the target GitHub repo, place the files into the repository root so the top-level structure includes:

```text
app/
components/
lib/
prisma/
package.json
README.md
```

Then commit and push:

```bash
git init
git remote add origin https://github.com/GuyLeDouce/SquigsTweeter.git
git add .
git commit -m "Build Squigs Tweet Generator"
git branch -M main
git push -u origin main
```

If the repository already exists locally, just copy the files in, then use:

```bash
git add .
git commit -m "Build Squigs Tweet Generator"
git push
```

## Deploy To Railway

1. Create a new Railway project.
2. Choose `Deploy from GitHub repo`.
3. Select `GuyLeDouce/SquigsTweeter`.
4. Add a Railway Postgres service if one is not already attached.
5. Confirm the web service has all required environment variables.
6. Deploy.

This app is already configured with Railway-friendly scripts:

- `npm install` triggers `prisma generate`
- `npm run build` builds the Next.js app
- `npm run start` runs `prisma migrate deploy && HOSTNAME=0.0.0.0 node .next/standalone/server.js`

That means Railway can build and start the app as a normal Node web service without any local-only assumptions.

## Railway Postgres

If Postgres is not already attached:

1. Add a PostgreSQL service inside the same Railway project.
2. Copy the generated connection string into `DATABASE_URL` for the web service.
3. Redeploy the web service.

At startup, the app runs `prisma migrate deploy` so the required tables are created in production.

## How Railway Env Vars Are Used

- `OPENAI_API_KEY` and `OPENAI_MODEL` are used server-side in `/api/generate`.
- `OPENSEA_API_KEY`, `NFT_CONTRACT_ADDRESS`, `CHAIN`, and optional `MAX_TOKEN_ID` are used server-side to discover minted NFTs and fetch metadata.
- `DATABASE_URL` is used by Prisma for `GeneratedTweet` and `UsedToken`.
- `APP_BASE_URL` is optional and reserved for public app awareness and deployment-safe configuration.
- `DEFAULT_HASHTAG`, `DEFAULT_DISCORD_URL`, and `DEFAULT_SITE_URL` are injected into prompt construction and control behavior.

## Accessing The Live App

After Railway deploys successfully:

1. Open the Railway public domain for the web service.
2. The main generator is available at `/`.
3. History is available at `/history`.

## Live Test Checklist

After deployment, verify the production app by:

1. Opening the Railway public URL.
2. Clicking `Generate`.
3. Confirming a random NFT appears with image, token ID, and traits when available.
4. Confirming the app returns 1 main tweet, 2 alternates, and 1 first reply.
5. Testing the copy buttons.
6. Testing the image download button.
7. Opening `/history` and confirming the saved generation is present.
8. Toggling favorite and discard to confirm database writes are working.

## Troubleshooting

### NFT metadata loads poorly or some tokens fail

- The app automatically skips broken NFT image records when choosing a random token.
- If too many records fail, check that `NFT_CONTRACT_ADDRESS`, `CHAIN`, and `OPENSEA_API_KEY` are correct.
- Some collections have incomplete metadata; the app will still generate copy from token identity plus any traits it can recover.

### Image preview works inconsistently

- IPFS URLs are normalized before use.
- Downloading is proxied through the app at `/api/image` to avoid browser-side CORS issues.
- If previews fail broadly, the underlying metadata may point at invalid image URIs.

### OpenAI generation fails

- Confirm `OPENAI_API_KEY` and `OPENAI_MODEL` are valid in Railway.
- The app retries malformed or overlong output up to 3 times.
- If failures persist, try a model that reliably supports structured JSON output.

### Database errors on deploy

- Confirm the web service can read `DATABASE_URL`.
- Confirm Railway Postgres is attached and reachable.
- Redeploy after the database service is healthy.
- The start command runs `prisma migrate deploy`; if that fails, inspect Railway logs for connectivity or permission issues.

### The app deploys but the page errors immediately

- Missing required env vars will cause server-side validation errors.
- Re-check every variable listed in `.env.example`.
- If `APP_BASE_URL` is set, it must be a valid absolute URL.

## Minimal Local Notes

Local development is not the primary target, but if needed:

```bash
npm install
npm run build
npm run start
```

You would still need valid environment variables and a reachable Postgres database.
