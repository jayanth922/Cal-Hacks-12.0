// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
var execAsync = promisify(exec);
async function registerRoutes(app2) {
  app2.get("/api/deepgram-key", async (req, res) => {
    try {
      const apiKey = process.env.DEEPGRAM_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Deepgram API key not configured"
        });
      }
      res.json({ apiKey });
    } catch (error) {
      console.error("Error fetching Deepgram key:", error);
      res.status(500).json({
        error: "Failed to fetch API key",
        details: error.message
      });
    }
  });
  app2.post("/api/voice-chat", async (req, res) => {
    try {
      const { message, conversationHistory, tripInfo } = req.body;
      if (!message) {
        return res.status(400).json({
          error: "Message is required"
        });
      }
      const ASI_API_KEY = process.env.ASI_API_KEY;
      if (!ASI_API_KEY) {
        return res.status(500).json({
          error: "ASI API key not configured"
        });
      }
      const API_URL = "https://api.asi1.ai/v1/chat/completions";
      let systemPrompt = `You are a helpful travel planning assistant. Your goal is to help users plan their trips by gathering information about:
1. Destination city
2. Start date of the trip
3. End date of the trip

Have a natural conversation with the user. Be friendly, conversational, and helpful. Ask follow-up questions if needed to clarify information. When you have all three pieces of information, summarize them clearly.

Important: Keep responses concise and conversational, suitable for voice interaction. Respond in 1-2 sentences maximum.`;
      if (tripInfo) {
        systemPrompt += `

Current collected information:`;
        if (tripInfo.city) systemPrompt += `
- City: ${tripInfo.city}`;
        if (tripInfo.startDate) systemPrompt += `
- Start Date: ${tripInfo.startDate}`;
        if (tripInfo.endDate) systemPrompt += `
- End Date: ${tripInfo.endDate}`;
        const missing = [];
        if (!tripInfo.city) missing.push("city");
        if (!tripInfo.startDate) missing.push("start date");
        if (!tripInfo.endDate) missing.push("end date");
        if (missing.length > 0) {
          systemPrompt += `

Still need to ask for: ${missing.join(", ")}`;
        } else {
          systemPrompt += `

All information collected! Confirm with the user and let them know we're ready to create their itinerary.`;
        }
      }
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationHistory || [],
        {
          role: "user",
          content: message
        }
      ];
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ASI_API_KEY}`
        },
        body: JSON.stringify({
          model: "asi1-mini",
          messages,
          temperature: 0.7,
          max_tokens: 150
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ASI API Error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;
      res.json({
        message: assistantMessage,
        conversationHistory: [
          ...conversationHistory || [],
          { role: "user", content: message },
          { role: "assistant", content: assistantMessage }
        ]
      });
    } catch (error) {
      console.error("Error in voice chat:", error);
      res.status(500).json({
        error: "Failed to process voice chat",
        details: error.message
      });
    }
  });
  app2.post("/api/generate-itinerary", async (req, res) => {
    try {
      const { location, startDate, endDate } = req.body;
      if (!location || !startDate || !endDate) {
        return res.status(400).json({
          error: "Missing required fields: location, startDate, endDate"
        });
      }
      const scriptPath = path.join(process.cwd(), "promotfile.py");
      const command = `python "${scriptPath}" "${location}" "${startDate}" "${endDate}"`;
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10
        // 10MB buffer for large responses
      });
      const itinerary = JSON.parse(stdout);
      res.json(itinerary);
    } catch (error) {
      console.error("Error generating itinerary:", error);
      res.status(500).json({
        error: "Failed to generate itinerary",
        details: error.message
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import dotenv from "dotenv";
dotenv.config();
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
