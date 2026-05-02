# Fallow

**[Fallow](https://docs.fallow.tools/)** — TS/JS **codebase intelligence** (dead code, duplication, complexity, architecture boundaries). Free static layer; optional paid **runtime** layer (what actually ran in prod). Docs: [docs.fallow.tools](https://docs.fallow.tools/).

**Why it helps after agent-heavy work:** agents add extra exports, copy-paste paths, and half-used deps fast. Fallow maps the module graph and flags what is not wired, repeated, or drifting.

## Node (npm / pnpm / Yarn)

Install dev dependency, then run the CLI (matches [Fallow quick start](https://docs.fallow.tools/quickstart)):

```bash
npm install -d fallow
# or: pnpm add -D fallow   /   yarn add -D fallow
npx fallow
```

Examples: `npx fallow dead-code`, `npx fallow dupes`, `npx fallow health`, `npx fallow fix --dry-run`. With **pnpm** / **Yarn**, install the same way (`pnpm add -D fallow`, etc.), then run the local binary (`pnpm exec fallow …`, `yarn run fallow …` — check your Yarn version).

One-off without install: `npx fallow` from the project root (or `pnpm dlx fallow` / `yarn dlx fallow`).

## Bun

Install and run with Bun’s package manager ([Bun `bunx`](https://bun.com/docs/pm/bunx)):

```bash
bun add -d fallow
bunx fallow
```

Same subcommands: `bunx fallow dead-code`, `bunx fallow dupes`, `bunx fallow health`, `bunx fallow fix --dry-run`.

**Note:** `bunx` may still start **Node** for binaries that ship with a `node` shebang; that is normal. To force the **Bun** runtime for a JS CLI, Bun documents `bunx --bun <cmd>` — only use it if you have checked Fallow still behaves correctly. Fallow’s static engine is **Rust-native**; see their docs for what the published npm package actually spawns.

## Agents

Full doc index for tools: [docs.fallow.tools/llms.txt](https://docs.fallow.tools/llms.txt). Fallow also documents **MCP**, **Claude Code hooks**, **VS Code**, and **CI** — same site, Integrations section.

## This repo

TypeScript library — run Fallow when refactors or agent passes leave unclear leftovers; treat its reports like a second reviewer, not gospel (see Fallow *Known limitations*).
