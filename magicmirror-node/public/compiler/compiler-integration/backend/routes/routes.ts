import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCodeSnippetSchema, insertExecutionSchema } from "@shared/schema";
import { z } from "zod";
import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { promisify } from "util";
import path from "path";

// Judge0 API configuration
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || process.env.RAPIDAPI_KEY || "";

const execAsync = promisify(exec);

async function executeCodeLocally(language: string, code: string) {
  const tempDir = '/tmp';
  const timestamp = Date.now();
  let filename = '';
  let command = '';
  
  try {
    switch (language) {
      case 'python':
        filename = path.join(tempDir, `temp_${timestamp}.py`);
        writeFileSync(filename, code);
        command = `cd ${tempDir} && timeout 10s python3 temp_${timestamp}.py`;
        break;
        
      case 'javascript':
        filename = path.join(tempDir, `temp_${timestamp}.js`);
        writeFileSync(filename, code);
        command = `cd ${tempDir} && timeout 10s node temp_${timestamp}.js`;
        break;
        
      case 'java':
        // Extract class name from code
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        filename = path.join(tempDir, `${className}.java`);
        writeFileSync(filename, code);
        command = `cd ${tempDir} && timeout 10s javac ${className}.java && timeout 10s java ${className}`;
        break;
        
      case 'c':
        filename = path.join(tempDir, `temp_${timestamp}.c`);
        writeFileSync(filename, code);
        command = `cd ${tempDir} && timeout 10s gcc -o temp_${timestamp} temp_${timestamp}.c && timeout 10s ./temp_${timestamp}`;
        break;
        
      case 'html':
        // Special handling for HTML - just return the code for iframe rendering
        return {
          output: code,
          error: null,
          status: "success" as const,
          executionTime: "0",
        };
        
      default:
        return {
          output: "",
          error: `Language ${language} is not supported for local execution`,
          status: "error" as const,
          executionTime: "0",
        };
    }
    
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command);
    const executionTime = ((Date.now() - startTime) / 1000).toString();
    
    // Clean up temp files
    try {
      if (language === 'java') {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        unlinkSync(path.join(tempDir, `${className}.java`));
        try { unlinkSync(path.join(tempDir, `${className}.class`)); } catch {}
      } else if (language === 'c') {
        unlinkSync(filename);
        try { unlinkSync(path.join(tempDir, `temp_${timestamp}`)); } catch {}
      } else {
        unlinkSync(filename);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    return {
      output: stdout || "",
      error: stderr || null,
      status: stderr ? "error" as const : "success" as const,
      executionTime,
    };
    
  } catch (error: any) {
    // Clean up temp files on error
    try {
      if (filename) unlinkSync(filename);
    } catch {}
    
    return {
      output: "",
      error: error.message || "Execution failed",
      status: "error" as const,
      executionTime: "0",
    };
  }
}

async function executeCode(language: string, code: string, languageId: number) {
  try {
    // Try local execution first
    const localResult = await executeCodeLocally(language, code);
    if (localResult.status === "success" || localResult.error !== `Language ${language} is not supported for local execution`) {
      return localResult;
    }
    
    // Fall back to Judge0 if available
    if (!JUDGE0_API_KEY) {
      return {
        output: "",
        error: `Language ${language} requires Judge0 API key for execution. Please provide your API key or use supported languages: Python, JavaScript, Java, C++, C, Go, HTML/CSS`,
        status: "error" as const,
        executionTime: "0",
      };
    }

    // Submit code for execution
    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: Buffer.from(code).toString("base64"),
        stdin: "",
        wait: false,
        redirect_stderr_to_stdout: false,
      }),
    });

    if (!submitResponse.ok) {
      throw new Error(`Judge0 API error: ${submitResponse.statusText}`);
    }

    const submitResult = await submitResponse.json();
    const token = submitResult.token;

    // Poll for result
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
        headers: {
          "X-RapidAPI-Key": JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Judge0 API error: ${resultResponse.statusText}`);
      }

      const result = await resultResponse.json();
      
      if (result.status?.id <= 2) {
        // Still processing (In Queue = 1, Processing = 2)
        attempts++;
        continue;
      }

      // Execution completed
      const output = result.stdout ? Buffer.from(result.stdout, "base64").toString() : "";
      const error = result.stderr ? Buffer.from(result.stderr, "base64").toString() : "";
      const compilationError = result.compile_output ? Buffer.from(result.compile_output, "base64").toString() : "";
      
      return {
        output: output || error || compilationError || "",
        error: result.status?.id !== 3 ? (error || compilationError || result.status?.description || "Unknown error") : null,
        status: result.status?.id === 3 ? "success" : "error",
        executionTime: result.time || "0",
      };
    }

    throw new Error("Execution timeout");
  } catch (error) {
    console.error("Code execution error:", error);
    return {
      output: "",
      error: error instanceof Error ? error.message : "Unknown execution error",
      status: "error" as const,
      executionTime: "0",
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Execute code
  app.post("/api/execute", async (req, res) => {
    try {
      const { language, code, languageId } = req.body;
      
      if (!language || !code || !languageId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await executeCode(language, code, languageId);
      
      // Store execution in database
      const execution = await storage.createExecution({
        language,
        code,
        output: result.output,
        error: result.error,
        status: result.status,
        executionTime: result.executionTime,
      });

      res.json({
        id: execution.id,
        output: result.output,
        error: result.error,
        status: result.status,
        executionTime: result.executionTime,
      });
    } catch (error) {
      console.error("Execution error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create shared code snippet
  app.post("/api/share", async (req, res) => {
    try {
      const validatedData = insertCodeSnippetSchema.omit({ shareId: true }).parse(req.body);
      const snippet = await storage.createCodeSnippet(validatedData);
      
      res.json({
        shareId: snippet.shareId,
        url: `${req.protocol}://${req.get("host")}/shared/${snippet.shareId}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Share error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get shared code snippet
  app.get("/api/shared/:shareId", async (req, res) => {
    try {
      const { shareId } = req.params;
      const snippet = await storage.getCodeSnippetByShareId(shareId);
      
      if (!snippet) {
        return res.status(404).json({ error: "Code snippet not found" });
      }

      res.json(snippet);
    } catch (error) {
      console.error("Get shared snippet error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
