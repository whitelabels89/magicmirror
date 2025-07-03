# Replit.md - Online Code Compiler

## Overview

This is a full-stack web application that provides an online code compiler and sharing platform. Users can write, execute, and share code snippets in multiple programming languages. The application features a modern React frontend with a Monaco Editor for code editing, and an Express.js backend that handles code execution through the Judge0 API.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and bundling
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming support
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Code Editor**: Monaco Editor with custom themes and language support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Code Execution**: Judge0 API integration for running code in multiple languages
- **Storage**: In-memory storage with fallback to database (configured for PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store

### Database Design
- **Code Snippets Table**: Stores shareable code snippets with unique share IDs
- **Executions Table**: Tracks code execution results and performance metrics
- **Schema**: Uses Drizzle ORM with PostgreSQL dialect for type-safe database operations

## Key Components

### Language Support System
- Supports Python, JavaScript, Java, C++, and HTML/CSS
- Each language has specific Judge0 API mappings and default code templates
- Monaco Editor provides syntax highlighting and IntelliSense for supported languages

### Code Execution Engine
- Integrates with Judge0 API for server-side code execution
- Handles special cases like HTML rendering in iframe
- Provides execution status, output, error handling, and performance metrics
- Implements polling mechanism for async execution results

### Sharing System
- Generates unique share IDs using nanoid for code snippet sharing
- RESTful API endpoints for creating and retrieving shared snippets
- URL-based sharing with /shared/:shareId route pattern

### Theme System
- Light/dark theme support with system preference detection
- Custom Monaco Editor themes that match the application's design
- CSS custom properties for consistent theming across components

## Data Flow

1. **Code Writing**: User selects language and writes code in Monaco Editor
2. **Code Execution**: 
   - Code is sent to backend via REST API
   - Backend forwards to Judge0 API for execution
   - Results are polled and returned to frontend
   - Output is displayed in the output panel
3. **Code Sharing**:
   - User requests to share code
   - Backend creates database entry with unique share ID
   - Shareable URL is generated and returned
   - Shared code can be accessed via direct URL

## External Dependencies

### Core Dependencies
- **Judge0 API**: Third-party service for code execution (requires API key)
- **Neon Database**: PostgreSQL hosting service (via @neondatabase/serverless)
- **Monaco Editor**: Microsoft's web-based code editor
- **Radix UI**: Headless UI components for accessibility

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **Vite**: Frontend build tool with HMR support
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles Express server to `dist/index.js`
- Database: Drizzle migrations are applied via `db:push` command

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `JUDGE0_API_KEY` or `RAPIDAPI_KEY`: Judge0 API authentication
- `JUDGE0_API_URL`: Judge0 API endpoint (defaults to public instance)
- `NODE_ENV`: Environment setting for development vs production

### Production Setup
- Static files served from `dist/public`
- Express server handles API routes and serves SPA
- Database schema managed through Drizzle migrations
- Session storage uses PostgreSQL via connect-pg-simple

## Changelog
- June 30, 2025: Fixed Monaco Editor worker configuration to resolve language switching errors
- June 30, 2025: Added demo mode fallback when Judge0 API key is not configured
- June 29, 2025: Initial setup

## Current Status
- Application is fully functional with Monaco Editor for code editing
- All programming languages (Python, JavaScript, Java, C++, C, Go, Rust, HTML/CSS) are working
- Code execution works in demo mode (shows code preview instead of actual execution)
- To enable real code execution, Judge0 API key needs to be provided
- Theme switching and code sharing features are working properly

## User Preferences

Preferred communication style: Simple, everyday language.