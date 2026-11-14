import asyncio
import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.security import decode_token
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.chat import Chat, Message
from app.models.support import SupportTicket, TicketMessage

router = APIRouter()

# Connection Manager for Chat WebSockets
class ConnectionManager:
    def __init__(self):
        self.chat_rooms: Dict[int, Set[WebSocket]] = {}
        self.ticket_rooms: Dict[int, Set[WebSocket]] = {}

    async def connect_chat(self, chat_id: int, websocket: WebSocket):
        await websocket.accept()
        if chat_id not in self.chat_rooms:
            self.chat_rooms[chat_id] = set()
        self.chat_rooms[chat_id].add(websocket)

    def disconnect_chat(self, chat_id: int, websocket: WebSocket):
        if chat_id in self.chat_rooms:
            self.chat_rooms[chat_id].discard(websocket)
            if not self.chat_rooms[chat_id]:
                del self.chat_rooms[chat_id]

    async def broadcast_chat(self, chat_id: int, message_data: dict):
        if chat_id in self.chat_rooms:
            dead_sockets = set()
            for ws in self.chat_rooms[chat_id]:
                try:
                    await ws.send_text(json.dumps(message_data))
                except Exception:
                    dead_sockets.add(ws)
            for ds in dead_sockets:
                self.chat_rooms[chat_id].discard(ds)

    async def connect_ticket(self, ticket_id: int, websocket: WebSocket):
        await websocket.accept()
        if ticket_id not in self.ticket_rooms:
            self.ticket_rooms[ticket_id] = set()
        self.ticket_rooms[ticket_id].add(websocket)

    def disconnect_ticket(self, ticket_id: int, websocket: WebSocket):
        if ticket_id in self.ticket_rooms:
            self.ticket_rooms[ticket_id].discard(websocket)
            if not self.ticket_rooms[ticket_id]:
                del self.ticket_rooms[ticket_id]

    async def broadcast_ticket(self, ticket_id: int, message_data: dict):
        if ticket_id in self.ticket_rooms:
            dead_sockets = set()
            for ws in self.ticket_rooms[ticket_id]:
                try:
                    await ws.send_text(json.dumps(message_data))
                except Exception:
                    dead_sockets.add(ws)
            for ds in dead_sockets:
                self.ticket_rooms[ticket_id].discard(ds)


manager = ConnectionManager()


async def get_user_from_token(token: str) -> User | None:
    if not token:
        return None
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload["sub"])
    except ValueError:
        return None

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()
        return user


@router.get("/ws/chats/{chat_id}")
async def chat_websocket_info(chat_id: int):
    return {"status": "ok", "service": "chat_websocket", "chat_id": chat_id}


@router.websocket("/ws/chats/{chat_id}")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    chat_id: int,
    token: str = Query(...),
):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Check permission
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Chat).where(Chat.id == chat_id))
        chat = res.scalar_one_or_none()
        if not chat:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        if not user.is_admin and user.id not in [chat.investor_id, chat.lab_id]:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect_chat(chat_id, websocket)

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
            except Exception:
                continue

            msg_type = data.get("type", "message")

            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                # Save to database
                async with AsyncSessionLocal() as session:
                    new_msg = Message(
                        chat_id=chat_id,
                        sender_id=user.id,
                        content=content,
                    )
                    session.add(new_msg)
                    await session.commit()
                    await session.refresh(new_msg)

                    broadcast_data = {
                        "type": "message",
                        "id": new_msg.id,
                        "chat_id": chat_id,
                        "sender_id": user.id,
                        "sender_name": user.full_name or user.organization_name or user.email,
                        "content": new_msg.content,
                        "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
                        "is_mine": False,
                    }
                await manager.broadcast_chat(chat_id, broadcast_data)

            elif msg_type == "typing":
                await manager.broadcast_chat(chat_id, {
                    "type": "typing",
                    "user_id": user.id,
                    "user_name": user.full_name or user.email,
                })

    except WebSocketDisconnect:
        manager.disconnect_chat(chat_id, websocket)
    except Exception:
        manager.disconnect_chat(chat_id, websocket)


@router.get("/ws/tickets/{ticket_id}")
async def ticket_websocket_info(ticket_id: int):
    return {"status": "ok", "service": "ticket_websocket", "ticket_id": ticket_id}


@router.websocket("/ws/tickets/{ticket_id}")
async def ticket_websocket_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...),
):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ticket = res.scalar_one_or_none()
        if not ticket:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        if not user.is_admin and user.id != ticket.user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect_ticket(ticket_id, websocket)

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
            except Exception:
                continue

            msg_type = data.get("type", "message")
            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                async with AsyncSessionLocal() as session:
                    t_msg = TicketMessage(
                        ticket_id=ticket_id,
                        sender_id=user.id,
                        is_admin_reply=user.is_admin,
                        content=content,
                    )
                    session.add(t_msg)
                    # If admin replied, mark ticket in_progress
                    if user.is_admin and ticket.status == "open":
                        t_obj = await session.get(SupportTicket, ticket_id)
                        if t_obj:
                            t_obj.status = "in_progress"
                    await session.commit()
                    await session.refresh(t_msg)

                    broadcast_data = {
                        "type": "ticket_message",
                        "id": t_msg.id,
                        "ticket_id": ticket_id,
                        "sender_id": user.id,
                        "sender_name": "Служба заботы" if user.is_admin else (user.full_name or user.email),
                        "is_admin_reply": user.is_admin,
                        "content": t_msg.content,
                        "created_at": t_msg.created_at.isoformat() if t_msg.created_at else None,
                    }
                await manager.broadcast_ticket(ticket_id, broadcast_data)

            elif msg_type == "typing":
                await manager.broadcast_ticket(ticket_id, {
                    "type": "typing",
                    "user_id": user.id,
                    "user_name": "Куратор поддержки" if user.is_admin else user.full_name,
                })

    except WebSocketDisconnect:
        manager.disconnect_ticket(ticket_id, websocket)
    except Exception:
        manager.disconnect_ticket(ticket_id, websocket)


@router.get("/events/stream")
async def sse_event_stream(token: str = Query(...)):
    user = await get_user_from_token(token)
    if not user:
        return StreamingResponse(iter(["event: error\ndata: Unauthorized\n\n"]), media_type="text/event-stream")

    async def event_generator():
        try:
            # Send initial connected event
            yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'user_id': user.id})}\n\n"
            
            while True:
                await asyncio.sleep(10)
                # Heartbeat and live sync ping
                ping_payload = {
                    "type": "ping",
                    "timestamp": asyncio.get_event_loop().time(),
                }
                yield f"event: ping\ndata: {json.dumps(ping_payload)}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
