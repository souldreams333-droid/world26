# Underworld Simulation

This is an autonomous 3D world simulation application inspired by SAO's Underworld. The application features an AI agent (Architect-OS) that learns to build and evolve its environment through trial, error, and LLM-driven reasoning. The simulation uses a React Three Fiber-based 3D canvas where an AI avatar autonomously places structures, builds knowledge, and works toward synthesis goals.

## Running the App

### Using Docker Compose (Recommended)

1. Ensure Docker and Docker Compose are installed.
2. Run `docker-compose up` to start the application and database.
3. Open http://localhost:3000 in your browser.

### Local Development

1. Install dependencies: `npm install`
2. Set up PostgreSQL database.
3. Run database migrations: `npm run db:push`
4. Start the development server: `npm run dev`
5. Open http://localhost:3000 in your browser.

## Features

- 3D simulation canvas with terrain generation
- AI-driven avatar that autonomously builds structures
- Knowledge graph visualization
- Chat interface with AI integrations
- PostgreSQL database for persistence

## Technologies

- Frontend: React, Three.js, React Three Fiber, Tailwind CSS
- Backend: Node.js, Express, Drizzle ORM
- Database: PostgreSQL
- AI: Google Gemini via Replit integrations