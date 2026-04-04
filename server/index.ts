import http from 'http';
import { validateRepository, ValidationResult } from '../src/lib/repoValidator.ts';

const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? '*';

const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
    res.writeHead(statusCode, jsonHeaders);
    res.end(JSON.stringify(payload));
}

function parseBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        sendJson(res, 404, { error: 'Missing request path' });
        return;
    }

    if (req.method === 'OPTIONS') {
        sendJson(res, 204, {});
        return;
    }

    if (req.method === 'POST' && req.url === '/validate-repo') {
        try {
            const body = await parseBody(req);
            const parsed = JSON.parse(body || '{}');
            const repoUrl = parsed.repoUrl?.toString().trim();

            if (!repoUrl) {
                sendJson(res, 400, { error: 'Missing repoUrl in request body' });
                return;
            }

            const validation: ValidationResult = await validateRepository(repoUrl);
            sendJson(res, 200, validation);
        } catch (error) {
            sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }

        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Repository validation API running on http://localhost:${PORT}`);
});
