import { users, studentProgress, leaderboard, type User, type InsertUser, type StudentProgress, type InsertStudentProgress, type Leaderboard, type InsertLeaderboard } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getStudentProgress(studentName: string): Promise<StudentProgress | undefined>;
  createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress>;
  updateStudentProgress(studentName: string, progress: Partial<InsertStudentProgress>): Promise<StudentProgress | undefined>;
  
  getLeaderboard(): Promise<Leaderboard[]>;
  updateLeaderboard(studentName: string, data: Partial<InsertLeaderboard>): Promise<Leaderboard>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private studentProgressMap: Map<string, StudentProgress>;
  private leaderboardMap: Map<string, Leaderboard>;
  private currentUserId: number;
  private currentProgressId: number;
  private currentLeaderboardId: number;

  constructor() {
    this.users = new Map();
    this.studentProgressMap = new Map();
    this.leaderboardMap = new Map();
    this.currentUserId = 1;
    this.currentProgressId = 1;
    this.currentLeaderboardId = 1;
    
    // Initialize with some sample leaderboard data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleData = [
      { studentName: 'Alice', score: 85, completedActivities: 4, badges: ['quiz-master', 'artist'] },
      { studentName: 'Bob', score: 72, completedActivities: 3, badges: ['quiz-complete'] },
      { studentName: 'Charlie', score: 68, completedActivities: 3, badges: ['storyteller'] },
      { studentName: 'Diana', score: 55, completedActivities: 2, badges: ['sorter'] }
    ];
    
    sampleData.forEach(data => {
      const leaderboard: Leaderboard = {
        id: this.currentLeaderboardId++,
        studentName: data.studentName,
        score: data.score,
        completedActivities: data.completedActivities,
        badges: data.badges,
        updatedAt: new Date()
      };
      this.leaderboardMap.set(data.studentName, leaderboard);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getStudentProgress(studentName: string): Promise<StudentProgress | undefined> {
    return this.studentProgressMap.get(studentName);
  }

  async createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    const id = this.currentProgressId++;
    const studentProgress: StudentProgress = {
      id,
      studentName: progress.studentName,
      currentSlide: progress.currentSlide || 0,
      score: progress.score || 0,
      completedActivities: progress.completedActivities || [],
      quizAnswers: progress.quizAnswers || [],
      currentQuestion: progress.currentQuestion || 0,
      badges: progress.badges || [],
      drawingData: progress.drawingData || null,
      experienceData: progress.experienceData || null,
      dragDropProgress: progress.dragDropProgress || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.studentProgressMap.set(progress.studentName, studentProgress);
    return studentProgress;
  }

  async updateStudentProgress(studentName: string, progress: Partial<InsertStudentProgress>): Promise<StudentProgress | undefined> {
    const existing = this.studentProgressMap.get(studentName);
    if (!existing) return undefined;
    
    const updated: StudentProgress = {
      ...existing,
      ...progress,
      updatedAt: new Date()
    };
    this.studentProgressMap.set(studentName, updated);
    return updated;
  }

  async getLeaderboard(): Promise<Leaderboard[]> {
    return Array.from(this.leaderboardMap.values()).sort((a, b) => b.score - a.score);
  }

  async updateLeaderboard(studentName: string, data: Partial<InsertLeaderboard>): Promise<Leaderboard> {
    const existing = this.leaderboardMap.get(studentName);
    
    if (existing) {
      const updated: Leaderboard = {
        ...existing,
        ...data,
        updatedAt: new Date()
      };
      this.leaderboardMap.set(studentName, updated);
      return updated;
    } else {
      const id = this.currentLeaderboardId++;
      const newEntry: Leaderboard = {
        id,
        studentName,
        score: data.score || 0,
        completedActivities: data.completedActivities || 0,
        badges: data.badges || [],
        updatedAt: new Date()
      };
      this.leaderboardMap.set(studentName, newEntry);
      return newEntry;
    }
  }
}

export const storage = new MemStorage();
