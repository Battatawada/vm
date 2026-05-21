# providers-api ("pstream-backend" in deploy docs)

Express service on **port 3001** that wraps **`@p-stream/providers`** (`targets.NATIVE`). The Flutter app points **`ORACLE_URL`** here (not at `simple-proxy` :3000).

## What is in this repo

There is no separate `@pstream-backend` package in the Android repo: Oracle runs **this folder** (or a copy of it) under PM2 as `providers-api`.

This backend now follows the stable architecture:

`providers-lib -> scrape proxy -> m3u8 playback proxy -> app`

## Current architecture

- `providers-lib` discovers and normalizes streams from supported sources.
- `SIMPLE_PROXY_URL` is used by `makeSimpleProxyFetcher(...)` for scrape-time proxying of blocked requests.
- `M3U8_PROXY_URL` is used to rewrite HLS playlists for playback-safe proxying when needed.
- Protected browser-assisted streams can still be passed in separately by the app as a fallback path.
- Direct backend-only Turnstile / Finger / XPrime / FedAPI integrations are intentionally not part of the supported architecture.

## Supported direction

- Keep working providers such as `vidlink`, `vidrock`, and other compatible source/embed scrapers.
- Use scrape proxy for restricted fetches.
- Use m3u8 playback proxy for HLS playback hardening.
- Surface qualities and captions to the app when available.

## Environment

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (default `3001`) |
| `REQUEST_TIMEOUT_MS` | Cap for `runAll` (default `90000`) |
| `SIMPLE_PROXY_URL` | Scrape proxy URL used by `proxiedFetcher` |
| `M3U8_PROXY_URL` | Playback proxy URL used to build `proxiedPlaylist` for HLS streams |

## Health check

```bash
curl -sS "http://<VM_IP>:3001/health"
Notes
If a source needs browser-only anti-bot state, solve it in browser/app space and pass the final playable/proxied URL through the app flow.
Do not reintroduce static Turnstile tokens or direct backend Finger/XPrime scraping.
