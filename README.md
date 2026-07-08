# Orbital site

July 8th 2026

This is the orbital *site* — a running instance of a shared, multiuser filespace where people claim a folder, invite others into their projects, and work on things together: files, links, notes, conversations, and eventually simulations and digital agents. The deeper aim is to help groups collaborate on hard problems; everything here is technique in service of that.

This repository holds the web experience (Svelte 5, slash-routed, data-forward — formerly `orbital-jam`) together with the instance *arrangement*: `orbital.config.json` chooses the port and the store, `public/` seeds the namespace with initial folders, `scripts/` deploy it, and live state accumulates in `.filespace/` (untracked) if not using mongo. Identity is a keypair the user holds or delegates; the server never keeps sessions.

The rest of the machinery lives in separate engine packages, expected as sibling clones, each its own repository under [github.com/orbitalfoundation](https://github.com/orbitalfoundation):

- `orbital-bus` (the pub/sub spine where most other functionality is hung as bus observers)

- `orbital-filespace` (the namespace — ownership, membership, privacy, signed writes)

- `orbital-streams` (per-room conversation)

- `orbital-store` (durable-store adapters such as MongoDB)

- `orbital-server` (a thin socket gateway and static host - deliberately non critical)

- `orbital-headless` (the viewless composition: the `orbital` CLI and whole-system tests)

- `orbital-ontology` (the shared component vocabulary — dictionary and rules)

To run it, from this folder:
```
npm start          # serve the site per orbital.config.json (default :8080)
npm run dev        # vite dev client on :5173, proxying to the server
npm run build      # rebuild the web app into ./dist
npm test           # this package's tests; npm run test:all for every engine
```

