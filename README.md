# TravelAgent_ASI

An AI-powered travel itinerary planner with voice input capabilities using Deepgram's voice AI agent.

## Features

- **Voice-First Interface**: Start with a voice conversation to plan your trip
- **Intelligent Parsing**: Automatically extracts city, start date, and end date from natural conversation
- **Live Transcription**: Split-screen display showing both AI agent and user transcriptions in real-time
- **ASI Backend Integration**: Sends structured trip data (city, dates) to the backend instead of raw transcription
- **Automatic Redirection**: After planning, automatically redirects to the itinerary dashboard

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Deepgram API**:
   - Get your API key from [Deepgram Console](https://console.deepgram.com/)
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Add your Deepgram API key to `.env`:
     ```
     VITE_DEEPGRAM_API_KEY=your_actual_api_key_here
     ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

## Usage

1. **Voice Agent Entry Point**: The app now starts at the voice agent page (`/`)
2. **Conversation Flow**: 
   - Tell the AI where you want to go and your travel dates
   - Example: "I want to visit Paris from November 1st to November 5th"
   - The AI extracts the city (Paris) and dates automatically
3. **Live Transcription**:
   - Left side shows AI agent's responses
   - Right side shows your voice input
4. **Automatic Processing**: Once the AI has all information, it generates your itinerary
5. **View Itinerary**: Automatically redirected to `/home` to see your personalized travel plan

## Routes

- `/` - Voice Agent (entry point)
- `/home` - Itinerary Dashboard
- `/trip` - Saved Trip Records

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Voice AI**: Deepgram API
- **UI Components**: shadcn/ui with Tailwind CSS
- **Backend**: Express.js with Python ASI integration
