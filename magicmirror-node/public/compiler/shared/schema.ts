import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull().unique(),
  language: text("language").notNull(),
  code: text("code").notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const executions = pgTable("executions", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(),
  code: text("code").notNull(),
  output: text("output"),
  error: text("error"),
  status: text("status").notNull(), // "success", "error", "timeout"
  executionTime: text("execution_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({
  id: true,
  createdAt: true,
});

export const insertExecutionSchema = createInsertSchema(executions).omit({
  id: true,
  createdAt: true,
});

export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = typeof codeSnippets.$inferSelect;
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type Execution = typeof executions.$inferSelect;

// Language configuration type
export interface Language {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  judge0Id: number;
  defaultCode: string;
  filename: string;
  extension: string;
}
