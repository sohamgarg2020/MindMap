# Mappit!

## Inspiration
Information today is increasingly consumed through audio—lectures, meetings, podcasts, and interviews—but audio is inherently linear and difficult to revisit. We were inspired by the question: **what if spoken ideas could be transformed into structured, visual workflows automatically?**  
We wanted to help students, researchers, and creators turn dense audio into something explorable, skimmable, and actionable.


## What it does
**Mappit!** takes an audio file as input and automatically generates a visual flowchart representing the key ideas, concepts, and relationships discussed in the audio. Instead of reading long transcripts, users can explore a structured graph that highlights major themes while still preserving supporting details.


## How we built it
We designed **Mappit!** as a modular pipeline powered by AI agents:
- **Speech-to-text** using Whisper to generate accurate transcripts  
- **Concept extraction agents** that identify topics, subtopics, and relationships  
- **Node generation agents** that create raw graph nodes from extracted concepts  
- **Cleaning and filtering logic** to reduce noise and organize the graph  
- **Frontend visualization** using an interactive flowchart interface to display nodes and edges  
Each agent operates independently, acting like a function in the pipeline. This made the system easier to debug, extend, and iterate on under hackathon constraints.


## Setup

### Prerequisites
- **Node.js** (v14 or higher) and npm
- **Python** (v3.8 or higher) and pip
- **FFmpeg** (required for audio processing)

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/mappit.git
cd mappit
```

#### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
```

#### 4. Environment Variables
Create a `.env` file in the `backend` directory with the following variables:
```bash
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # if using Claude
```

#### 5. Run the Application

**Start the backend server:**
```bash
cd backend
python app.py
```

**In a new terminal, start the frontend:**
```bash
cd frontend
npm start
```

The app should now be running at `http://localhost:3000`


## What's next for Mappit!
- Introduce **hierarchical abstraction**, grouping minor nodes under higher-level concepts  
- Add **importance scoring** so only the most relevant ideas appear by default  
- Improve **graph layout and clustering** for readability  
- Improve **connections between nodes**  
- Enable **live usage**, such as live streams or real-time video conferencing
