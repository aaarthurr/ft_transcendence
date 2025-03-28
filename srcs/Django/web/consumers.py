import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async 
from django.conf import settings

class WebConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['user'].id
        self.group_name = f"user_{self.user_id}"
        print(f"✅ Connexion WebSocket : Utilisateur {self.user_id} ajouté au groupe {self.group_name}")
        # On met à jour l'état en ligne de l'utilisateur
        await self.update_online_status(True)

        # On ajoute l'utilisateur à son groupe spécifique AVANT d'accepter la connexion
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # On accepte la connexion WebSocket
        await self.accept()

    async def receive(self, text_data):
        # Juste pour debugger
        data = json.loads(text_data)
        print(f"📩 Message reçu du client: {data}")
        target_group = data.get("target_group")  # Specify which group to send to
        if target_group:
            await self.channel_layer.group_send(
                target_group,  # Send to the specified group
                {
                    "type": "player_input",
                    "data": data
                }
            )

    async def disconnect(self, close_code):
        # Quand l'utilisateur se déconnecte, on le retire du groupe et met à jour son statut
        await self.update_online_status(False)
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def update_lists(self, event):
        """Envoie une mise à jour de la liste d'amis au client."""
        await self.send(text_data=json.dumps({
            "type": "update_lists",
            "message": event.get("message", "Votre liste d'amis a été mise à jour.")
        }))

    async def update_messages(self, event):
        """Envoie une mise à jour de la liste d'amis au client."""
        await self.send(text_data=json.dumps({
            "type": "update_messages",
            "message": event.get("message", "Vos messages sont mis a jours")
        }))

    async def player_input(self, event):
        data = event['data']
        await self.send(text_data=json.dumps(data))

        # This method receives the event from group_send.
        
        # If you want to send the input only to the host, you could check a property.
        # For example, if your host client sets a flag (or you maintain a mapping in memory),
        # you could do something like:
        # if data.get('target') == 'host' and not self.is_host:
        #     return  # Skip sending if this client is not the host
        
        # Otherwise, broadcast the input to this client.

    async def update_online_status(self, status: bool):
        """Update the user's online status in the database."""
        # We use `Utilisateur` here assuming that's the model you're using for users.
        from .models import Utilisateur  # Import your custom model if it's different
        try:
            user = await sync_to_async(Utilisateur.objects.get)(id=self.user_id)
            user.is_online = status
            await sync_to_async(user.save)()  # Save the status asynchronously
        except Utilisateur.DoesNotExist:
            print(f"⚠️ Utilisateur with ID {self.user_id} not found.")
