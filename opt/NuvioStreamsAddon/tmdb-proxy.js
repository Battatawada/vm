const https = require('https');

const TMDB_PROXY = 'https://nuvio.veilproxy.workers.dev/';

const origRequest = https.request;

https.request = function(options, callback) {

    try {

        const host =
            (typeof options === 'string')
                ? new URL(options).hostname
                : (options.hostname || options.host || '');

        if (host.includes('api.themoviedb.org')) {

            const path = options.path || '/';

            const fullUrl = 'https://' + host + path;

            const proxyUrl = new URL(TMDB_PROXY);

            proxyUrl.searchParams.set('url', fullUrl);

            if (typeof options === 'object') {
                options.hostname = proxyUrl.hostname;
                options.host = proxyUrl.host;
                options.path = proxyUrl.pathname + proxyUrl.search;
            }
        }

    } catch(e) {
        console.error('[tmdb-proxy] Error:', e.message);
    }

    return origRequest.call(this, options, callback);
};

console.log('[tmdb-proxy] Loaded');
