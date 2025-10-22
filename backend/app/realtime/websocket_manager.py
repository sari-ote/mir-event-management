import asyncio
from typing import Dict, Set
from fastapi import WebSocket
import json

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, event_id: int):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = set()
        self.active_connections[event_id].add(websocket)

    def disconnect(self, websocket: WebSocket, event_id: int):
        if event_id in self.active_connections:
            self.active_connections[event_id].discard(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast_to_event(self, event_id: int, message: dict):
        if event_id in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[event_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    dead_connections.add(connection)
            for dead_connection in dead_connections:
                self.disconnect(dead_connection, event_id)

websocket_manager = WebSocketManager() 