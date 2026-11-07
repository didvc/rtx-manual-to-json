# Contributing

1. Download `Cmdref_HTML_Archive.zip` from https://www.rtpro.yamaha.co.jp/RT/manual/rt-common/ and extract it so `Cmdref_HTML_Archive/html/toc.html` exists.
2. Run `node --test test/*.test.mjs`.
3. Run a full conversion and check it reports `0 errors`:
   `node bin/rtx-manual-to-json.mjs --stats`

Rules:

- No dependencies, no build step, no TypeScript. Plain `.mjs` on Node 20+.
- Never commit archive HTML or generated JSON. Test fixtures must be synthetic.
- If you change the output shape, update `docs/schema.md` and bump `SCHEMA_VERSION` in `src/index.mjs`.

By contributing you agree that your contributions are licensed under Apache 2.0.
