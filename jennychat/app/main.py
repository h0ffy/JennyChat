
from fastapi import FastAPI, HTTPException, Query, FastAPI, Request, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json
import asyncio
from datetime import datetime
import uuid
from pathlib import Path
import os, sys
from app.conf import *

app = FastAPI(title="Jenny AI Chat", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Montar frontend estático
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))


# Configurations
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

# Collaborative chat models
class CollaborativeMessage(BaseModel):
    id: str
    roomId: str
    userId: str
    username: str
    content: str
    timestamp: datetime

class CollaborativeRoom(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    private: bool = False
    created_at: datetime

    created_by: str

class ConnectedUser(BaseModel):
    userId: str
    username: str
    websocket: WebSocket
    currentRoom: Optional[str] = None
    model_config = {"arbitrary_types_allowed": True}


# In-memory storage for chat sessions (replace with database in production)
chat_sessions: Dict[str, ChatSession] = {}

# Collaborative chat storage
collaborative_rooms: Dict[str, CollaborativeRoom] = {}
collaborative_messages: Dict[str, List[CollaborativeMessage]] = {}
connected_users: Dict[str, ConnectedUser] = {}
room_users: Dict[str, List[str]] = {}  # roomId -> list of userIds

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except:
                self.disconnect(user_id)

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: str = None):
        if room_id in room_users:
            for user_id in room_users[room_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_text(json.dumps(message))
                    except:
                        self.disconnect(user_id)

manager = ConnectionManager()

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "jennychat_index.html",
        {"request": request}
    )
  


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

