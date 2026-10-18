# Repository Guidelines

## Project Structure & Module Organization

This TypeScript ES module project implements a command-line RAG knowledge assistant with Mastra, PostgreSQL vector storage, SiliconFlow embeddings, and DeepSeek chat.

- `src/mastra/agents/`: agent configuration and response instructions.
- `src/mastra/tools/`: agent-callable knowledge search.
- `src/mastra/services/`: document ingestion and retrieval logic.
- `src/mastra/lib/`: embedding and vector-store configuration. The existing vector-store filename is `verctor-store.ts`; match it in imports.
- `src/scripts/`: CLI entry points and provider smoke checks.

There are no dedicated test or asset directories.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run db:init`: create the `knowledge_base` vector index.
- `npm run ingest -- ./document.txt [source-url]`: chunk, embed, and store a local document; an HTTP(S) URL also works as input.
- `npm run search -- "question"`: retrieve matching chunks with scores and sources.
- `npm run chat -- "question"`: query the agent and print tool activity and its answer.
- `npx tsc --noEmit`: check TypeScript without generating files.

No build, development-server, lint, or test npm scripts are configured.

## Coding Style & Naming Conventions

Use strict TypeScript and ESM imports with `.js` extensions for local modules. Follow the surrounding file’s indentation: existing files use either two or four spaces. Prefer double quotes, semicolons, camelCase functions and variables, and uppercase constants such as `INDEX_NAME`. Use descriptive filenames with role suffixes such as `.service.ts`, `.agent.ts`, and `.tool.ts`. No formatter or linter is configured; avoid unrelated formatting changes.

## Testing Guidelines

No automated test framework or coverage threshold is configured. Run `npx tsx src/scripts/test-embedding.ts` and `npx tsx src/scripts/test-siliconflow.ts` for live embedding smoke checks; successful embeddings should have 1024 dimensions. Follow the `test-*.ts` naming pattern for similar scripts. For ingestion or retrieval changes, ingest a small document and verify search results and source metadata. These checks require configured external services.

## Commit & Pull Request Guidelines

Existing commits use Conventional Commit prefixes, including `feat:` and `chore:`. Continue that pattern with concise, imperative descriptions. In pull requests, describe the behavior changed, link relevant issues, list validation commands and results, and document configuration changes. Include CLI output when it helps demonstrate behavior.

## Security & Configuration

Set `POSTGRES_CONNECTION_STRING`, `SILICONFLOW_API_KEY`, and `DEEPSEEK_API_KEY` in local `.env`; `SILICONFLOW_BASE_URL` is optional. Never commit credentials. Keep embedding dimensions consistent with the vector index when changing models.
