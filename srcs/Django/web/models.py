from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import Q

class Utilisateur(AbstractUser):
    victory = models.IntegerField(default=0)
    losses  = models.IntegerField(default=0)
    is_online = models.BooleanField(default=False)
    in_tournament = models.BooleanField(default=False)
    tournament_id = models.IntegerField(default=-1)
    tournamentRound = models.IntegerField(default=-1)
    match_history = models.JSONField(default=list, blank=True)  # Store matches as JSON
    picture = models.IntegerField(default=0)
    color_1 = models.CharField(default="#ffffff")
    color_2 = models.CharField(default="#000000")
    
    def add_match(self, opponent_username, result, score_player, score_opponent):
        """
        Adds a new match to the user's match history.
        """
        new_match = {
            "opponent": opponent_username,
            "result": result,
            "score_player": score_player,
            "score_opponent": score_opponent
        }
        self.match_history.append(new_match)
        self.save()

    def get_friends(self):
        """
        Retourne la liste des amis (demandes acceptées).
        """
        accepted_requests = FriendRequest.objects.filter(
            models.Q(from_user=self) | models.Q(to_user=self),
            status='accepted'
        )
        friends = set()
        for request in accepted_requests:
            if request.from_user == self:
                friends.add(request.to_user)  # Ajoute l'ami (to_user)
            else:
                friends.add(request.from_user)  # Ajoute l'ami (from_user)
        return friends

    def get_pending_requests(self):
        """
        Retourne les demandes en attente reçues par l'utilisateur.
        """
        pending_requests = FriendRequest.objects.filter(
            models.Q(from_user=self) | models.Q(to_user=self),
            status='pending'
        )
        friends = set()
        for request in pending_requests:
            if request.from_user == self:
                friends.add(request.to_user)  # Ajoute l'ami (to_user)
            else:
                friends.add(request.from_user)  # Ajoute l'ami (from_user)
        return friends

    def get_blocked_users(self):
        """
        Retourne la liste des utilisateurs bloqués par l'utilisateur.
        """
        blocked_requests = FriendRequest.objects.filter(
            from_user=self,
            status='blocked'
        )
        return [request.to_user for request in blocked_requests]

    def get_messages_with(self, other_user):
        """
        Récupère tous les messages échangés avec un autre utilisateur.
        """
        return Message.objects.filter(
            models.Q(sender=self, receiver=other_user) |
            models.Q(sender=other_user, receiver=self)
        ).order_by("timestamp")
    

class FriendRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),  # En attente
        ('accepted', 'Accepted'),  # Acceptée
        ('rejected', 'Rejected'),  # Refusée
        ('blocked', 'Blocked'),  # Bloqué
    ]

    from_user = models.ForeignKey(
        'Utilisateur', 
        related_name='friend_requests_sent',  # Demandes envoyées
        on_delete=models.CASCADE
    )
    to_user = models.ForeignKey(
        'Utilisateur', 
        related_name='friend_requests_received',  # Demandes reçues
        on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='pending'  # Par défaut, la demande est en attente
    )
    created_at = models.DateTimeField(default=timezone.now)  # Date de création

    class Meta:
        unique_together = ('from_user', 'to_user')  # Évite les doublons de demandes
        verbose_name_plural = "Friend Requests"  # Améliore l'affichage en admin

    def __str__(self):
        return f"{self.from_user.username} -> {self.to_user.username} ({self.status})"

    @staticmethod
    def get_friendship_id(user1, user2):
        """Retourne l'ID de la relation entre deux utilisateurs ou None si inexistante"""
        return FriendRequest.objects.filter(
            Q(from_user=user1, to_user=user2) | Q(from_user=user2, to_user=user1)
        ).values_list("id", flat=True).first()

class Message(models.Model):
    sender = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, related_name="sent_messages"
    )
    receiver = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, related_name="received_messages"
    )
    content = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender.username} to {self.receiver.username} at {self.timestamp}"

class Tournoi(models.Model):
    name = models.CharField(max_length=255)  # Nom du tournoi
    is_launched = models.BooleanField(default=False)
    player1 = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="tournois_p1")  # Organisateur
    players = models.JSONField(default=list)  # Liste des autres joueurs (player2 à player8)
    tournament_id = models.IntegerField(unique=True, null=True, blank=True)
    
    whichRound = models.IntegerField(default=0)

    winnerRound1 = models.JSONField(default=list)  # Liste des autres joueurs (player2 à player8)
    winnerRound2 = models.JSONField(default=list)  # Liste des autres joueurs (player2 à player8)
    winnerLastRound = models.CharField(max_length=255, default='')
    
    looserRound1 = models.JSONField(default=list)  # Liste des autres joueurs (player2 à player8)
    looserRound2 = models.JSONField(default=list)  # Liste des autres joueurs (player2 à player8)
    looserLastRound = models.CharField(max_length=255, default='')

    def get_players(self):
        """Retourne la liste des joueurs en fonction du round actuel."""
        # Si le tournoi est au round 0 (début du tournoi), on prend tous les joueurs
        if self.whichRound == 0:
            player_objects = Utilisateur.objects.filter(id__in=self.players)  # Récupérer les objets utilisateurs
            return [self.player1] + list(player_objects)
        
        # Si le tournoi est au round 1, on récupère les gagnants du round 1
        elif self.whichRound == 1:
            player_objects = Utilisateur.objects.filter(id__in=self.winnerRound1)
            return [self.player1] + list(player_objects)
        
        # Si le tournoi est au round 2, on récupère les gagnants du round 2
        elif self.whichRound == 2:
            player_objects = Utilisateur.objects.filter(id__in=self.winnerRound2)
            return [self.player1] + list(player_objects)
        
        # Si le tournoi est terminé, on retourne le gagnant final
        elif self.whichRound == 3:
            return [Utilisateur.objects.get(id=self.winnerLastRound)]
        
        # Si aucun round n'est défini ou si l'état du tournoi est inconnu, renvoyer une liste vide
        return []

    def start_tournament(self):
        """Vérifie qu'il y a exactement 8 joueurs et commence le tournoi."""
        if len(self.players) != 8:
            raise ValueError("Le tournoi doit avoir exactement 8 joueurs.")
        self.whichRound = 1  # Tournoi commence au round 1
        self.save()

    def start_round2(self):
        """Vérifie qu'il y a exactement 4 joueurs et commence le tournoi."""
        if len(self.players) != 4:
            return False
        self.whichRound = 2  # Tournoi round2
        self.save()
        return True

    def start_round3(self):
        """Vérifie qu'il y a exactement 2 joueurs et commence le tournoi."""
        if len(self.players) != 2:
            return False
        self.whichRound = 3  # Tournoi round2
        self.save()
        return True

    def __str__(self):
        return self.name
