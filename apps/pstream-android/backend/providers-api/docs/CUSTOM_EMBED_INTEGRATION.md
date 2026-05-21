# Custom Embed Integration

Your Oracle `/sources` JSON is the source of truth for which **source** ids and **embed** ids exist in the currently built `providers-lib`.

## Important architectural rules

- Use `providers-lib -> scrape proxy -> m3u8 playback proxy -> app`.
- Keep working native/server-compatible sources enabled.
- Do not add direct backend-only Turnstile / Finger / XPrime / FedAPI integrations.
- If a source is browser-protected, prefer a browser-assisted or final-URL handoff approach instead of trying to bypass it in Oracle.

## Source ordering

Use only **source** ids from your current `/sources` output for source ordering and selection.

Embeds are separate from sources and are resolved by the provider stack when a source returns embed candidates.

## Practical guidance

1. Add or enable sources/embeds in `providers-lib`.
2. Build `providers-lib`.
3. Restart `providers-api`.
4. Verify:
   - `/health`
   - `/sources`
   - scrape output for movie/show cases
5. If HLS playback is flaky, validate `M3U8_PROXY_URL` handling before blaming the provider itself.

## Proxy expectations

### Scrape proxy

Used by `makeSimpleProxyFetcher(...)` for blocked scrape requests.

### m3u8 playback proxy

Used to build `proxiedPlaylist` for HLS playback so the app can prefer the safer playback URL.

## Anti-bot protected providers

If a provider only works with browser state:
- solve in browser/app
- capture final playable or worker-backed URL
- pass that into the app/backend fallback path

Do not reintroduce static backend anti-bot hacks.
