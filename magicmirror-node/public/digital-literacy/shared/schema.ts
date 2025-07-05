import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  currentSlide: integer("current_slide").notNull().default(0),
  score: integer("score").notNull().default(0),
  completedActivities: text("completed_activities").array().notNull().default([]),
  quizAnswers: text("quiz_answers").array().notNull().default([]),
  currentQuestion: integer("current_question").notNull().default(0),
  badges: text("badges").array().notNull().default([]),
  drawingData: text("drawing_data"),
  experienceData: text("experience_data"),
  dragDropProgress: text("drag_drop_progress"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  score: integer("score").notNull().default(0),
  completedActivities: integer("completed_activities").notNull().default(0),
  badges: text("badges").array().notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStudentProgressSchema = createInsertSchema(studentProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentProgress = typeof studentProgress.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type Leaderboard = typeof leaderboard.$inferSelect;
