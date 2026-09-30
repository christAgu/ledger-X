# Ledger X relayer

The relayer bridges local payment webhooks to the Ledger X treasury module. It
targets the local `ledgerx-devnet-1` chain and does not perform real payouts.

## Run locally

Use Node 20. In one terminal, start the chain:

```sh
./chain/scripts/devnet.sh
```

Copy `services/relayer/.env.example` to `.env`. Set `TREASURY_MNEMONIC` to the
public, insecure treasury mnemonic in `chain/config.yml` and set a local
`WEBHOOK_SECRET`. Keep `SANDBOX=1` for the mock Mobile Money deposit endpoint.
`KOFFI_ADDRESS` is only used by the end-to-end script; use the address printed
by the devnet script.

```sh
cd services/relayer
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The HTTP server listens on port 8787 by default. `GET /health` reports the
configured chain status and height. `GET /v1/config` returns the chain ID,
treasury address, `ueurc` denom, and fixed `655.957` XOF-per-EUR peg. The chain
RPC and REST proxies are available at `/rpc/*` and `/rest/*`.

## Endpoints

- `POST /v1/accounts` registers a `ledgerx1` address and unique lowercase tag,
  then grants it a 24-hour fee allowance limited to `MsgSend`. The treasury
  account is the fee granter; registered users need no `uledx`.
- `GET /v1/tags/:tag` resolves a registered tag. `GET
  /v1/tags/:tag/available` checks availability.
- `POST /v1/sandbox/deposit` accepts `{ address, currency, amount }` and mints
  EURC with a generated `sbx-<uuid>` reference while `SANDBOX=1`.
- `POST /v1/webhooks/deposit` accepts
  `{ reference, address, currency, amount }`, where `currency` is `XOF` or
  `EUR`. XOF amounts are integer strings converted at the fixed CFA peg; EUR
  amounts are decimal strings in major currency units. Successful deposits
  credit `ueurc`. Sign the exact request bytes as
  `HMAC-SHA256(WEBHOOK_SECRET, "<unix-seconds>.<raw-body>")`, then send the
  lowercase hex digest in `x-ledgerx-signature` and the timestamp in
  `x-ledgerx-timestamp`. Timestamps must be within 300 seconds.
- `POST /v1/cashouts` accepts a successful transaction hash containing exactly
  one `ueurc` `MsgSend` to the treasury and burns that amount. The response
  includes the XOF payout equivalent; partner payouts are out of scope.

The devnet treasury mints and burns `ueurc` as a stand-in. In production, Circle
issues EURC, so the treasury should transfer EURC from a reserve, for example
via IBC from Noble, rather than minting it.

All API routes enable CORS. The treasury broadcasts are serialized in-process
to protect account sequence numbers. The tag registry is persisted at
`DATA_DIR/tags.json`.

## End-to-end check

With the chain and relayer running, set `KOFFI_ADDRESS` in `.env` to the address
printed by `devnet.sh`, then run:

```sh
npm run e2e
```

The script registers a fresh account, deposits 5,000 XOF through the sandbox
and asserts a 7,622,450 `ueurc` credit, sends 1 EURC to Koffi using the treasury
fee grant, cashes out 0.5 EURC for 327 XOF, checks the supply reduction, and
replays the signed deposit webhook to verify idempotency.
