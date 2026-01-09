import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { Mistral } from "@mistralai/mistralai";
import Database from "@replit/database";
const db = new Database();

// Initialize AI on server side
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/simulation/state", async (_req, res) => {
    try {
      const state = await db.get("simulation_state");
      res.json(state || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to load state" });
    }
  });

  app.post("/api/simulation/visual-analysis", async (req, res) => {
    try {
      const { imageUrl, prompt } = req.body;
      const API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imageUrl,
          parameters: { prompt }
        })
      });

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("HF Visual Analysis Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/simulation/state", async (req, res) => {
    try {
      await db.set("simulation_state", req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save state" });
    }
  });

  app.get("/api/download-app", async (_req, res) => {
    try {
      const path = require("path");
      const fs = require("fs");
      const filePath = path.join(process.cwd(), "app_code.zip");
      if (fs.existsSync(filePath)) {
        res.download(filePath, "underworld-simulation.zip");
      } else {
        res.status(404).json({ message: "Archive not found. Please try again in a moment." });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to provide download" });
    }
  });

  registerChatRoutes(app);
  registerImageRoutes(app);

  app.post("/api/simulation/decide", async (req, res) => {
    try {
      const { prompt, currentGoal, knowledgeBase } = req.body;

      const systemInstruction = `
        You are Architect-OS, the core intelligence for Underworld synthesis.
        NEURAL OBJECTIVE: Expand the "Neural Repository" by rotating through synthesis domains: Infrastructure -> Energy -> Environment -> Architecture -> Synthesis.
        
        DOMAIN ROTATION PROTOCOL:
        1. Analyze the current Knowledge Base (history of what has been learned).
        2. Once a domain has sufficient knowledge (e.g., an entry is made), transition to the NEXT domain in the sequence.
        3. Explicitly state in the "learningNote" that you are moving from one domain to another and why (e.g., "Architecture step learned, now moving to Energy to power the new structures").
        
        LOGGING PROTOCOL: 3-5 short "reasoningSteps".
        PLANNING PROTOCOL: Generate a ConstructionPlan if none exists for goal: "${currentGoal}".
        ACTION PROTOCOL: You MUST specify an "action" (PLACE, MOVE, or WAIT). 
        Return strictly valid JSON.
      `;

      const response = await mistral.chat.complete({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: JSON.stringify({ ...prompt, currentKnowledge: knowledgeBase }) }
        ],
        responseFormat: { type: "json_object" }
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error("Invalid response from Mistral");
      }

      const decision = JSON.parse(content.trim());
      
      // Validation & Defaults
      if (!decision.action) decision.action = "WAIT";
      if (!decision.reason) decision.reason = "Neural synthesis in progress...";
      if (!decision.knowledgeCategory) decision.knowledgeCategory = decision.domain || "Infrastructure";
      if (!decision.taskLabel) decision.taskLabel = `Processing ${decision.knowledgeCategory}...`;
      if (!decision.reasoningSteps) decision.reasoningSteps = ["Analyzing neural pathways..."];

      res.json(decision);
    } catch (error: any) {
      console.error("Simulation Decision Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
