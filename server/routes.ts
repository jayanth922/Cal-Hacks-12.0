import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to generate itinerary
  app.post("/api/generate-itinerary", async (req, res) => {
    try {
      const { location, startDate, endDate } = req.body;

      if (!location || !startDate || !endDate) {
        return res.status(400).json({ 
          error: "Missing required fields: location, startDate, endDate" 
        });
      }

      // Path to the Python script (adjust if needed)
      const scriptPath = path.join(process.cwd(), "promotfile.py");
      
      // Execute the Python script with arguments
      const command = `python "${scriptPath}" "${location}" "${startDate}" "${endDate}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large responses
      });

      // Parse the JSON output from the Python script
      const itinerary = JSON.parse(stdout);
      
      res.json(itinerary);
    } catch (error: any) {
      console.error("Error generating itinerary:", error);
      res.status(500).json({ 
        error: "Failed to generate itinerary",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
