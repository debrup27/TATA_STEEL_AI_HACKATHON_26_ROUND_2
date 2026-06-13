import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AlertConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            self.group_name = f"alerts_user_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.channel_layer.group_add("alerts_broadcast", self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("alerts_broadcast", self.channel_name)

    async def alert_new(self, event):
        await self.send(text_data=json.dumps(event))
