import express from "express";
import cors from "cors";
import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";
import * as admin from "firebase-admin";
import {GoogleGenerativeAI} from "@google/generative-ai";

// Initialize Firebase Admin if not already initialized
try {
  admin.initializeApp();
} catch (e) {
  // ignore if already initialized
}

// Set default region for all HTTP functions
setGlobalOptions({region: "asia-southeast1"});

// Create an Express app
const app = express();

// Enable JSON body parsing
app.use(express.json());

// Configure CORS: allow local dev and production domain
const allowedOrigins: string[] = [
  "http://localhost:5173",
  "https://your-frontend-domain.com", // TODO: replace with your actual domain in production
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ok: true, service: "ai-config-api"});
});

const apiRouter = express.Router();

// Endpoint to return the latest prompt
const getLatestPrompt = async (_req: express.Request, res: express.Response) => {
  try {
    // TODO: Fetch instructions/rules/examples from Firestore and compose the prompt
    return res.json({
      id: "latest",
      version: "init",
      content: "TODO: implement prompt assembly logic",
    });
  } catch (err) {
    console.error("Error fetching prompt", err);
    return res.status(500).json({error: "Failed to fetch prompt"});
  }
};

apiRouter.get("/prompt/latest", getLatestPrompt);

// Endpoint to return the active schema
apiRouter.get("/schemas/active", async (_req, res) => {
  try {
    // TODO: Fetch the active JSON schema from Firestore
    return res.json({
      name: "TourExtractSchema",
      fields: ["tourCode", "guideName", "startDate", "endDate"],
      // Include your full schema definition here
    });
  } catch (err) {
    console.error("Error fetching schema", err);
    return res.status(500).json({error: "Failed to fetch schema"});
  }
});

// Endpoint to perform AI extraction
apiRouter.post("/ai/extract", async (req, res) => {
  try {
    const {
      imageUrl,
      imageBase64,
      imageMimeType,
      imageName,
      prompt,
    } = req.body as {
      imageUrl?: string;
      imageBase64?: string;
      imageMimeType?: string;
      imageName?: string;
      prompt?: string;
    };

    // Check if we have either imageUrl or imageBase64
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({
        error: "Either imageUrl or imageBase64 is required",
      });
    }

    // Check if we have a prompt
    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    // Get API key from environment or request headers
    const apiKey = process.env.GEMINI_API_KEY ||
      req.headers.authorization?.replace("Bearer ", "");
    if (!apiKey) {
      return res.status(400).json({
        error: "Gemini API key is required",
      });
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    // Prepare image data
    let imageData: string;
    let mimeType: string;

    if (imageBase64) {
      imageData = imageBase64;
      mimeType = imageMimeType || "image/jpeg";
    } else if (imageUrl) {
      // For URL, we would need to fetch the image first
      // For now, return an error as we're focusing on base64 uploads
      return res.status(400).json({
        error: "Image URL processing not implemented yet. Please upload image file.",
      });
    } else {
      return res.status(400).json({
        error: "No valid image data provided",
      });
    }

    // Create the content for Gemini
    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: mimeType,
      },
    };

    const textPart = prompt;

    // Generate content with Gemini
    const result = await model.generateContent([textPart, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Try to parse as JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch (parseError) {
      // If not JSON, return as plain text
      parsedResult = {extractedText: text};
    }

    return res.json({
      raw_output: text,
      parsed: parsedResult,
      imageSource: imageUrl ? "url" : "base64",
      imageName: imageName || "unknown",
      prompt: prompt,
    });
  } catch (err) {
    console.error("Error in AI extraction", err);
    return res.status(500).json({
      error: "AI extraction failed",
      details: (err as Error).message,
    });
  }
});

// Endpoint to save custom prompt
apiRouter.post("/prompt/save", async (req, res) => {
  try {
    const {prompt, name, description} = req.body as {
      prompt: string;
      name?: string;
      description?: string;
    };

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }

    const db = admin.firestore();
    const promptData = {
      prompt: prompt.trim(),
      name: name?.trim() || "Custom Prompt",
      description: description?.trim() || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      usageCount: 0,
    };

    const docRef = await db.collection("custom_prompts").add(promptData);

    return res.json({
      id: docRef.id,
      ...promptData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error saving custom prompt", err);
    return res.status(500).json({
      error: "Failed to save custom prompt",
      details: (err as Error).message,
    });
  }
});

// Endpoint to get saved custom prompts
apiRouter.get("/prompt/saved", async (_req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("custom_prompts")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();

    const prompts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({prompts});
  } catch (err) {
    console.error("Error fetching saved prompts", err);
    return res.status(500).json({
      error: "Failed to fetch saved prompts",
      details: (err as Error).message,
    });
  }
});

// Endpoint to update usage count of a prompt
apiRouter.post("/prompt/:id/use", async (req, res) => {
  try {
    const {id} = req.params;
    const db = admin.firestore();

    await db.collection("custom_prompts").doc(id).update({
      usageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({success: true});
  } catch (err) {
    console.error("Error updating prompt usage", err);
    return res.status(500).json({
      error: "Failed to update prompt usage",
      details: (err as Error).message,
    });
  }
});

// Mount API router both at root and /api for backward compatibility
app.use("/", apiRouter);
app.use("/api", apiRouter);

// Export the Express app as an HTTP function
export const api = onRequest(app);
