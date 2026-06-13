import json
from channels.generic.websocket import AsyncWebsocketConsumer


class LLMStreamConsumer(AsyncWebsocketConsumer):
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
