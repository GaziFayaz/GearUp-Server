# b7a4

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/server.ts
```

To deploy on Vercel:

1. Keep the Express app export in `src/app.ts`.
2. Let Vercel route requests through `api/[...path].ts`.
3. Use `bun run vercel-build` as the build command.

The local server entrypoint in `src/server.ts` is still for non-Vercel development.

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
