import { codeSnippets, executions, type CodeSnippet, type InsertCodeSnippet, type Execution, type InsertExecution } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // Code snippets
  createCodeSnippet(snippet: Omit<InsertCodeSnippet, "shareId">): Promise<CodeSnippet>;
  getCodeSnippetByShareId(shareId: string): Promise<CodeSnippet | undefined>;
  
  // Executions
  createExecution(execution: InsertExecution): Promise<Execution>;
  getExecution(id: number): Promise<Execution | undefined>;
}

export class MemStorage implements IStorage {
  private codeSnippets: Map<number, CodeSnippet>;
  private executions: Map<number, Execution>;
  private shareIdMap: Map<string, number>;
  private currentSnippetId: number;
  private currentExecutionId: number;

  constructor() {
    this.codeSnippets = new Map();
    this.executions = new Map();
    this.shareIdMap = new Map();
    this.currentSnippetId = 1;
    this.currentExecutionId = 1;
  }

  async createCodeSnippet(snippet: Omit<InsertCodeSnippet, "shareId">): Promise<CodeSnippet> {
    const id = this.currentSnippetId++;
    const shareId = nanoid(10);
    const codeSnippet: CodeSnippet = {
      ...snippet,
      id,
      shareId,
      createdAt: new Date(),
    };
    
    this.codeSnippets.set(id, codeSnippet);
    this.shareIdMap.set(shareId, id);
    return codeSnippet;
  }

  async getCodeSnippetByShareId(shareId: string): Promise<CodeSnippet | undefined> {
    const id = this.shareIdMap.get(shareId);
    if (!id) return undefined;
    return this.codeSnippets.get(id);
  }

  async createExecution(execution: InsertExecution): Promise<Execution> {
    const id = this.currentExecutionId++;
    const exec: Execution = {
      ...execution,
      id,
      createdAt: new Date(),
    };
    
    this.executions.set(id, exec);
    return exec;
  }

  async getExecution(id: number): Promise<Execution | undefined> {
    return this.executions.get(id);
  }
}

export const storage = new MemStorage();
