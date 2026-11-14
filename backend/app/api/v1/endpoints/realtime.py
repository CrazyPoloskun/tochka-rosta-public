import asyncio
import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_

from app.core.security import decode_token
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.chat import Chat, Message, ChatMember
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


async def _handle_chat_ws(
    websocket: WebSocket,
    chat_id: int,
    token: str = Query(...),
):
    await websocket.accept()

    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return

    # Check permission
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Chat).where(Chat.id == chat_id))
        chat = res.scalar_one_or_none()
        if not chat:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Chat not found")
            return

        is_allowed = user.is_admin or user.id in [chat.investor_id, chat.lab_id]
        if not is_allowed:
            cm_res = await session.execute(
                select(ChatMember).where(
                    and_(ChatMember.chat_id == chat.id, ChatMember.user_id == user.id)
                )
            )
            if cm_res.scalar_one_or_none():
                is_allowed = True

        if not is_allowed:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Forbidden")
            return

    if chat_id not in manager.chat_rooms:
        manager.chat_rooms[chat_id] = set()
    manager.chat_rooms[chat_id].add(websocket)

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


@router.get("/ws/chats/{chat_id}")
@router.get("/realtime/chat/{chat_id}")
async def chat_websocket_info(chat_id: int):
    return {"status": "ok", "service": "chat_websocket", "chat_id": chat_id}


@router.websocket("/ws/chats/{chat_id}")
async def chat_ws_endpoint(
    websocket: WebSocket,
    chat_id: int,
    token: str = Query(...),
):
    await _handle_chat_ws(websocket, chat_id, token)


@router.websocket("/realtime/chat/{chat_id}")
async def chat_realtime_endpoint(
    websocket: WebSocket,
    chat_id: int,
    token: str = Query(...),
):
    await _handle_chat_ws(websocket, chat_id, token)


async def _handle_ticket_ws(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...),
):
    await websocket.accept()

    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ticket = res.scalar_one_or_none()
        if not ticket:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Ticket not found")
            return
        if not user.is_admin and user.id != ticket.user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Forbidden")
            return

    if ticket_id not in manager.ticket_rooms:
        manager.ticket_rooms[ticket_id] = set()
    manager.ticket_rooms[ticket_id].add(websocket)

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


@router.get("/ws/tickets/{ticket_id}")
@router.get("/realtime/ticket/{ticket_id}")
async def ticket_websocket_info(ticket_id: int):
    return {"status": "ok", "service": "ticket_websocket", "ticket_id": ticket_id}


@router.websocket("/ws/tickets/{ticket_id}")
async def ticket_ws_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...),
):
    await _handle_ticket_ws(websocket, ticket_id, token)


@router.websocket("/realtime/ticket/{ticket_id}")
async def ticket_realtime_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...),
):
    await _handle_ticket_ws(websocket, ticket_id, token)


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
