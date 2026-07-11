# qid.dev

Static landing page for [qid.dev](https://qid.dev) — the post-quantum identity library.

Self-contained, zero external requests. The qID source repository is private until the
independent audit completes; see the site for status.

Deploy: GitHub Pages from this repo (main, /). The canonical copy of this page lives in
the qID repository under `site/`; changes land there first and are mirrored here. A push
to `main` rebuilds Pages in about a minute; verify with `curl -sI https://qid.dev/`.

Paths:
- `/` the landing page (`index.html`).
- `/connect` the live "Sign in with qID" demo (`connect/index.html`): a self-contained
  build of qID Connect that runs the real widget, verifier, and signer in the browser, so
  anyone can try the flow with no wallet and no backend. Canonical source lives in the
  qID Connect repo at `examples/browser-demo/`.
- `/og/` the Open Graph cards used by the pages.
- `/qid-paper.pdf` the technical paper.