# Collaborative chat WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    user_id = None
    try:
        await websocket.accept()
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "user_connect":
                user_id = message["userId"]
                username = message["username"]
                
                # Store user connection
                connected_users[user_id] = ConnectedUser(
                    userId=user_id,
                    username=username,
                    websocket=websocket
                )
                manager.active_connections[user_id] = websocket
                
                # Send available rooms
                rooms_data = []
                for room_id, room in collaborative_rooms.items():
                    rooms_data.append({
                        "id": room.id,
                        "name": room.name,
                        "description": room.description,
                        "private": room.private,
                        "userCount": len(room_users.get(room_id, []))
                    })
                
                await manager.send_personal_message({
                    "type": "rooms_list",
                    "rooms": rooms_data
                }, user_id)
            
            elif message["type"] == "get_rooms":
                if user_id:
                    rooms_data = []
                    for room_id, room in collaborative_rooms.items():
                        rooms_data.append({
                            "id": room.id,
                            "name": room.name,
                            "description": room.description,
                            "private": room.private,
                            "userCount": len(room_users.get(room_id, []))
                        })
                    
                    await manager.send_personal_message({
                        "type": "rooms_list",
                        "rooms": rooms_data
                    }, user_id)
            
            elif message["type"] == "create_room":
                if user_id and user_id in connected_users:
                    room_id = str(uuid.uuid4())
                    room = CollaborativeRoom(
                        id=room_id,
                        name=message["name"],
                        description=message.get("description", ""),
                        private=message.get("private", False),
                        created_at=datetime.now(),
                        created_by=user_id
                    )
                    
                    collaborative_rooms[room_id] = room
                    collaborative_messages[room_id] = []
                    room_users[room_id] = []
                    
                    await manager.send_personal_message({
                        "type": "room_created",
                        "room": {
                            "id": room.id,
                            "name": room.name,
                            "description": room.description,
                            "private": room.private
                        }
                    }, user_id)
            
            elif message["type"] == "join_room":
                if user_id and user_id in connected_users:
                    room_id = message["roomId"]
                    
                    if room_id in collaborative_rooms:
                        # Leave current room if any
                        current_room = connected_users[user_id].currentRoom
                        if current_room and current_room in room_users:
                            if user_id in room_users[current_room]:
                                room_users[current_room].remove(user_id)
                                
                                # Notify others in old room
                                await manager.broadcast_to_room({
                                    "type": "user_left",
                                    "username": connected_users[user_id].username,
                                    "users": [connected_users[uid].username for uid in room_users[current_room] if uid in connected_users]
                                }, current_room, user_id)
                        
                        # Join new room
                        if room_id not in room_users:
                            room_users[room_id] = []
                        
                        if user_id not in room_users[room_id]:
                            room_users[room_id].append(user_id)
                        
                        connected_users[user_id].currentRoom = room_id
                        
                        # Send room data to user
                        room = collaborative_rooms[room_id]
                        messages = collaborative_messages.get(room_id, [])
                        users = [connected_users[uid].username for uid in room_users[room_id] if uid in connected_users]
                        
                        await manager.send_personal_message({
                            "type": "room_joined",
                            "room": {
                                "id": room.id,
                                "name": room.name,
                                "description": room.description,
                                "private": room.private,
                                "created_at": room.created_at.isoformat()
                            },
                            "messages": [
                                {
                                    "id": msg.id,
                                    "userId": msg.userId,
                                    "username": msg.username,
                                    "content": msg.content,
                                    "timestamp": msg.timestamp.isoformat()
                                } for msg in messages[-50:]  # Last 50 messages
                            ],
                            "users": users
                        }, user_id)
                        
                        # Notify others in room
                        await manager.broadcast_to_room({
                            "type": "user_joined",
                            "username": connected_users[user_id].username,
                            "users": users
                        }, room_id, user_id)
            
            elif message["type"] == "leave_room":
                if user_id and user_id in connected_users:
                    current_room = connected_users[user_id].currentRoom
                    if current_room and current_room in room_users:
                        if user_id in room_users[current_room]:
                            room_users[current_room].remove(user_id)
                        
                        connected_users[user_id].currentRoom = None
                        
                        # Notify user
                        await manager.send_personal_message({
                            "type": "room_left"
                        }, user_id)
                        
                        # Notify others in room
                        users = [connected_users[uid].username for uid in room_users[current_room] if uid in connected_users]
                        await manager.broadcast_to_room({
                            "type": "user_left",
                            "username": connected_users[user_id].username,
                            "users": users
                        }, current_room, user_id)
            
            elif message["type"] == "send_message":
                if user_id and user_id in connected_users:
                    current_room = connected_users[user_id].currentRoom
                    if current_room:
                        msg_id = str(uuid.uuid4())
                        collaborative_message = CollaborativeMessage(
                            id=msg_id,
                            roomId=current_room,
                            userId=user_id,
                            username=connected_users[user_id].username,
                            content=message["message"],
                            timestamp=datetime.now()
                        )
                        
                        if current_room not in collaborative_messages:
                            collaborative_messages[current_room] = []
                        
                        collaborative_messages[current_room].append(collaborative_message)
                        
                        # Broadcast message to all users in room
                        await manager.broadcast_to_room({
                            "type": "new_message",
                            "message": {
                                "id": collaborative_message.id,
                                "userId": collaborative_message.userId,
                                "username": collaborative_message.username,
                                "content": collaborative_message.content,
                                "timestamp": collaborative_message.timestamp.isoformat()
                            }
                        }, current_room)
            
            elif message["type"] == "update_username":
                if user_id and user_id in connected_users:
                    connected_users[user_id].username = message["username"]
    
    except WebSocketDisconnect:
        if user_id:
            # Remove user from current room
            if user_id in connected_users:
                current_room = connected_users[user_id].currentRoom
                if current_room and current_room in room_users:
                    if user_id in room_users[current_room]:
                        room_users[current_room].remove(user_id)
                    
                    # Notify others in room
                    users = [connected_users[uid].username for uid in room_users[current_room] if uid in connected_users]
                    await manager.broadcast_to_room({
                        "type": "user_left",
                        "username": connected_users[user_id].username,
                        "users": users
                    }, current_room, user_id)
                
                del connected_users[user_id]
            
            manager.disconnect(user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)