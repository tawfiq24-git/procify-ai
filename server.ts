import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  GeminiServiceError,
  analyzeDocumentWithGemini,
  generateWorkflowWithGemini,
  runAssistantWithGemini,
} from './server/gemini.ts';

function getCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefix = `${flag}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

const rawPort = getCliArg('--port') ?? process.env.PORT;
const parsedPort = rawPort ? Number(rawPort) : 3000;
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;
const HOST = getCliArg('--host') || process.env.HOST || '0.0.0.0';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, PNG, JPG, JPEG, TXT.`));
    }
  },
});

function sha256(input: Buffer | string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower.endsWith('.local')) {
    return true;
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(lower)) {
    return true;
  }
  return false;
}

function sendGeminiErrorResponse(res: Response, err: unknown, fallbackMsg: string) {
  if (err instanceof GeminiServiceError) {
    res.status(err.statusCode).json({
      error: err.userMessage,
      code: err.statusCode,
      retryable: err.retryable,
    });
    return;
  }
  const message = err instanceof Error ? err.message : fallbackMsg;
  const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
  res.status(status).json({
    error: status === 503 ? message : fallbackMsg,
    code: status,
    retryable: status >= 500,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/analyze-document', (req: Request, res: Response) => {
    upload.single('file')(req, res, async (uploadErr) => {
      if (uploadErr) {
        res.status(400).json({ error: uploadErr.message || 'File upload failed.' });
        return;
      }

      try {
        const file = req.file;
        const pastedText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
        const customTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';

        if (!file && !pastedText) {
          res.status(400).json({ error: 'Please upload a supported file (PDF, PNG, JPG, TXT) or enter document text.' });
          return;
        }

        let sourceType: 'pdf' | 'image' | 'txt' | 'text' = 'text';
        let fileHash = '';
        let rawText = pastedText;
        let fileBase64: string | undefined;
        let mimeType: string | undefined;

        if (file) {
          fileHash = sha256(file.buffer);
          if (file.mimetype === 'application/pdf') {
            sourceType = 'pdf';
            fileBase64 = file.buffer.toString('base64');
            mimeType = 'application/pdf';
          } else if (file.mimetype.startsWith('image/')) {
            sourceType = 'image';
            fileBase64 = file.buffer.toString('base64');
            mimeType = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
          } else {
            sourceType = 'txt';
            rawText = file.buffer.toString('utf-8').trim();
          }
        } else {
          fileHash = sha256(pastedText);
        }

        const currentDateIso = new Date().toISOString().split('T')[0];
        const analysis = await analyzeDocumentWithGemini({
          text: rawText || undefined,
          fileBase64,
          mimeType,
          fileName: file?.originalname || customTitle || undefined,
          currentDateIso,
        });

        const textForNormalization =
          rawText ||
          analysis.extractedPlainText ||
          `${analysis.documentTitle} ${analysis.summary} ${analysis.importantInformation.join(' ')}`;

        const normalizedText = normalizeForHash(textForNormalization);
        const normalizedHash = sha256(normalizedText || fileHash);

        res.json({
          sourceType,
          fileName: file?.originalname || customTitle || `${analysis.documentTitle}.txt`,
          fileHash,
          normalizedHash,
          contentExcerpt: (rawText || analysis.extractedPlainText || analysis.summary).slice(0, 3500),
          normalizedTextSample: normalizedText.slice(0, 1500),
          analysis,
        });
      } catch (err: unknown) {
        console.error('Analyze document error:', err);
        sendGeminiErrorResponse(res, err, 'Document analysis failed. Please retry.');
      }
    });
  });

  app.post('/api/generate-workflow', async (req: Request, res: Response) => {
    try {
      const { prompt, analysis, refinementFeedback } = req.body ?? {};
      if (!prompt && !analysis) {
        res.status(400).json({ error: 'Provide either a workflow requirement prompt or an analyzed document.' });
        return;
      }

      const workflow = await generateWorkflowWithGemini({
        prompt: typeof prompt === 'string' ? prompt.trim() : undefined,
        analysis: analysis && typeof analysis === 'object' ? analysis : undefined,
        refinementFeedback: typeof refinementFeedback === 'string' ? refinementFeedback.trim() : undefined,
        currentDateIso: new Date().toISOString().split('T')[0],
      });

      res.json({ workflow });
    } catch (err: unknown) {
      console.error('Generate workflow error:', err);
      sendGeminiErrorResponse(res, err, 'Workflow generation failed. Your prompt is preserved—please retry.');
    }
  });

  app.post('/api/assistant', async (req: Request, res: Response) => {
    try {
      const { message, workspaceContext, history } = req.body ?? {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const result = await runAssistantWithGemini({
        message: message.trim(),
        workspaceContext: {
          workflows: Array.isArray(workspaceContext?.workflows) ? workspaceContext.workflows.slice(0, 30) : [],
          tasks: Array.isArray(workspaceContext?.tasks) ? workspaceContext.tasks.slice(0, 60) : [],
          documentsCount: Number(workspaceContext?.documentsCount ?? 0),
          currentDateIso: new Date().toISOString().split('T')[0],
        },
        history: Array.isArray(history) ? history : undefined,
      });

      res.json(result);
    } catch (err: unknown) {
      console.error('Assistant error:', err);
      sendGeminiErrorResponse(res, err, 'Assistant request failed. Please try again.');
    }
  });

  app.post('/api/webhooks/test', async (req: Request, res: Response) => {
    try {
      const { webhookUrl, provider } = req.body ?? {};
      if (!webhookUrl || typeof webhookUrl !== 'string') {
        res.status(400).json({ error: 'Webhook URL is required.' });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(webhookUrl);
      } catch {
        res.status(400).json({ error: 'Invalid URL format.' });
        return;
      }

      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        res.status(400).json({ error: 'Only HTTP/HTTPS webhook URLs are allowed.' });
        return;
      }

      if (isPrivateOrLoopbackHost(parsedUrl.hostname)) {
        res.status(400).json({ error: 'Private or loopback addresses are blocked for security.' });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const upstream = await fetch(parsedUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'procify.webhook.test',
            provider: provider || 'webhooks',
            timestamp: new Date().toISOString(),
            message: 'Procify AI webhook verification ping',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        res.json({
          delivered: upstream.ok,
          statusCode: upstream.status,
          statusText: upstream.statusText,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        res.status(502).json({
          delivered: false,
          error: fetchErr?.message || 'Could not reach the webhook endpoint.',
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Webhook verification error.' });
    }
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  const hasDistBuild = fs.existsSync(distIndexPath);
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && hasDistBuild);

  console.log(
    `[Procify AI] Starting server (mode=${isProd ? 'production' : 'development'}, hasDistBuild=${hasDistBuild}, host=${HOST}, port=${PORT}, envPORT=${process.env.PORT ?? 'unset'})`
  );

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    if (!hasDistBuild) {
      console.error(
        `[Procify AI] Production build missing at ${distIndexPath}. Run "npm run build" before starting the production server.`
      );
    }
    app.use(express.static(distDir, { index: 'index.html' }));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found.' });
        return;
      }
      if (!fs.existsSync(distIndexPath)) {
        res.status(503).send('Production build not found. Run npm run build first.');
        return;
      }
      res.sendFile(distIndexPath);
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(
      `[Procify AI] Server started successfully in ${isProd ? 'production' : 'development'} mode on http://${HOST}:${PORT}`
    );
  });

  server.on('error', (err: unknown) => {
    console.error(`[Procify AI] Failed to bind server on http://${HOST}:${PORT}:`, err);
    process.exit(1);
  });
}

startServer().catch((err: unknown) => {
  console.error('[Procify AI] Fatal startup error:', err);
  process.exit(1);
});
