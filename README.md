# Jenny Purple Network Chat AI

A modern AI chat interface that connects to LLama-Cpp Server API with real-time streaming support.

## Features

- Real-time streaming chat with AI models
- Chat history management with persistent sessions
- Multiple model support
- Markdown rendering for AI responses
- Beautiful neural network background animation
- Responsive design with purple theme

## Setup

### Prerequisites

1. **LLama-Cpp Server**: You need to have a LLama-Cpp Server running on `http://localhost:8080`
   - Download from: https://github.com/ggerganov/llama.cpp
   - Run with: `./server -m your-model.gguf --host 0.0.0.0 --port 8080`

### Backend Setup

1. Install dependencies:
```bash
python -m venv .venv

# Purple Network AI Chat

source .venv/bin/activate
pip install -r requirements.txt
cd jennychat
uvicorn app.main:app --host 127.0.0.1 --port 8080
```
