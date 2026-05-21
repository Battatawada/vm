const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {

    const tmdbUrl =
        'https://api.themoviedb.org' + req.url;

    const proxyUrl =
        'https://nuvio.veilproxy.workers.dev/?url=' +
        encodeURIComponent(tmdbUrl);

    https.get(proxyUrl, (proxyRes) => {

        res.writeHead(
            proxyRes.statusCode,
            proxyRes.headers
        );

        proxyRes.pipe(res);

    }).on('error', (err) => {

        res.writeHead(502);

        res.end('Proxy error: ' + err.message);
    });
});

server.listen(19876, '127.0.0.1', () => {
    console.log(
        '[tmdb-proxy] Listening on http://127.0.0.1:19876'
    );
});
