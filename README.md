# XtendPlex Chat Application

A real-time chat application built with React, Node.js, and Socket.io.

## Project Structure

This project consists of two main parts:

- **Frontend**: React application with Vite, TypeScript, and Tailwind CSS
- **Backend**: Node.js server with Express and Socket.io

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Git

## Setup & Installation

### Clone the Repository

```bash
git clone <repository-url>
cd xtendplex-chat-app
```

### Backend Setup

1. Navigate to the backend directory:

```bash
cd xtendplex-chat-backend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   - Rename `.env.example` to `.env` if it exists or create a new `.env` file
   - Required environment variables:
     - PORT=3000
     - FRONTEND_URL=http://localhost:5173
     - JWT_SECRET=your_secret_key
     - SUPABASE_URL=your_supabase_url (create your own Supabase project at supabase.com)
     - SUPABASE_KEY=your_supabase_key (get this from your Supabase project settings)
       Note: For Supabase setup, create a new project at supabase.com and follow the SQL files in this repo to set up the required policies and functions.

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd ../xtendplex-chat-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   - Rename `.env.example` to `.env` if it exists or create a new `.env` file
   - Required environment variables:
     - VITE_API_URL=http://localhost:3000/api

## Running the Application

### Start the Backend Server

```bash
cd xtendplex-chat-backend
npm run dev
```

The backend server will start on http://localhost:3000.

### Start the Frontend Application

```bash
cd xtendplex-chat-frontend
npm run dev
```

The frontend application will start on http://localhost:5173.

## Usage

1. Open your browser and navigate to http://localhost:5173
2. Register a new account or login with existing credentials
3. Start chatting!

## Features

- Real-time messaging using Socket.io
- User authentication and authorization
- Clean, responsive UI built with Tailwind CSS
- TypeScript for type safety

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Socket.io Client
- Tailwind CSS
- Radix UI Components

### Backend

- Node.js
- Express
- Socket.io
- JWT Authentication
- Supabase

## Development

### Frontend Development Commands

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build locally
```

### Backend Development Commands

```bash
npm run dev   # Start development server with nodemon
npm run start # Start production server
```

## License

This project is private and confidential. All rights reserved.
