import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentProgressSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get student progress
  app.get("/api/progress/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const progress = await storage.getStudentProgress(studentName);
      
      if (!progress) {
        // Create new progress for new student
        const newProgress = await storage.createStudentProgress({
          studentName,
          currentSlide: 0,
          score: 0,
          completedActivities: [],
          quizAnswers: [],
          currentQuestion: 0,
          badges: [],
          drawingData: null,
          experienceData: null,
          dragDropProgress: null
        });
        return res.json(newProgress);
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get progress" });
    }
  });

  // Update student progress
  app.put("/api/progress/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const updateData = req.body;
      
      const updated = await storage.updateStudentProgress(studentName, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Also update leaderboard
      await storage.updateLeaderboard(studentName, {
        studentName,
        score: updated.score,
        completedActivities: updated.completedActivities.length,
        badges: updated.badges
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // Submit quiz answer
  app.post("/api/quiz/:studentName/answer", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { questionIndex, answer, isCorrect } = req.body;
      
      const progress = await storage.getStudentProgress(studentName);
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const updatedAnswers = [...progress.quizAnswers];
      updatedAnswers[questionIndex] = JSON.stringify({ answer, isCorrect });
      
      const newScore = progress.score + (isCorrect ? 10 : 0);
      const newCurrentQuestion = progress.currentQuestion + 1;
      
      const updated = await storage.updateStudentProgress(studentName, {
        quizAnswers: updatedAnswers,
        score: newScore,
        currentQuestion: newCurrentQuestion
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Save drawing
  app.post("/api/drawing/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { drawingData } = req.body;
      
      const progress = await storage.getStudentProgress(studentName);
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + 20;
      const newCompletedActivities = progress.completedActivities.includes('drawing') 
        ? progress.completedActivities 
        : [...progress.completedActivities, 'drawing'];
      
      const updated = await storage.updateStudentProgress(studentName, {
        drawingData,
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save drawing" });
    }
  });

  // Submit experience
  app.post("/api/experience/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { experienceData } = req.body;
      
      const progress = await storage.getStudentProgress(studentName);
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + 15;
      const newCompletedActivities = progress.completedActivities.includes('experience') 
        ? progress.completedActivities 
        : [...progress.completedActivities, 'experience'];
      
      const updated = await storage.updateStudentProgress(studentName, {
        experienceData: JSON.stringify(experienceData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit experience" });
    }
  });

  // Update drag drop progress
  app.post("/api/dragdrop/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { dragDropData, isComplete } = req.body;
      
      const progress = await storage.getStudentProgress(studentName);
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + (isComplete ? 15 : 5);
      const newCompletedActivities = isComplete && !progress.completedActivities.includes('drag-drop')
        ? [...progress.completedActivities, 'drag-drop']
        : progress.completedActivities;
      
      const updated = await storage.updateStudentProgress(studentName, {
        dragDropProgress: JSON.stringify(dragDropData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update drag drop progress" });
    }
  });

  // Update badges
  app.post("/api/badges/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { badgeId } = req.body;
      
      const progress = await storage.getStudentProgress(studentName);
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newBadges = progress.badges.includes(badgeId)
        ? progress.badges
        : [...progress.badges, badgeId];
      
      const updated = await storage.updateStudentProgress(studentName, {
        badges: newBadges
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update badges" });
    }
  });

  // L2 Routes - Progress tracking for Level 2
  app.get("/api/progress-l2/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const progress = await storage.getStudentProgress(studentName + "_L2");
      
      if (!progress) {
        // Create new progress for new student in L2
        const newProgress = await storage.createStudentProgress({
          studentName: studentName + "_L2",
          currentSlide: 0,
          score: 0,
          completedActivities: [],
          quizAnswers: [],
          currentQuestion: 0,
          badges: [],
          drawingData: null,
          experienceData: null,
          dragDropProgress: null
        });
        return res.json(newProgress);
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get L2 progress" });
    }
  });

  app.put("/api/progress-l2/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const updateData = req.body;
      
      const updated = await storage.updateStudentProgress(studentName + "_L2", updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update L2 progress" });
    }
  });

  // Submit quiz answer for L2
  app.post("/api/quiz-l2/:studentName/answer", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { questionIndex, answer, isCorrect } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L2");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const updatedAnswers = [...progress.quizAnswers];
      updatedAnswers[questionIndex] = JSON.stringify({ answer, isCorrect });
      
      const newScore = progress.score + (isCorrect ? 10 : 0);
      const newCurrentQuestion = progress.currentQuestion + 1;
      
      const updated = await storage.updateStudentProgress(studentName + "_L2", {
        quizAnswers: updatedAnswers,
        score: newScore,
        currentQuestion: newCurrentQuestion
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit L2 answer" });
    }
  });

  // Tap activity for L2
  app.post("/api/tap-activity/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { activityData, score: activityScore } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L2");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + activityScore;
      const newCompletedActivities = progress.completedActivities.includes('tap-activity') 
        ? progress.completedActivities 
        : [...progress.completedActivities, 'tap-activity'];
      
      const updated = await storage.updateStudentProgress(studentName + "_L2", {
        experienceData: JSON.stringify(activityData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save tap activity" });
    }
  });

  // Drag puzzle activity for L2
  app.post("/api/drag-puzzle/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { dragData, isComplete } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L2");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + (isComplete ? 25 : 5);
      const newCompletedActivities = isComplete && !progress.completedActivities.includes('drag-puzzle')
        ? [...progress.completedActivities, 'drag-puzzle']
        : progress.completedActivities;
      
      const updated = await storage.updateStudentProgress(studentName + "_L2", {
        dragDropProgress: JSON.stringify(dragData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save drag puzzle" });
    }
  });

  // Swipe gallery activity for L2
  app.post("/api/swipe-gallery/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { swipeData, swipeCount } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L2");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + Math.min(swipeCount * 2, 15); // Max 15 points
      const newCompletedActivities = !progress.completedActivities.includes('swipe-gallery')
        ? [...progress.completedActivities, 'swipe-gallery']
        : progress.completedActivities;
      
      const updated = await storage.updateStudentProgress(studentName + "_L2", {
        drawingData: JSON.stringify(swipeData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save swipe gallery" });
    }
  });

  // L3 Routes - Progress tracking for Level 3 (Healthy Screen Time Habits)
  app.get("/api/progress-l3/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const progress = await storage.getStudentProgress(studentName + "_L3");
      
      if (!progress) {
        // Create new progress for new student in L3
        const newProgress = await storage.createStudentProgress({
          studentName: studentName + "_L3",
          currentSlide: 0,
          score: 0,
          completedActivities: [],
          quizAnswers: [],
          currentQuestion: 0,
          badges: [],
          drawingData: null,
          experienceData: null,
          dragDropProgress: null
        });
        return res.json(newProgress);
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get L3 progress" });
    }
  });

  app.put("/api/progress-l3/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const updateData = req.body;
      
      const updated = await storage.updateStudentProgress(studentName + "_L3", updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Update leaderboard for L3 achievements
      if (updateData.score !== undefined || updateData.badges !== undefined) {
        await storage.updateLeaderboard(studentName + "_L3", {
          studentName: studentName + "_L3",
          score: updated.score,
          completedActivities: updated.completedActivities.length,
          badges: updated.badges
        });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update L3 progress" });
    }
  });

  // Submit quiz answer for L3
  app.post("/api/quiz-l3/:studentName/answer", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { questionIndex, answer, isCorrect } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L3");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const updatedAnswers = [...progress.quizAnswers];
      updatedAnswers[questionIndex] = JSON.stringify({ answer, isCorrect });
      
      const newScore = progress.score + (isCorrect ? 10 : 0);
      const newCurrentQuestion = progress.currentQuestion + 1;
      
      const updated = await storage.updateStudentProgress(studentName + "_L3", {
        quizAnswers: updatedAnswers,
        score: newScore,
        currentQuestion: newCurrentQuestion
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit L3 answer" });
    }
  });

  // Healthy habits activity for L3
  app.post("/api/healthy-habits/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { activityData, score: activityScore } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L3");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + activityScore;
      const newCompletedActivities = !progress.completedActivities.includes('healthy-habits')
        ? [...progress.completedActivities, 'healthy-habits']
        : progress.completedActivities;
      
      const updated = await storage.updateStudentProgress(studentName + "_L3", {
        experienceData: JSON.stringify(activityData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save healthy habits activity" });
    }
  });

  // Posture check activity for L3
  app.post("/api/posture-check/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { postureData, score: activityScore } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L3");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + activityScore;
      const newCompletedActivities = !progress.completedActivities.includes('posture-check')
        ? [...progress.completedActivities, 'posture-check']
        : progress.completedActivities;
      
      const updated = await storage.updateStudentProgress(studentName + "_L3", {
        dragDropProgress: JSON.stringify(postureData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save posture check" });
    }
  });

  // Eye exercise activity for L3
  app.post("/api/eye-exercise/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const { exerciseData, score: activityScore } = req.body;
      
      const progress = await storage.getStudentProgress(studentName + "_L3");
      if (!progress) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const newScore = progress.score + activityScore;
      const newCompletedActivities = !progress.completedActivities.includes('eye-exercise')
        ? [...progress.completedActivities, 'eye-exercise']
        : progress.completedActivities;
      
      const updated = await storage.updateStudentProgress(studentName + "_L3", {
        drawingData: JSON.stringify(exerciseData),
        score: newScore,
        completedActivities: newCompletedActivities
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to save eye exercise" });
    }
  });

  // L4 Routes - Progress tracking for Level 4 (Educational Apps)
  app.get("/api/progress-l4/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const progress = await storage.getStudentProgress(studentName + "_L4");
      
      if (!progress) {
        // Create new progress for new student in L4
        const newProgress = await storage.createStudentProgress({
          studentName: studentName + "_L4",
          currentSlide: 0,
          score: 0,
          completedActivities: [],
          quizAnswers: [],
          currentQuestion: 0,
          badges: [],
          drawingData: null,
          experienceData: null,
          dragDropProgress: null
        });
        return res.json(newProgress);
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get L4 progress" });
    }
  });

  app.put("/api/progress-l4/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const updateData = req.body;
      
      const updated = await storage.updateStudentProgress(studentName + "_L4", updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Update leaderboard for L4 achievements
      if (updateData.score !== undefined || updateData.badges !== undefined) {
        await storage.updateLeaderboard(studentName + "_L4", {
          studentName: studentName + "_L4",
          score: updated.score,
          completedActivities: updated.completedActivities.length,
          badges: updated.badges
        });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update L4 progress" });
    }
  });

  // L5 Routes - Progress tracking for Level 5 (Online vs Offline)
  app.get("/api/progress-l5/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const progress = await storage.getStudentProgress(studentName + "_L5");
      
      if (!progress) {
        // Create new progress for new student in L5
        const newProgress = await storage.createStudentProgress({
          studentName: studentName + "_L5",
          currentSlide: 0,
          score: 0,
          completedActivities: [],
          quizAnswers: [],
          currentQuestion: 0,
          badges: [],
          drawingData: null,
          experienceData: null,
          dragDropProgress: null
        });
        return res.json(newProgress);
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get L5 progress" });
    }
  });

  app.put("/api/progress-l5/:studentName", async (req, res) => {
    try {
      const { studentName } = req.params;
      const updateData = req.body;
      
      const updated = await storage.updateStudentProgress(studentName + "_L5", updateData);
      if (!updated) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Update leaderboard if score or badges changed
      if (updateData.score !== undefined || updateData.badges !== undefined) {
        await storage.updateLeaderboard(studentName + "_L5", {
          studentName: studentName + "_L5",
          score: updated.score,
          completedActivities: updated.completedActivities.length,
          badges: updated.badges
        });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update L5 progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
