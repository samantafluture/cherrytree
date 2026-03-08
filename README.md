# CherryTree

An open-source outliner tool inspired by Workflowy — infinitely nested bullet points, keyboard-driven navigation, and first-class AI agent support.

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker

pnpm install
docker compose up -d          # Start PostgreSQL
cp .env.example .env          # Configure environment
pnpm dev                      # Start client + server
```

Server: `http://localhost:3040/health`
Client: `http://localhost:5173`

## Architecture

Monorepo with 4 packages:

| Package  | Description             | Tech                     |
| -------- | ----------------------- | ------------------------ |
| `shared` | Types, constants, utils | TypeScript               |
| `server` | REST API                | Fastify, Drizzle, PG     |
| `client` | Web UI                  | React, Vite, CSS Modules |
| `cli`    | CLI for humans & agents | Commander.js             |

## Commands

```bash
pnpm dev          # Start all packages
pnpm build        # Build all packages
pnpm lint         # ESLint (includes circular import detection)
pnpm typecheck    # TypeScript strict mode
pnpm test         # Run all tests
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and architectural rules.

AI agents: read [CLAUDE.md](./CLAUDE.md) before writing any code.

## License

MIT
