# Underworld Simulation

## Overview

This is an autonomous 3D world simulation application inspired by SAO's Underworld. The application features an AI agent (Architect-OS) that learns to build and evolve its environment through trial, error, and LLM-driven reasoning. The simulation uses a React Three Fiber-based 3D canvas where an AI avatar autonomously places structures, builds knowledge, and works toward synthesis goals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is a React application using Vite as the build tool with the following structure:

- **3D Rendering**: Uses React Three Fiber (@react-three/fiber) with Three.js for the 3D simulation canvas, including terrain generation, avatar movement, and world object placement
- **UI Components**: Built with shadcn/ui component library using Radix UI primitives, styled with Tailwind CSS
- **State Management**: React useState/useCallback hooks for simulation state including world objects, logs, knowledge base, and construction plans
- **Data Fetching**: TanStack Query for API calls to the backend

Key client components:
- `SimulationCanvas`: Main 3D viewport with terrain, objects, and avatar
- `Avatar`: AI agent representation with visual effects for thinking/processing states
- `KnowledgeGraph`: Force-directed graph visualization of learned knowledge
- `WorldAssets`: 3D models for different object types (walls, solar panels, trees, etc.)

### Backend Architecture

Express.js server with the following structure:

- **API Routes**: RESTful endpoints for simulation decisions and AI integrations
- **AI Integration**: Uses Google Gemini (via Replit AI Integrations) for decision-making with structured JSON responses
- **Database**: PostgreSQL with Drizzle ORM for data persistence
- **Storage Layer**: Abstracted storage interface supporting both memory and database backends

Key backend modules:
- `server/routes.ts`: Main API endpoints including `/api/simulation/decide` for AI decision-making
- `server/replit_integrations/`: Pre-built integrations for chat, image generation, and batch processing
- `shared/schema.ts`: Drizzle schema definitions shared between frontend and backend

### Data Flow

1. Frontend simulation loop calls `/api/simulation/decide` with world state
2. Backend constructs prompt with terrain data, knowledge base, and current plan
3. Gemini AI returns structured action response (PLACE/MOVE/WAIT)
4. Frontend updates 3D world and knowledge graph based on AI decision
5. Loop continues autonomously or on manual trigger

### Type System

Shared types in `client/src/types.ts`:
- `WorldObject`: Placed 3D objects with position, rotation, scale
- `LogEntry`: Simulation event logs with categories (action, learning, error, success, thinking)
- `KnowledgeEntry`: Learned concepts categorized by domain (Infrastructure, Energy, Environment, Architecture, Synthesis)
- `ConstructionPlan`: Multi-step building plans with progress tracking

## External Dependencies

### AI Services

- **Google Gemini**: Primary AI model for simulation decision-making via Replit AI Integrations
  - Environment variables: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`
  - Model: `gemini-2.0-flash-exp` with thinking budget configuration
  - Returns structured JSON with action, reasoning steps, and knowledge categorization

### Database

- **PostgreSQL**: Primary data store configured via Drizzle ORM
  - Environment variable: `DATABASE_URL`
  - Schema includes users table and chat/messages tables for conversation persistence
  - Migrations stored in `/migrations` directory

### Third-Party Libraries

- **Three.js / React Three Fiber**: 3D rendering and scene management
- **@react-three/drei**: Helper components for Three.js (OrbitControls, Sky, Stars, etc.)
- **Drizzle ORM**: Type-safe database queries and schema management
- **TanStack Query**: Async state management for API calls
- **shadcn/ui + Radix UI**: Accessible UI component primitives
- **Tailwind CSS**: Utility-first styling with custom theme configuration