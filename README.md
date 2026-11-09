# Personal Notes App

A full-stack private notes application built for the Melsoft Academy mini-project.

## Technologies
- React.js
- Tailwind CSS
- Node.js
- Express.js
- Supabase

## Features
- User registration and login
- User authentication
- Create, view, edit and delete notes
- Persistent notes storage
- Responsive user interface
- REST API backend

## Project Structure
- client/ - React frontend
- server/ - Node.js and Express backend

## Running Locally

### Frontend
1. Open the client folder.
2. Run npm install.
3. Configure client/.env.local with your Vite Supabase environment variables.
4. Run npm run dev.

### Backend
1. Open the server folder.
2. Run npm install.
3. Configure server/.env with SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and PORT.
4. Run node server.js.

## API
The Express backend provides authentication and notes endpoints, including GET, POST, PUT and DELETE operations.

## Testing
Login, logout, note creation, editing, deletion and persistence have been tested successfully.

## Security
Environment files are excluded from Git. Notes should be accessible only to their authenticated owners.

## Author
Melsoft Academy Student Project
