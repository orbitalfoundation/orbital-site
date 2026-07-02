# @orbitalfoundation/jam

A multiuser project-jamming web interface over an [orbital filespace](../orbital-filespace) — Svelte 5, slash-routed, data-forward. The UX carries over the choices proven in `social/jam`: tiny floating chrome, full-bleed view takeover, cards for discovery, coral accent, no hairlines/no radius, auto dark mode, mobile-first.

- **The URL is the slug.** `/anselm/tenerife` routes to that node; the entity
  chooses its view (`about.view` — `chat` renders the conversational takeover,
  default is a folder of cards).
- **Identity is a browser-minted keypair.** `join` creates a secp256k1 key in
  localStorage and claims your folder first-come. Every write is a signed
  envelope the filespace core verifies — wire-compatible with node's crypto
  (proven by `test/crypto.test.js`). Share your public key (⧉ chip) to get
  invited into other people's projects.
- **Live.** The app subscribes to the server's `changed` fan-out and refreshes
  the folder you're looking at when anyone touches it.
- **Chat is a view, not a layer.** The composer is present but disabled until
  the streams layer lands; the view paints the folder's objects into the
  conversation meanwhile.

## Develop

```sh
npm install
npm run dev        # vite on :5173, proxying socket.io to an orbital-server on :8080
npm test           # browser-crypto ↔ filespace-core compatibility
```

## Ship

```sh
npm run build      # → dist/
cd ../orbital-server && npm start -- --web ../orbital-jam/dist --public ./public
```

## Known v0 tradeoffs

- Keys live only in localStorage — sign-out destroys identity (web3auth /
  wallet custody is the later graft; the tricky-but-valuable web3auth flow
  already exists in orbital-sim's sessions.js to scavenge).
- Private-area changes don't fan out to members yet (server filters to
  guest-readable); members see updates on navigation.
- Creation UX is `prompt()`-grade on purpose — the plateau is life, then grind.
