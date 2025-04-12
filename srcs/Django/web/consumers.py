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
    async def initialize_opponent(self, event):
        """Initialize the opponent ID for the WebSocket connection."""
        self.opponent_id = event["opponent_id"]
        print(f"Opponent ID initialized: {self.opponent_id}")
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
    async def opponent_disconnected(self, event):
        """Send a notification to the client about the opponent's disconnection."""
        await self.send(text_data=json.dumps({
            "type": "opponent_disconnected",
            "message": event.get("message", "Your opponent has disconnected."),
        }))
    async def disconnect(self, close_code):
        # Quand l'utilisateur se déconnecte, on le retire du groupe et met à jour son statut
        await self.update_online_status(False)
        if self.opponent_id:
            await self.channel_layer.group_send(
                f"user_{self.opponent_id}",  # Opponent's group name
                {
                    "type": "opponent_disconnected",
                    "message": "Your opponent has disconnected.",  # Optional message
                },
            )
        else:
            print("⚠️ Aucuns adversaires connectés pour envoyer la notification.")
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def update_lists(self, event):
        """Envoie une mise à jour de la liste d'amis au client."""
        await self.send(text_data=json.dumps({
            "type": "update_lists",
            "message": event.get("message", "Votre liste d'amis a été mise à jour."),
            "user_id": event.get("user_id")
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


    async def match_tournament(self, event):
        """Envoie les informations du match aux joueurs."""
        await self.send(text_data=json.dumps({
            "type": "match_tournament",
            "tournament_id": event.get("tournament_id"),
            "is_hosting": event.get("is_hosting"),
            "user": event.get("user"),
            "opponent": event.get("opponent"),  # Envoie les infos de l'adversaire
            "round": event.get("round"),
        }))



    async def notify_join_tournament(self, event):
        await self.send(text_data=json.dumps({
            "type": "notify_join_tournament",
            "tournament_id" : event.get("tournament_id"),
            "is_hosting" : event.get("is_hosting"),
            "message": event.get("message"),
        }))
        
    async def new_tournament(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_tournament",
            "tournament_id" : event.get("tournament_id"),
            "message": event.get("message"),
        }))