# Thesys OpenUI Gateway Agent

A small, standalone Next.js chat agent that sends requests through the OpenUI Gateway using the OpenAI-compatible Chat Completions API.

## Requirements

- Node.js 20.19+ (or 22.12+)
- A Thesys inference API key from the Thesys Console

## Run locally

From this directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `THESYS_API_KEY` to your actual key. Do not paste the key into source code, chat, client-side environment variables, or Git.

Then install and start the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Gateway configuration

The server route uses:

- Base URL: `https://api.thesys.dev/v1/embed`
- Model: `openai/gpt-5`
- Secret: `process.env.THESYS_API_KEY` (server-side only)

The route streams assistant text to the browser and does not log the API key or message contents. It is a minimal Gateway-connected chat starter; to render generated OpenUI Lang components, add a component library, export its specification, generate the system prompt, and connect the response stream to an OpenUI renderer.

## Deploy

Deploy this directory as a separate Next.js project, or configure your hosting build root to `examples/thesys-gateway-agent`. Add `THESYS_API_KEY` in the hosting provider's server-side environment settings, then redeploy.

## Troubleshooting

- `503`: set `THESYS_API_KEY` in `.env.local` and restart the dev server.
- `502`: Gateway returned an error; check the server's error status and your Thesys Console/model access.
- Never print the environment variable while debugging.
