"""
WebSocket consumers for MANAS chat and SANSAD orchestration.

LLMStreamConsumer is a pure ASGI class (no channel layer) to avoid the
Redis read-timeout that fires in channels' await_many_dispatch when the
LLM inference takes longer than the Redis socket idle timeout.

Token delivery path:
  background thread  →  stream_registry.send_to_stream()
      → loop.call_soon_threadsafe(queue.put_nowait, event)
          → _drain() coroutine in the asyncio event loop
              → WebSocket send()

OrchestrationConsumer still uses the Redis channel layer (short-lived
events, no long idle periods).
"""

import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer


# ---------------------------------------------------------------------------
# Pure-ASGI LLM stream consumer — no channel layer
# ---------------------------------------------------------------------------

class LLMStreamConsumer:
    """
    Pure ASGI WebSocket handler. Does NOT use Django Channels' channel layer
    or any Redis subscription, so it never hits the Redis read-timeout.
    """

    @classmethod
    def as_asgi(cls):
        """Return an ASGI callable compatible with channels URLRouter."""
        async def app(scope, receive, send):
            instance = cls()
            await instance(scope, receive, send)
        return app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "websocket":
            return

        from apps.agents.stream_registry import register_stream, unregister_stream

        session_id = scope["url_route"]["kwargs"]["session_id"]

        # Accept the WebSocket handshake
        await send({"type": "websocket.accept"})

        loop = asyncio.get_event_loop()
        queue = register_stream(session_id, loop)

        drain_task = asyncio.ensure_future(self._drain(queue, send))
        listen_task = asyncio.ensure_future(self._listen(receive))

        try:
            # Exit as soon as either side finishes (client disconnect or drain sentinel)
            await asyncio.wait(
                {drain_task, listen_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
        finally:
            drain_task.cancel()
            listen_task.cancel()
            for t in (drain_task, listen_task):
                try:
                    await t
                except (asyncio.CancelledError, Exception):
                    pass
            unregister_stream(session_id)

    async def _drain(self, queue: asyncio.Queue, send):
        """Forward events from the in-process queue to the WebSocket."""
        while True:
            event = await queue.get()
            if event is None:
                break  # sentinel — stream finished
            payload = self._format(event)
            if payload is not None:
                try:
                    await send({"type": "websocket.send", "text": json.dumps(payload)})
                except Exception:
                    break

    async def _listen(self, receive):
        """Wait for the client to disconnect."""
        while True:
            msg = await receive()
            if msg["type"] in ("websocket.disconnect", "websocket.close"):
                break

    @staticmethod
    def _format(event: dict):
        t = event.get("type")
        if t == "started":
            return {"type": "started"}
        if t == "token":
            return {"type": "token", "token": event.get("token", "")}
        if t == "think_token":
            return {"type": "think_token", "token": event.get("token", "")}
        if t == "done":
            return {
                "type": "done",
                "message_id": event.get("message_id"),
                "citations": event.get("citations", []),
                "error": event.get("error"),
            }
        if t == "compacting":
            return {"type": "compacting"}
        if t == "compacted":
            return {"type": "compacted", "compacted_count": event.get("compacted_count", 0)}
        return None


# ---------------------------------------------------------------------------
# Orchestration consumer — keeps channel layer (short-lived events, no idle)
# ---------------------------------------------------------------------------

class OrchestrationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for SANSAD agentic orchestration events.
    URL: /ws/orchestration/<asset_id>/
    """

    async def connect(self):
        self.asset_id = self.scope["url_route"]["kwargs"]["asset_id"]
        self.group_name = f"orchestration_{self.asset_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def orchestration_event(self, event):
        payload = {k: v for k, v in event.items() if k != "type"}
        payload["type"] = event.get("type", "agent.step")
        await self.send(text_data=json.dumps(payload))

    async def agent_step(self, event):
        await self.send(text_data=json.dumps({"type": "agent.step", "data": event.get("data", {})}))

    async def tool_call(self, event):
        await self.send(text_data=json.dumps({"type": "tool.call", "data": event.get("data", {})}))

    async def tool_result(self, event):
        await self.send(text_data=json.dumps({"type": "tool.result", "data": event.get("data", {})}))

    async def worker_done(self, event):
        await self.send(text_data=json.dumps({"type": "worker.done", "data": event.get("data", {})}))

    async def decision_done(self, event):
        await self.send(text_data=json.dumps({"type": "decision.done", "data": event.get("data", {})}))

    async def escalation_alert(self, event):
        await self.send(text_data=json.dumps({"type": "escalation.alert", "data": event}))
