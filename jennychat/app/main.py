from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json
import asyncio
from datetime import datetime
import uuid
from pathlib import Path

app = FastAPI(title="Jenny AI Chat", version="1.0.0")

# Configuration
LLAMA_CPP_SERVER_URL = "http://localhost:8080"  # Default LLama-Cpp Server URL
CHAT_HISTORY_DIR = Path("chat_history")
CHAT_HISTORY_DIR.mkdir(exist_ok=True)

class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: datetime = None

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    model: Optional[str] = "default"
    stream: bool = True
    max_tokens: Optional[int] = 2048
    temperature: Optional[float] = 0.7

class ChatResponse(BaseModel):
    chat_id: str
    message: ChatMessage
    model: str

class ChatSession(BaseModel):
    chat_id: str
    title: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

# In-memory storage for chat sessions (replace with database in production)
chat_sessions: Dict[str, ChatSession] = {}

@app.get("/")
async def root():
    return {"message": "JennyNet AI Chat API"}

@app.get("/api/chats")
async def get_chats():
    """Get list of all chat sessions"""
    try:
        chat_list = []
        for chat_id, session in chat_sessions.items():
            chat_list.append({
                "chat_id": chat_id,
                "title": session.title,
                "message_count": len(session.messages),
                "updated_at": session.updated_at.isoformat()
            })
        
        # Sort by updated_at descending
        chat_list.sort(key=lambda x: x["updated_at"], reverse=True)
        
        return {"chats": chat_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str):
    """Get a specific chat session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return chat_sessions[chat_id]

@app.post("/api/chats")
async def create_chat():
    """Create a new chat session"""
    chat_id = str(uuid.uuid4())
    now = datetime.now()
    
    session = ChatSession(
        chat_id=chat_id,
        title=f"Chat {len(chat_sessions) + 1}",
        messages=[],
        created_at=now,
        updated_at=now
    )
    
    chat_sessions[chat_id] = session
    return {"chat_id": chat_id, "title": session.title}

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    del chat_sessions[chat_id]
    return {"message": "Chat deleted successfully"}

@app.post("/api/chat")
async def send_message(request: ChatRequest):
    """Send a message to the AI and get response"""
    try:
        # Create new chat if none specified
        if not request.chat_id or request.chat_id not in chat_sessions:
            chat_id = str(uuid.uuid4())
            now = datetime.now()
            session = ChatSession(
                chat_id=chat_id,
                title=f"Chat {len(chat_sessions) + 1}",
                messages=[],
                created_at=now,
                updated_at=now
            )
            chat_sessions[chat_id] = session
        else:
            chat_id = request.chat_id
            session = chat_sessions[chat_id]

        # Add user message to session
        user_message = ChatMessage(
            role="user",
            content=request.message,
            timestamp=datetime.now()
        )
        session.messages.append(user_message)

        # Prepare messages for LLama-Cpp Server
        messages = []
        for msg in session.messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Send request to LLama-Cpp Server
        llama_request = {
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "stream": request.stream
        }

        async with httpx.AsyncClient() as client:
            if request.stream:
                return StreamingResponse(
                    stream_chat_response(client, chat_id, llama_request),
                    media_type="text/plain"
                )
            else:
                response = await client.post(
                    f"{LLAMA_CPP_SERVER_URL}/v1/chat/completions",
                    json=llama_request,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail="LLama-Cpp Server error")
                
                result = response.json()
                assistant_content = result["choices"][0]["message"]["content"]
                
                # Add assistant response to session
                assistant_message = ChatMessage(
                    role="assistant",
                    content=assistant_content,
                    timestamp=datetime.now()
                )
                session.messages.append(assistant_message)
                session.updated_at = datetime.now()
                
                return ChatResponse(
                    chat_id=chat_id,
                    message=assistant_message,
                    model=request.model
                )

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to LLama-Cpp Server: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def stream_chat_response(client: httpx.AsyncClient, chat_id: str, llama_request: dict):
    """Stream chat response from LLama-Cpp Server"""
    try:
        async with client.stream(
            "POST",
            f"{LLAMA_CPP_SERVER_URL}/v1/chat/completions",
            json=llama_request,
            timeout=60.0
        ) as response:
            if response.status_code != 200:
                yield f"data: {json.dumps({'error': 'LLama-Cpp Server error'})}\n\n"
                return
            
            full_content = ""
            async for chunk in response.aiter_text():
                if chunk.strip():
                    try:
                        # Parse SSE format
                        if chunk.startswith("data: "):
                            data = chunk[6:].strip()
                            if data == "[DONE]":
                                break
                            
                            parsed = json.loads(data)
                            if "choices" in parsed and len(parsed["choices"]) > 0:
                                delta = parsed["choices"][0].get("delta", {})
                                if "content" in delta:
                                    content = delta["content"]
                                    full_content += content
                                    yield f"data: {json.dumps({'content': content, 'chat_id': chat_id})}\n\n"
                    except json.JSONDecodeError:
                        continue
            
            # Add complete response to session
            if full_content:
                session = chat_sessions[chat_id]
                assistant_message = ChatMessage(
                    role="assistant",
                    content=full_content,
                    timestamp=datetime.now()
                )
                session.messages.append(assistant_message)
                session.updated_at = datetime.now()
                
                yield f"data: {json.dumps({'done': True, 'chat_id': chat_id})}\n\n"
    
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.get("/api/models")
async def get_models():
    """Get available models from LLama-Cpp Server"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{LLAMA_CPP_SERVER_URL}/v1/models", timeout=10.0)
            if response.status_code == 200:
                return response.json()
            else:
                return {"data": [{"id": "default", "object": "model"}]}
    except:
        return {"data": [{"id": "default", "object": "model"}]}

@app.put("/api/chats/{chat_id}/title")
async def update_chat_title(chat_id: str, title: dict):
    """Update chat title"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat_sessions[chat_id].title = title.get("title", "Untitled Chat")
    chat_sessions[chat_id].updated_at = datetime.now()
    
    return {"message": "Title updated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
