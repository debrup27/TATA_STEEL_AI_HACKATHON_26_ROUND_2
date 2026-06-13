import json
from channels.generic.websocket import AsyncWebsocketConsumer


class TwinStateConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.asset_id = self.scope["url_route"]["kwargs"]["asset_id"]
        self.group_name = f"twins_{self.asset_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def twin_state_changed(self, event):
        await self.send(text_data=json.dumps(event))
