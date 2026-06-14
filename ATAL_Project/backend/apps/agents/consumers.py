import json
from channels.generic.websocket import AsyncWebsocketConsumer


class LLMStreamConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for MANAS chat token streaming (/ws/chat/<session_id>/)."""

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"llm_stream_{self.session_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def llm_token(self, event):
        await self.send(text_data=json.dumps({"type": "token", "token": event["token"]}))

    async def llm_done(self, event):
        await self.send(text_data=json.dumps({"type": "done", "decision_output": event.get("decision_output")}))


class OrchestrationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for SANSAD agentic orchestration events.
    URL: /ws/orchestration/<asset_id>/

    Emits:
      {"type": "agent.step",  "data": {...}}
      {"type": "tool.call",   "data": {"name": "...", "args": {...}}}
      {"type": "tool.result", "data": {"name": "...", "ok": true}}
      {"type": "worker.done", "data": {"worker": "...", "output_preview": "..."}}
      {"type": "decision.done","data": {"risk_level": "...", "urgency_score": 0.0, ...}}
    """

    async def connect(self):
        self.asset_id = self.scope["url_route"]["kwargs"]["asset_id"]
        self.group_name = f"orchestration_{self.asset_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Channel layer event handlers (type uses dots but Django converts to underscores)
    async def orchestration_event(self, event):
        # Forward any orchestration event directly to the WS client
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
