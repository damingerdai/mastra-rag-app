# Mastra RAG App

A TypeScript command-line knowledge assistant built with Mastra. Ingest documents into PostgreSQL, search them using vector similarity, and ask a DeepSeek-powered agent questions grounded in retrieved content.

## How it works

1. Mastra splits input text into recursive chunks with `maxSize: 512` and `overlap: 50`.
2. SiliconFlow's `BAAI/bge-m3` model generates 1024-dimensional embeddings.
3. PostgreSQL stores vectors and metadata (`text`, `source`, and `chunkIndex`) in the `knowledge_base` index.
4. Search embeds a question and retrieves matching chunks. The chat agent uses a knowledge-search tool and `deepseek-chat` to generate an answer.

The agent is instructed to search before answering, cite source documents, and acknowledge insufficient evidence. It defaults to Chinese unless another language is requested.

## Prerequisites

- Node.js **22.13.0 or newer** and npm, as required by the installed Mastra packages.
- A running PostgreSQL database with the **pgvector** extension available. The database user must be able to create the vector index; extension creation may require administrator setup.
- A SiliconFlow API key for ingestion and search.
- A DeepSeek API key for chat.

## Setup

Install dependencies:

```sh
npm ci
```

Create a `.env` file in the repository root with your own credentials:

```dotenv
POSTGRES_CONNECTION_STRING=postgresql://username:password@localhost:5432/knowledge
SILICONFLOW_API_KEY=your-siliconflow-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
# Optional; this is the default embedding endpoint:
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
```

The database must already exist. Initialize its vector index:

```sh
npm run db:init
```

Ingestion also initializes the index automatically. Run commands from the repository root so `dotenv` can load `.env`. Keep credentials out of version control.

## Usage

### Ingest a document

```sh
npm run ingest -- ./notes.txt
npm run ingest -- ./notes.txt "https://example.com/notes"
npm run ingest -- "https://example.com/notes.txt"
```

The first argument is a UTF-8 file path or HTTP(S) URL. The optional second argument overrides the source stored with each chunk; otherwise, the input path or URL becomes the source.

Inputs are read as text. There is no PDF parser, HTML cleanup, or website crawler. Empty documents are rejected. Repeated ingestion has no application-level deduplication.

### Search the knowledge base

```sh
npm run search -- "What do the notes say about password storage?"
```

Search prints up to three matching chunks, including similarity scores, sources, and text. Ingest a document first to obtain useful results.

### Ask the agent

```sh
npm run chat -- "Explain the password storage recommendations in English."
```

Chat prints tool calls, tool results, intermediate step text, and the final answer. The agent's search tool retrieves up to five matches. Each invocation handles one question; this is not an interactive chat session.

## Project structure

```text
src/
  mastra/
    agents/      # Knowledge agent and instructions
    tools/       # Knowledge-search tool and schemas
    services/    # Ingestion and retrieval
    lib/         # Embedding provider and vector-store configuration
  scripts/       # CLI commands and embedding smoke checks
```

The vector-store module is currently named `src/mastra/lib/verctor-store.ts`.

## Development and validation

Check TypeScript without emitting files:

```sh
npx tsc --noEmit
```

Run live embedding smoke checks:

```sh
npx tsx src/scripts/test-embedding.ts
npx tsx src/scripts/test-siliconflow.ts
```

Both checks call SiliconFlow's default endpoint directly and require `SILICONFLOW_API_KEY`; they do not use the optional base URL override. Successful embeddings should report 1024 dimensions. API calls may incur provider charges; ingestion sends document text to SiliconFlow, and chat sends retrieved context to DeepSeek.

No automated test framework, coverage threshold, build script, or lint script is configured. For ingestion and retrieval changes, ingest a small document and verify returned text and source metadata. If changing embedding models, keep the vector index dimensions aligned and regenerate stored embeddings.

See [AGENTS.md](AGENTS.md) for contributor conventions.
