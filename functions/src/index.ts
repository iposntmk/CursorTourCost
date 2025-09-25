import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
try {
  admin.initializeApp();
} catch (e) {
  // ignore if already initialized
}

// Set default region for all HTTP functions
setGlobalOptions({ region: 'asia-southeast1' });

// Create an Express app
const app = express();

// Enable JSON body parsing
app.use(express.json());

// Configure CORS: allow local dev and production domain
const allowedOrigins: string[] = [
  'http://localhost:5173',
  'https://your-frontend-domain.com', // TODO: replace with your actual domain in production
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  }),
);

// Health check endpoint
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'ai-config-api' });
});

const apiRouter = express.Router();

// Endpoint to return the latest prompt
const getLatestPrompt = async (_req: express.Request, res: express.Response) => {
  try {
    // TODO: Fetch instructions/rules/examples from Firestore and compose the prompt
    return res.json({
      id: 'latest',
      version: 'init',
      content: 'TODO: implement prompt assembly logic',
    });
  } catch (err) {
    console.error('Error fetching prompt', err);
    return res.status(500).json({ error: 'Failed to fetch prompt' });
  }
};

apiRouter.get('/prompt/latest', getLatestPrompt);

// Endpoint to return the active schema
apiRouter.get('/schemas/active', async (_req, res) => {
  try {
    // TODO: Fetch the active JSON schema from Firestore
    return res.json({
      name: 'TourExtractSchema',
      fields: ['tourCode', 'guideName', 'startDate', 'endDate'],
      // Include your full schema definition here
    });
  } catch (err) {
    console.error('Error fetching schema', err);
    return res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// Endpoint to perform AI extraction
apiRouter.post('/ai/extract', async (req, res) => {
  try {
    const { imageUrl } = req.body as { imageUrl?: string; overrides?: Record<string, unknown> };
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    // TODO: Compose the prompt (e.g. call /prompt/latest internally)
    // TODO: Call your AI model (Gemini API) with the imageUrl and prompt
    // TODO: Validate the AI result against the active schema
    // Return a placeholder response for now
    return res.json({ data: 'TODO: AI extraction result' });
  } catch (err) {
    console.error('Error in AI extraction', err);
    return res.status(500).json({ error: 'AI extraction failed' });
  }
});

// Mount API router both at root and /api for backward compatibility
app.use('/', apiRouter);
app.use('/api', apiRouter);

// Export the Express app as an HTTP function
export const api = onRequest(app);
