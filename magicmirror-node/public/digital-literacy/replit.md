# Educational Interactive Learning Platform

## Overview

This is a full-stack educational web application designed to teach children about digital tools and technology. The platform features interactive slides, quizzes, drawing activities, drag-and-drop exercises, and a gamified learning experience with progress tracking, leaderboards, and badges.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: In-memory storage implementation with database schema ready
- **API**: RESTful API endpoints for progress tracking and activities

### Development Environment
- **Hot Module Replacement**: Vite middleware integration
- **TypeScript**: Full type safety across client and server
- **Path Aliases**: Configured for clean imports (@/, @shared/)
- **Error Handling**: Runtime error overlay for development

## Key Components

### Educational Content System
- **Slide Viewer**: Interactive presentation system with navigation
- **Quiz Activity**: Multiple choice and text-based questions
- **Drawing Activity**: Canvas-based drawing tool with color selection
- **Drag-Drop Activity**: Categorization exercises (digital vs non-digital items)
- **Experience Activity**: Personal reflection and sharing component

### Progress Tracking System
- **Student Progress**: Tracks current slide, scores, completed activities
- **Badge System**: Achievement system with visual rewards
- **Leaderboard**: Competitive ranking system
- **Activity Completion**: Granular tracking of user interactions

### UI Component Library
- **Design System**: Consistent styling with CSS variables
- **Responsive Design**: Mobile-first approach with Tailwind
- **Interactive Elements**: Rich form controls, dialogs, and feedback
- **Accessibility**: ARIA compliance through Radix UI primitives

## Data Flow

### Client-Server Communication
1. **Initial Load**: Client requests student progress from server
2. **Activity Interactions**: Real-time updates sent to server on completion
3. **Progress Sync**: Automatic synchronization of learning progress
4. **Leaderboard Updates**: Server calculates and serves competitive rankings

### State Management
- **Server State**: TanStack Query handles caching and synchronization
- **Local State**: React state for UI interactions and form data
- **Persistent Storage**: Database persistence for long-term progress tracking

## External Dependencies

### Database Integration
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Primary database (configured but using in-memory storage)
- **Neon Database**: Cloud PostgreSQL provider integration

### UI and Styling
- **Tailwind CSS**: Utility-first styling framework
- **Radix UI**: Accessible component primitives
- **Shadcn/ui**: Pre-built component library
- **Fredoka One**: Custom font for child-friendly design

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production
- **PostCSS**: CSS processing and optimization
- **Replit Integration**: Development environment compatibility

## Deployment Strategy

### Build Process
- **Client Build**: Vite builds React app to `dist/public`
- **Server Build**: ESBuild bundles Node.js server to `dist/index.js`
- **Asset Optimization**: Automatic optimization of images and fonts

### Environment Configuration
- **Development**: Vite dev server with HMR and proxy
- **Production**: Express serves built assets with API routes
- **Database**: Environment-based connection string configuration

### Scripts
- `dev`: Development server with hot reloading
- `build`: Production build for both client and server
- `start`: Production server startup
- `db:push`: Database schema deployment

## Changelog

- July 05, 2025. Initial setup
- July 05, 2025. Added video content and animations
  - VideoPlayer component with controls and progress tracking
  - AnimatedGesture component for tap, drag, swipe demonstrations
  - AnimatedIntro component for onboarding experience
  - Integrated Framer Motion for smooth animations
  - Enhanced slide content with video placeholders and gesture animations
  - Mobile-optimized responsive design improvements
- July 05, 2025. Implemented Level 3: Safe and Healthy Screen Time Habits
  - Complete L3 curriculum based on provided materials (Guidelines, Slides, Practice Questions)
  - Six interactive slides covering screen time duration, posture, eye exercises, and healthy habits
  - Five specialized activity components: HealthyHabitsActivity, PostureActivity, EyeExerciseActivity, QuizActivityL3, PracticeActivityL3
  - Comprehensive L3 API endpoints for progress tracking and activity completion
  - Enhanced navigation system with level switching across all pages
  - L3-specific badges, progress tracking, and gamification elements
  - Full integration with existing infrastructure and responsive design
- July 05, 2025. Implemented Level 4: Exploring Educational Apps Together
  - Complete L4 curriculum based on provided materials (Guidelines, Slides, Practice Questions)
  - Six interactive slides covering app basics, examples, benefits, and hands-on exploration
  - Five specialized activity components: AppExplorationActivity, AppDiscussionActivity, AppDesignActivity, QuizActivityL4, PracticeActivityL4
  - Comprehensive L4 API endpoints for progress tracking and activity completion
  - Enhanced slide viewer and animated intro to support L4
  - L4-specific badges including "App Explorer", "App Storyteller", "App Designer", "App Expert", "Hands-on Learner"
  - Drawing canvas for app design with color picker and template guidance
  - Full integration with existing navigation and responsive design
- July 05, 2025. Implemented Level 5: Understanding Online vs Offline (Conceptual)
  - Complete L5 curriculum based on provided materials (Guidelines, Slides, Practice Questions)
  - Six interactive slides covering online/offline concepts, examples, differences, and preferences
  - Five specialized activity components: OnlineOfflineActivityL5, ConceptMatchingActivityL5, PreferenceDiscussionActivityL5, QuizActivityL5, PracticeActivityL5
  - Comprehensive educational activities including drag-and-drop categorization, scenario-based learning, and hands-on practice
  - L5-specific API endpoints for progress tracking and activity completion
  - Enhanced navigation with level switcher integration
  - L5-specific badges including "Konsep Master", "Explorer", "Matching Master", "Perfect Matcher", "Discussion Master", "Quiz Master"
  - Full support for slide viewer, animated intro, and responsive design across all devices

## User Preferences

Preferred communication style: Simple, everyday language.