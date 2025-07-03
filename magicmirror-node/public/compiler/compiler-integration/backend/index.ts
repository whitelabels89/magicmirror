// Backend exports
export { registerRoutes } from './routes/routes';
export { MemStorage, type IStorage } from './storage/storage';

// Schema exports
export type { 
  Language, 
  CodeSnippet, 
  Execution, 
  InsertCodeSnippet, 
  InsertExecution 
} from '../shared/schema';