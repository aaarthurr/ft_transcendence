import json
import random
import string
import requests

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages  
from django.contrib.auth import login as auth_login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Q, F, FloatField, ExpressionWrapper
from django.utils.dateparse import parse_datetime
from django.contrib.auth import update_session_auth_hash

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from datetime import timedelta
from django.utils import timezone

from .models import Utilisateur, FriendRequest, Message, Tournoi

from urllib.parse import urlencode

import re

from django.conf import settings
import os

# Fonction pour normaliser la chaîne
def normalise_string(string):
    return re.sub(r'[^a-zA-Z]', '', string.lower())

def contient_mot_banni(pseudo):
    try:
        print("comparing")
        # Normaliser le pseudo
        pseudo_normalise = normalise_string(pseudo)

        fichier_bannis = os.path.join(settings.BASE_DIR, 'web', 'ban_word.txt')

        # Lire les mots bannis à partir du fichier
        with open(fichier_bannis, 'r') as file:
            banned_words = file.readlines()

        # Vérifie chaque mot banni dans le pseudo
        for word in banned_words:
            word_normalise = normalise_string(word.strip())

            # Si le mot banni est trouvé dans le pseudo, renvoie True
            if word_normalise in pseudo_normalise.split():
                return True

        # Si aucun mot banni n'est trouvé, renvoie False
        return False
    except FileNotFoundError:
        print("File not found")
        return False  # Si le fichier n'est pas trouvé, retourne False


def home(request):
    if request.user.is_authenticated:
        # L'utilisateur est connecté : on récupère ses données
        friends = request.user.get_friends() if hasattr(request.user, 'get_friends') else []
        return render(request, 'web/index.html', {
            'nickname': request.user.username,
            'friends': friends,
            'user_id': request.user.id,
            'is_authenticated': True,
            "picture": request.user.picture,
            "color1": request.user.color_1,
            "color2": request.user.color_2,
        })
    else:
        # L'utilisateur n'est pas connecté : on affiche le formulaire de login ou le contenu invité
        return render(request, 'web/index.html', {
            'nickname': "Invité",
            'is_authenticated': False  # Indique que l'utilisateur n'est pas connecté
        })
#API CONNECTION

def generate_state():
    """Generate a random string to protect against CSRF attacks"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

def generate_random_password(length=24):
    """Generate a random password of a given length."""
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(random.choices(characters, k=length))
    return password

def generate_unique_username(username):
    """Generate a unique username by appending a number or string if the username already exists."""
    new_username = username
    counter = 1
    while Utilisateur.objects.filter(username=new_username).exists():  # Check if the username already exists
        new_username = f"{username}_{counter}"  # Append a counter to the username
        counter += 1
    return new_username

def redirect_to_42(request):
    client_id = settings.CLIENT_ID  # You should have this in your settings
    redirect_uri = settings.REDIRECT_URI  # Same as your registered redirect URI
    scope = "public"  # You can modify the scope depending on what you need
    state = generate_state()  # Generate a state to prevent CSRF attacks
    
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': scope,
        'state': state,
    }
    print("trying connection ")
    # Encode the URL
    authorize_url = f"https://api.intra.42.fr/oauth/authorize?{urlencode(params)}"
    
    # You can save the state value in session for later validation
    request.session['oauth_state'] = state
    
    print("redirecting-> ", authorize_url)
    return redirect(authorize_url)

def auth_callback(request):
    code = request.GET.get('code')
    print("authentification done -> ", code)
    if not code:
        return redirect('login')  # If no code, redirect to login or show an error

    access_token = get_access_token_from_code(code)
    
    if not access_token:
        print("->  - - - ACCESS TOKEN ERROR !")
        return redirect('login')  # If access token wasn't obtained, handle accordingly

    user_data = get_user_data_from_42(access_token)
    
    if not user_data:
        print("->  - - - USER DATA ERROR !")
        return redirect('login')  # If user data couldn't be retrieved, handle accordingly

    # Extract email from user data
    api_email = user_data.get('email') + ".api_connected"
    print("got data and created email as -> ", api_email)

    try:
        user = Utilisateur.objects.get(email=api_email)
        auth_login(request, user)
    except Utilisateur.DoesNotExist:  # Catch the correct exception (Utilisateur.DoesNotExist)
        unique_username = generate_unique_username(user_data.get('login'))
        random_password = generate_random_password()
        user = Utilisateur(email=api_email, username=unique_username, password=random_password, victory=0, is_online=True)
        user.save()
        # Log the user in after account creation
        auth_login(request, user)  # Log in with 'user' instead of 'utilisateur'

    return redirect('home')  # Or any other page you want to redirect to after login



def get_access_token_from_code(code):
    """Exchange the authorization code for an access token from 42."""
    url = 'https://api.intra.42.fr/oauth/token'
    data = {
        'grant_type': 'authorization_code',
        'client_id': settings.CLIENT_ID, # Remplace par ton client_id
        'client_secret': settings.CLIENT_SECRET,  # Remplace par ton client_secret
        'code': code,  # Le code reçu dans le callback
        'redirect_uri': settings.REDIRECT_URI,  # Assure-toi que c'est la bonne URL de redirection
    }

    # Effectue la requête POST pour échanger le code contre un access token
    response = requests.post(url, data=data)
    
    # Affiche la réponse pour le débogage
    print(f"Token exchange response: {response.status_code} {response.text}")

    if response.status_code == 200:
        access_token = response.json().get('access_token')
        print(f"Access Token: {access_token}")  # Affiche l'access token
        return access_token
    else:
        # Si une erreur se produit, affiche l'erreur pour mieux comprendre
        print(f"Error occurred: {response.text}")
        return None



def get_user_data_from_42(access_token):
    """Fetch user data from the 42 API using the access token."""
    url = 'https://api.intra.42.fr/v2/me'
    headers = {
        'Authorization': f'Bearer {access_token}',
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return None





def inscription(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # ✅ Parse JSON request body
            email_given = data.get('email')
            nickname_given = data.get('nickname')
            password_given = data.get('password')
            confirm_password = data.get('confirm_password')

            print(f"✅ Received data: Email={email_given}, Nickname={nickname_given}, Password={password_given}")

            if contient_mot_banni(nickname_given):
                return JsonResponse({"success": False, "message": "Nickname interdit."}, status=400)
            
            # Ensure all fields are provided
            if not email_given or not nickname_given or not password_given or not confirm_password:
                return JsonResponse({"success": False, "message": "Tous les champs sont requis."}, status=400)

            # Check if username already exists
            if Utilisateur.objects.filter(username=nickname_given).exists():
                return JsonResponse({"success": False, "message": "Username already taken"}, status=400)

            # Check if email already exists
            if Utilisateur.objects.filter(email=email_given).exists():
                return JsonResponse({"success": False, "message": "Email already used"}, status=400)

            # Encrypt the password
            hashed_password = make_password(password_given)

            # Create and save the user
            utilisateur = Utilisateur(
                email=email_given,
                username=nickname_given,
                password=hashed_password,
                victory=0,
                is_online=True
            )
            utilisateur.save()

            # Automatically log in the user
            auth_login(request, utilisateur)

            return JsonResponse({"success": True, "message": "Inscription réussie, vous êtes maintenant connecté."}, status=200)

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON format"}, status=400)
        except Exception as e:
            print(f"❌ Error: {e}")
            return JsonResponse({"success": False, "message": "Une erreur s'est produite."}, status=500)

    return JsonResponse({"success": False, "message": "Invalid request method"}, status=405)




def connexion(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # ✅ Parse JSON request body
            email_given = data.get('email')
            password_given = data.get('password')

            print(f"✅ Received data: Email={email_given}, Password={password_given}")

            # Ensure both fields are provided
            if not email_given or not password_given:
                return JsonResponse({"success": False, "message": "Tous les champs sont requis."}, status=400)

            # Find user by email
            utilisateur = Utilisateur.objects.filter(email=email_given).first()

            if not utilisateur:
                return JsonResponse({"success": False, "message": "Email introuvable."}, status=400)

            # Check password
            if not check_password(password_given, utilisateur.password):
                return JsonResponse({"success": False, "message": "Mauvais mot de passe."}, status=400)

            # Log in the user
            auth_login(request, utilisateur)

            # Mark the user as online
            utilisateur.is_online = True
            utilisateur.save()

            return JsonResponse({"success": True, "message": "Connection réussie, vous êtes maintenant connecté."}, status=200)

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Format JSON invalide."}, status=400)
        except Exception as e:
            print(f"❌ Error: {e}")
            return JsonResponse({"success": False, "message": "Une erreur s'est produite."}, status=500)

    return JsonResponse({"success": False, "message": "Méthode de requête invalide"}, status=405)


def search_users(request):
    query = request.GET.get('q', '')
    current_user = request.user

    # Get IDs of users that blocked the current user
    blocked_by_ids = FriendRequest.objects.filter(
        to_user=current_user,
        status='blocked'
    ).values_list('from_user_id', flat=True)

    if query:
        users = Utilisateur.objects.filter(username__icontains=query)
    else:
        users = Utilisateur.objects.all()

    # Exclude the current user and any user that blocked the current user
    users = users.exclude(id=current_user.id).exclude(id__in=blocked_by_ids)

    user_data = [
        {"id": user.id, "username": user.username, "is_online": user.is_online, "in_tournament": user.in_tournament, "image":user.picture, "color1":user.color_1, "color2":user.color_2}
        for user in users
    ]
    print(user_data)
    return JsonResponse({"users": user_data})

@login_required
def get_user_info(request):
    user_id = request.GET.get("user_id")  # Récupère l'ID depuis les paramètres GET
    if not user_id:
        return JsonResponse({"error": "ID utilisateur manquant"}, status=400)

    try:
        user = Utilisateur.objects.get(id=user_id)
        user_data = {
            "id": user.id,
            "username": user.username,
            "is_online": user.is_online,
            "picture": user.picture,
            "color1": user.color_1,
            "color2": user.color_2,
        }
        return JsonResponse(user_data)
    except Utilisateur.DoesNotExist:
        return JsonResponse({"error": "Utilisateur non trouvé"}, status=404)


#Gestion des demandes d'ami et autre fonctions social

@login_required
def get_user_id(request):
    username = request.GET.get("username")
    user = Utilisateur.objects.filter(username=username).first()

    if user:
        return JsonResponse({"success": True, "user_id": user.id})
    else:
        return JsonResponse({"success": False, "message": "Utilisateur introuvable"}, status=404)


@login_required
def send_friend_request(request):
    if request.method == "POST":
        to_user_id = request.POST.get("to_user_id")
        if not to_user_id:
            return JsonResponse(
                {"success": False, "message": "ID utilisateur manquant."}, status=400
            )

        from_user = request.user

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)
            if from_user == to_user:
                return JsonResponse(
                    {"success": False, "message": "Vous ne pouvez pas vous ajouter vous-même."},
                    status=400,
                )

            existing_request = FriendRequest.objects.filter(
                Q(from_user=from_user, to_user=to_user)
                | Q(from_user=to_user, to_user=from_user)
            ).first()

            channel_layer = get_channel_layer()

            if existing_request:
                if existing_request.status == "pending":
                    if existing_request.from_user == from_user:
                        return JsonResponse(
                            {"success": False, "message": "Demande déjà envoyée."},
                            status=400,
                        )
                    else:
                        # L'autre utilisateur avait déjà envoyé une demande ; on l'accepte
                        existing_request.status = "accepted"
                        existing_request.save()

                        # Notifier les deux utilisateurs via WebSocket (consumer unique update_lists)
                        async_to_sync(channel_layer.group_send)(
                            f"user_{from_user.id}",
                            {
                                "type": "update_lists",
                                "message": f"Vous avez accpetez la demande d'ami de {to_user.username}",
                                "user_id": to_user.id,
                            },
                        )
                        async_to_sync(channel_layer.group_send)(
                            f"user_{to_user.id}",
                            {
                                "type": "update_lists",
                                "message": f"{from_user.username} a accepté votre demande d'ami",
                                "user_id": from_user.id,
                            },
                        )

                        return JsonResponse(
                            {"success": True, "message": "Demande d'amis acceptée !"}
                        )

                return JsonResponse(
                    {"success": False, "message": "Demande déjà traitée."}, status=400
                )

            # Créer une nouvelle demande d'ami (statut "pending")
            FriendRequest.objects.create(from_user=from_user, to_user=to_user, status="pending")
            print(f"📢 WebSocket envoyé à {to_user.id} pour une demande d'ami")

            # Notifier les deux utilisateurs via WebSocket (consumer unique update_lists)
            async_to_sync(channel_layer.group_send)(
                f"user_{from_user.id}",
                {
                    "type": "update_lists",
                    "message": f"Demande d'ami envoyée à {to_user.username}",
                    "user_id": to_user.id,
                },
            )
            async_to_sync(channel_layer.group_send)(
                f"user_{to_user.id}",
                {
                    "type": "update_lists",
                    "message": f"Nouvelle demande d'ami de {from_user.username}",
                    "user_id": from_user.id,
                },
            )

            return JsonResponse(
                {"success": True, "message": "Demande envoyée avec succès !"}
            )

        except Utilisateur.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Utilisateur introuvable."}, status=404
            )

    return JsonResponse(
        {"success": False, "message": "Méthode non autorisée."}, status=405
    )



@login_required
def block_user(request):
    if request.method == "POST":
        to_user_id = request.POST.get("to_user_id")
        if not to_user_id:
            return JsonResponse(
                {"success": False, "message": "ID utilisateur manquant."}, status=400
            )

        from_user = request.user

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)
            channel_layer = get_channel_layer()
            if from_user == to_user:
                return JsonResponse(
                    {"success": False, "message": "Vous ne pouvez pas vous bloquer vous-même."},
                    status=400,
                )

            # Supprimer une éventuelle relation d'amitié existante
            FriendRequest.objects.filter(
                Q(from_user=from_user, to_user=to_user) | Q(from_user=to_user, to_user=from_user)
            ).delete()

            # Vérifier si l'utilisateur est déjà bloqué
            if FriendRequest.objects.filter(from_user=from_user, to_user=to_user).exists():
                return JsonResponse(
                    {"success": False, "message": "Utilisateur déjà bloqué."}, status=400
                )

            # Créer une relation de blocage
            FriendRequest.objects.create(from_user=from_user, to_user=to_user, status="blocked")

            # Notifier les deux utilisateurs via WebSocket (consumer unique update_lists)
            async_to_sync(channel_layer.group_send)(
                f"user_{from_user.id}",
                {
                    "type": "update_lists",
                    "message": f"Vous avez bloqué {to_user.username}",
                    "user_id": to_user.id,
                },
            )
            # Notifier les deux utilisateurs via WebSocket (consumer unique update_lists)
            async_to_sync(channel_layer.group_send)(
                f"user_{to_user.id}",
                {
                    "type": "update_lists",
                    "message": f"Un utilisateur vous a bloqué",
                    "user_id": from_user.id,
                },
            )


            return JsonResponse(
                {"success": True, "message": "Utilisateur bloqué avec succès."}
            )

        except Utilisateur.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Utilisateur introuvable."}, status=404
            )

    return JsonResponse(
        {"success": False, "message": "Méthode non autorisée."}, status=405
    )

@login_required
def unblock_user(request):
    if request.method == "POST":
        to_user_id = request.POST.get("to_user_id")
        if not to_user_id:
            return JsonResponse(
                {"success": False, "message": "ID utilisateur manquant."}, status=400
            )

        from_user = request.user

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)
            if from_user == to_user:
                return JsonResponse(
                    {"success": False, "message": "Vous ne pouvez pas vous bloquer vous-même."},
                    status=400,
                )

            # Supprimer une éventuelle relation d'amitié existante uniquement si le statut est "blocked"
            FriendRequest.objects.filter(
                Q(from_user=from_user, to_user=to_user),
                status="blocked"
            ).delete()

            # Vérifier si l'utilisateur est déjà bloqué
            if FriendRequest.objects.filter(from_user=from_user, to_user=to_user).exists():
                return JsonResponse(
                    {"success": False, "message": "Utilisateur déjà bloqué."}, status=400
                )

            return JsonResponse(
                {"success": True, "message": "Utilisateur bloqué avec succès."}
            )

        except Utilisateur.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Utilisateur introuvable."}, status=404
            )

    return JsonResponse(
        {"success": False, "message": "Méthode non autorisée."}, status=405
    )


@login_required
def is_user_blocked(request):
    if request.method == "GET":
        to_user_id = request.GET.get("to_user_id")
        if not to_user_id:
            return JsonResponse(
                {"success": False, "message": "ID utilisateur manquant."}, status=400
            )

        from_user = request.user

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)

            # Vérifie si from_user a bloqué to_user (uniquement dans ce sens)
            is_blocked = FriendRequest.objects.filter(from_user=from_user, to_user=to_user, status="blocked").exists()

            print("IS BLOCKED", is_blocked)
            return JsonResponse({"success": True, "is_blocked": is_blocked})

        except Utilisateur.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Utilisateur introuvable."}, status=404
            )

    return JsonResponse(
        {"success": False, "message": "Méthode non autorisée."}, status=405
    )

@login_required
def is_user_friend(request):
    if request.method == "GET":
        to_user_id = request.GET.get("to_user_id")
        if not to_user_id:
            return JsonResponse(
                {"success": False, "message": "ID utilisateur manquant."}, status=400
            )

        from_user = request.user

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)

            # Vérifie si une relation d'amitié existe dans les deux sens
            is_friend = FriendRequest.objects.filter(
                Q(from_user=from_user, to_user=to_user, status="accepted") |
                Q(from_user=to_user, to_user=from_user, status="accepted")
            ).exists()

            print("IS FRIEND", is_friend)
            return JsonResponse({"success": True, "is_friend": is_friend})

        except Utilisateur.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Utilisateur introuvable."}, status=404
            )

    return JsonResponse(
        {"success": False, "message": "Méthode non autorisée."}, status=405
    )



@login_required
def showFriendList(request):
    user = request.user  # Utilisateur actuellement connecté
    friends = user.get_friends()  # Appel de la méthode sur l'instance de l'utilisateur

    # Formater la liste des amis pour la réponse JSON
    friends_data = [{"id": friend.id, "username": friend.username} for friend in friends]

    return JsonResponse({"success": True, "friends": friends_data})

@login_required
def showFriendRequestList(request):
    user = request.user  # Utilisateur actuellement connecté
    friends = user.get_pending_requests()  # Appel de la méthode sur l'instance de l'utilisateur

    # Formater la liste des amis pour la réponse JSON
    friends_data = [{"id": friend.id, "username": friend.username} for friend in friends]

    return JsonResponse({"success": True, "friends": friends_data})

@login_required
def logout_view(request):
    logout(request)
    return redirect('/home/') 


@login_required
def sendMessage(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)  # Convertit le JSON en dictionnaire Python
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Format JSON invalide."}, status=400)

        to_user_id = data.get("to_user_id")  # Récupère l'ID de l'utilisateur
        message_txt = data.get("message")  # Récupère le message
        from_user = request.user
        channel_layer = get_channel_layer()

        if not to_user_id or not message_txt:
            return JsonResponse({"success": False, "message": "Données manquantes."}, status=400)

        if len(message_txt) >= 200:
            return JsonResponse({"success": False, "message": "Message trop long."}, status=400)
        
        # Check for the last message from this sender
        last_message = Message.objects.filter(sender=from_user).order_by("-timestamp").first()


        if last_message:         
            time_diff = timezone.now() - last_message.timestamp
            min_interval = timedelta(milliseconds=500)  # Adjust as needed

            if time_diff < min_interval:
                return JsonResponse({"success": False, "message": "Please do not spam chat."})


        try:
            to_user = Utilisateur.objects.get(id=to_user_id)
            if from_user == to_user:
                return JsonResponse(
                    {"success": False, "message": "Vous ne pouvez pas envoyer un message à vous-même."},
                    status=400,
                )

            # Créer un message
            Message.objects.create(sender=from_user, receiver=to_user, content=message_txt)

                        # Notifier les deux utilisateurs via WebSocket (consumer unique update_lists)
            async_to_sync(channel_layer.group_send)(
                f"user_{from_user.id}",
                {
                    "type": "update_messages",
                    "message": "Les messages on etait mis a jours.",
                },
            )
            async_to_sync(channel_layer.group_send)(
                f"user_{to_user.id}",
                {
                    "type": "update_messages",
                    "message": "Les messages on etait mis a jours",
                },
            )

            return JsonResponse({"success": True, "message": "Message envoyé."})

        except Utilisateur.DoesNotExist:
            return JsonResponse({"success": False, "message": "Utilisateur introuvable."}, status=404)

    return JsonResponse({"success": False, "message": "Méthode non autorisée."}, status=405)



@login_required
def getMessages(request):
    if request.method == "GET":
        from_user = request.user
        to_user_id = request.GET.get("to_user_id")
        timestamp = request.GET.get("timestamp")  # Optionnel, pour récupérer les messages après un certain temps

        if not to_user_id:
            return JsonResponse({"success": False, "message": "ID du destinataire manquant."}, status=400)

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)
            
            # Récupération des messages échangés
            messages = Message.objects.filter(
                Q(sender=from_user, receiver=to_user) |
                Q(sender=to_user, receiver=from_user)
            )

            # Filtrer les messages à partir d'un timestamp donné
            if timestamp:
                timestamp = parse_datetime(timestamp)
                if timestamp:
                    messages = messages.filter(timestamp__gt=timestamp)

            # Trier par date et limiter aux 100 plus récents
            messages = messages.order_by("timestamp")[:100]

            # Construire la réponse JSON
            messages_data = [
                {
                    "id": msg.id,
                    "sender": msg.sender.id,
                    "receiver": msg.receiver.id,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                }
                for msg in messages
            ]

            return JsonResponse({"success": True, "messages": messages_data})

        except Utilisateur.DoesNotExist:
            return JsonResponse({"success": False, "message": "Utilisateur introuvable."}, status=404)

    return JsonResponse({"success": False, "message": "Méthode non autorisée."}, status=405)


@login_required
def increment_victory(request):
    if request.method == "POST":
        try:
            user = request.user
            user.victory += 1
            user.save()

            
            return JsonResponse({"status": "success", "victory": user.victory})
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)})
    
    return JsonResponse({"status": "error", "message": "Invalid Request"}, status=400)



@login_required
def increment_losses(request):
    if request.method == "POST":
        try:
            user = request.user
            user.losses += 1
            user.save()
            

            return JsonResponse({"status": "success", "losses": user.losses})
        
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)})
    
    return JsonResponse({"status": "error", "message": "Invalid Request"}, status=400)



@login_required
def get_player_stats(request):
    user_id = request.GET.get("user_id")  # Récupérer l'ID depuis la requête
    
    if not user_id:
        return JsonResponse({"success": False, "error": "User ID is required"}, status=400)
    
    try:
        user = Utilisateur.objects.get(id=user_id)  # Récupérer l'utilisateur par ID
    except ObjectDoesNotExist:
        return JsonResponse({"success": False, "error": "User not found"}, status=404)
    
    # Calcul du ratio victoire/défaite en évitant la division par zéro
    user_ratio = user.victory / (user.losses + 1)
    
    # On calcule le nouveau score = ratio * victories
    # ranking_metric = (victory / (losses + 1)) * victory
    players = Utilisateur.objects.annotate(
        ratio=ExpressionWrapper(F('victory') * 1.0 / (F('losses') + 1), output_field=FloatField()),
        ranking_metric=ExpressionWrapper((F('victory') * 1.0 / (F('losses') + 1)) * F('victory'), output_field=FloatField())
    ).order_by('-ranking_metric', '-victory')
    
    # Déterminer le classement de l'utilisateur dans le ranking_metric
    ranked_players = list(players)
    rank = next((i + 1 for i, p in enumerate(ranked_players) if p.id == user.id), None)
    
    return JsonResponse({
        "success": True,
        "user_id": user.id,
        "victories": user.victory,
        "losses": user.losses,
        "ratio": user_ratio,
        "rank": rank
    })


@login_required
def get_user_status(request):
    if request.method == "GET":
        to_user_id = request.GET.get("to_user_id")  # ✅ Get target user ID from request
        if not to_user_id:
            return JsonResponse(
                {"success": False, "message": "ID utilisateur manquant."}, status=400
            )

        try:
            to_user = Utilisateur.objects.get(id=to_user_id)
            return JsonResponse({"success": True, "user_status": to_user.is_online})

        except Utilisateur.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Utilisateur introuvable."}, status=404
            )

@login_required
def get_match_history(request):
    user = request.user
    user.match_history
    print(user.match_history) 
    return JsonResponse({"match_history": user.match_history}, status=200)

@login_required
def add_match_history(request):
    if request.method == "POST":
        user = request.user
        try:
            data = json.loads(request.body)  # Convertit le JSON en dictionnaire Python
            opponent_username = data.get('opponent_username')
            result = data.get('result')
            score_player = data.get('score_player')
            score_opponent = data.get('score_opponent')
            user.add_match(opponent_username=opponent_username, result=result, score_player=score_player, score_opponent=score_opponent)
            return JsonResponse({"success": True, "message": "Match added successfully."}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON format."}, status=400)
        
    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)


@login_required
def opponent_disconnected(user_id):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "opponent_disconnected",
            "player_id": user_id,
        },
    )

@login_required
def connect_match(request):
    if request.method == 'POST':
        user_id = request.POST.get('user_id')  # Get the opponent's user ID from the request
        user = request.user

        if not user_id:  # Check if the user_id is missing
            return JsonResponse({"success": False, "message": "Opponent ID is missing."}, status=400)

        # Notify the WebSocket consumer to initialize the opponent ID
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user.id}",
            {
                "type": "initialize_opponent",
                "opponent_id": user_id,  # Send the opponent's ID to the WebSocket consumer
            },
        )

        return JsonResponse({"success": True, "message": "Match connected successfully."})

    # If the request method is not POST, return an error response
    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)

@login_required
def change_password(request):
    if request.method == 'POST':
        password_given = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')

        if password_given != confirm_password:
            return JsonResponse({"status": "error", "message": "Mdp diff."}, status=400)

        if not password_given:
            return JsonResponse({"status": "error", "message": "Le mot de passe ne peut pas être vide."}, status=400)

        user = request.user
        user.password = make_password(password_given)
        user.save()
    
        logout(request)  # Déconnexion de l'utilisateur
        
        return JsonResponse({"status": "success", "redirect": "/login/"})  # JSON propre
    
    return JsonResponse({"status": "error", "message": "Méthode non autorisée."}, status=405)



@login_required
def change_username(request):
    if request.method == 'POST':
        username_given = request.POST.get('username')
        confirm_username = request.POST.get('confirm_username')

        if username_given != confirm_username:
            return JsonResponse({"status": "error", "message": "Username diff."}, status=400)

        if not username_given:
            return JsonResponse({"status": "error", "message": "Le username ne peut pas être vide."}, status=400)

        if contient_mot_banni(username_given):
            return JsonResponse({"success": False, "message": "Nickname interdit."}, status=400)

        # Check if username already exists
        if Utilisateur.objects.filter(username=username_given).exists():
            return JsonResponse({"success": False, "message": "Username already taken"}, status=400)

        user = request.user
        user.username = username_given
        user.save()

        update_session_auth_hash(request, user)  # Empêche la déconnexion

        # return JsonResponse({"status": "success", "message": "Username changé avec succès."})
        messages.success(request, "Nom d'utilisateur changé avec succès.")
        return redirect('/home/')

    return JsonResponse({"status": "error", "message": "Méthode non autorisée."}, status=405)



@login_required
def update_color_1(request):
    if request.method == "POST":
        color_1 = request.POST.get("color_1")

        if not color_1 or not color_1.startswith("#") or len(color_1) not in [4, 7]:
            return JsonResponse({"status": "error", "message": "Format de couleur invalide."}, status=400)

        user = request.user
        user.color_1 = color_1
        user.save()

        return JsonResponse({"status": "success", "message": "Couleur 1 mise à jour.", "color_1": color_1})

    return JsonResponse({"status": "error", "message": "Méthode non autorisée."}, status=405)


@login_required
def update_color_2(request):
    if request.method == "POST":
        color_2 = request.POST.get("color_2")

        if not color_2 or not color_2.startswith("#") or len(color_2) not in [4, 7]:
            return JsonResponse({"status": "error", "message": "Format de couleur invalide."}, status=400)

        user = request.user
        user.color_2 = color_2
        user.save()

        return JsonResponse({"status": "success", "message": "Couleur 2 mise à jour.", "color_2": color_2})

    return JsonResponse({"status": "error", "message": "Méthode non autorisée."}, status=405)


@login_required
def update_picture(request):
    if request.method == "POST":
        picture = request.POST.get("picture")

        if not picture:
            return JsonResponse({"status": "error", "message": "Image invalide."}, status=400)

        user = request.user
        user.picture = picture
        print(picture)
        user.save()

        return JsonResponse({"status": "success", "message": "Image mise à jour.", "picture": picture})

    return JsonResponse({"status": "error", "message": "Méthode non autorisée."}, status=405)


@login_required
def get_all_tournaments(request):
    try:
        tournaments = Tournoi.objects.all()  # Récupérer tous les tournois
        tournament_data = [{"tournament_id": tournoi.tournament_id, "name": tournoi.name} for tournoi in tournaments]
        return JsonResponse({"success": True, "tournaments": tournament_data})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
    


@login_required
def create_tournament(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user = request.user

            existing_tournament = Tournoi.objects.filter(player1=user).first()
            if existing_tournament:
                return JsonResponse({
                    "success": True,
                    "tournament_id": existing_tournament.tournament_id,
                    "organizer": user.username,
                    "error": "Vous avez déjà créé un tournoi."
                })

            if user.in_tournament:
                return JsonResponse({"success": False, "error": "Vous êtes déjà inscrit à un tournoi."})



            tournoi = Tournoi.objects.create(
                name=data["name"] + user.username,
                is_launched=False,
                player1=user,
                tournament_id=user.id
            )

            user.in_tournament = True
            user.tournament_id = tournoi.tournament_id
            user.tournamentRound = 0
            user.save()

            channel_layer = get_channel_layer()

            all_users = Utilisateur.objects.all().values_list('id', flat=True)

            for user_id in all_users:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user_id}",
                    {
                        "type": "new_tournament",
                        "tournament_id": tournoi.tournament_id,
                        "message": "is_created",
                    },
                )

            return JsonResponse({
                "success": True,
                "tournament_id": tournoi.tournament_id,
                "organizer": user.username
            })

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Invalid request"})



@login_required
def delete_tournament(request):
    if request.method == 'POST':
        try:
            tournament_id = request.user.id
            user = request.user
            user_id = request.user.id

            # Récupérer le tournoi où l'utilisateur est l'organisateur
            tournoi = Tournoi.objects.filter(player1=request.user).first()

            if not tournoi:
                return JsonResponse({"success": False, "error": "Tournoi non trouvé ou vous n'êtes pas l'organisateur."})

            if tournoi.player1.id != user_id:
                return JsonResponse({"success": False, "error": "Vous n'êtes pas l'organisateur de ce tournoi."})

            # Récupérer tous les joueurs du tournoi
            player_ids = tournoi.players  # JSONField (liste des IDs)
            players = Utilisateur.objects.filter(id__in=player_ids)

            # Réinitialiser les valeurs liées au tournoi pour chaque joueur
            channel_layer = get_channel_layer()

            async_to_sync(channel_layer.group_send)(
                f"user_{tournoi.player1.id}",
                {
                    "type": "notify_join_tournament",
                    "tournament_id" : tournoi.player1.tournament_id,
                    "is_hosting" : True,
                    "message": "is_destroyed",
                },
             )          
            if tournoi.players:
                player_ids = tournoi.players
                players = Utilisateur.objects.filter(id__in=player_ids)

                # Réinitialiser les valeurs liées au tournoi pour chaque joueur
                for player in players:
                    new_player_display(player, "is_destroyed")
                    player.in_tournament = False
                    player.tournament_id = -1
                    player.tournamentRound = -1
                    player.save()

            request.user.in_tournament = False
            request.user.tournament_id = -1
            request.user.tournamentRound = -1
            request.user.save()
            all_users = Utilisateur.objects.all().values_list('id', flat=True)
            for user_id in all_users:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user_id}",
                    {
                        "type": "new_tournament",
                        "tournament_id": tournoi.tournament_id,
                        "message": "is_created",
                    },
                )

            # Supprimer le tournoi
            tournoi.delete()
            return JsonResponse({"success": True})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Invalid request"})



def new_player_display(player, message):
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
        f"user_{player.id}",
        {
            "type": "notify_join_tournament",
            "tournament_id" : player.tournament_id,
            "is_hosting" : False,
            "message": message,
        },
    )


@login_required
def join_tournament(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user = request.user
            tournament_id = data["tournament_id"]  # data.get("tournament_id")

            # Vérifie si le tournoi existe
            tournoi = Tournoi.objects.filter(tournament_id=tournament_id).first()
            if not tournoi:
                return JsonResponse({"success": False, "error": "Tournoi introuvable."})

            # Vérifie si le joueur est déjà inscrit
            all_players = tournoi.get_players()
            if user in all_players:
                return JsonResponse({"success": True, "tournament_id": tournoi.tournament_id, "organizer": user.username, "error": "Vous avez déjà rejoint le tournoi."})
            if user.in_tournament:
                return JsonResponse({"success": False, "error": "Vous êtes déjà inscrit à un tournoi."})

            # Vérifie si le tournoi est plein (max 8 joueurs)
            if len(all_players) >= 8:
                return JsonResponse({"success": False, "error": "Le tournoi est complet."})
            if tournoi.is_launched:
                return JsonResponse({"success": False, "error": "Le tournoi est deja en cours."})


            # Ajoute le joueur à la liste
            tournoi.players.append(user.id)
            tournoi.save()

            user.in_tournament = True
            user.tournament_id = tournament_id
            user.tournamentRound = 0
            user.save()

# websocket afficher a tout le monde le new player dans le tournament
            player_ids = tournoi.players
            players = Utilisateur.objects.filter(id__in=player_ids)

            # Réinitialiser les valeurs liées au tournoi pour chaque joueur
            for player in players:
                new_player_display(player, "tournament joined")
                player.save()

            channel_layer = get_channel_layer()

            async_to_sync(channel_layer.group_send)(
                f"user_{tournoi.player1.id}",
                {
                    "type": "notify_join_tournament",
                    "tournament_id" : tournoi.player1.tournament_id,
                    "is_hosting" : True,
                    "message": "tournament joined",
                },
             )

            return JsonResponse({"success": True, "message": f"{user.username} a rejoint le tournoi {tournoi.name}.", "tournament_id": tournoi.tournament_id, "organizer": user.username})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Invalid request"})

@login_required
def quitTournament(request):
    if request.method == "POST":
        try:
            user = request.user
            tournament_id = user.tournament_id  # data.get("tournament_id")

            # Vérifie si le tournoi existe
            tournoi = Tournoi.objects.filter(tournament_id=tournament_id).first()
            if not tournoi:
                return JsonResponse({"success": False, "error": "Tournoi introuvable."})

            # Vérifie si le joueur est déjà inscrit
            all_players = tournoi.get_players()
            if user not in all_players:
                return JsonResponse({"success": True, "tournament_id": tournoi.tournament_id, "organizer": user.username, "error": "Vous n'etes pas dans ce tournoi."})

            # Vérifie si le tournoi est plein (max 8 joueurs)

            # retire le joueur à la liste
            tournoi.players.remove(user.id)
            tournoi.save()

            user.in_tournament = False
            user.tournament_id = -1
            user.tournamentRound = -1
            user.save()

# websocket afficher a tout le monde le new player dans le tournament

            channel_layer = get_channel_layer()

            async_to_sync(channel_layer.group_send)(
                f"user_{tournoi.player1.id}",
                {
                    "type": "notify_join_tournament",
                    "tournament_id" : tournoi.player1.tournament_id,
                    "is_hosting" : True,
                    "message": "tournament quit",
                },
             )
            
           
            if not tournoi.players:
                return JsonResponse({"success": True, "message": f"{user.username} a quitter le tournoi {tournoi.name}.", "tournament_id": tournoi.tournament_id, "organizer": user.username})
            player_ids = tournoi.players
            players = Utilisateur.objects.filter(id__in=player_ids)

            # Réinitialiser les valeurs liées au tournoi pour chaque joueur
            for player in players:
                print(player)
                new_player_display(player, "tournament quit")


            return JsonResponse({"success": True, "message": f"{user.username} a quitter le tournoi {tournoi.name}.", "tournament_id": tournoi.tournament_id, "organizer": user.username})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Invalid request"})


@login_required
def get_tournament_players(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            tournament_id = data.get("tournament_id")  # Récupérer l'ID du tournoi

            # Vérifie si le tournoi existe
            tournoi = Tournoi.objects.get(tournament_id=tournament_id)

            # Récupère les joueurs dans l'ordre (organisateur en premier)
            players = tournoi.get_players()
            player_names = [player.username for player in players]  # Liste des usernames

            return JsonResponse({"success": True, "players": player_names})

        except Tournoi.DoesNotExist:
            return JsonResponse({"success": False, "error": "Tournoi introuvable"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)


def match1v1_tournament(player1, player2, tournament_id):
    channel_layer = get_channel_layer()

    p1 = Utilisateur.objects.filter(username=player1).first()
    p2 = Utilisateur.objects.filter(username=player2).first()

    if not p1 or not p2:
        return  # Sécurité si un joueur n'existe pas

    p1_data = {
        "id": p1.id,
        "username": p1.username,
        "email": p1.email,  # Ajoute les infos nécessaires
    }
    p2_data = {
        "id": p2.id,
        "username": p2.username,
        "email": p2.email,
    }

    async_to_sync(channel_layer.group_send)(
        f"user_{p1.id}",
        {
            "type": "match_tournament",
            "tournament_id": tournament_id,
            "is_hosting": "true",
            "user": p1_data,
            "opponent": p2_data,  # Infos de l'adversaire
            "round": p1.tournamentRound,
        },
    )
    async_to_sync(channel_layer.group_send)(
        f"user_{p2.id}",
        {
            "type": "match_tournament",
            "tournament_id": tournament_id,
            "is_hosting": "false",
            "user": p2_data,
            "opponent": p1_data,  # Infos de l'adversaire
            "round": p2.tournamentRound,
        },
    )


def launch_tournament_four(tournoi, players, player_names):

    try:

        for player in players:
            tournoi.winnerRound1.append(player.id)  # Ajoute l'ID du joueur
            tournoi.winnerRound1 = list(tournoi.winnerRound1)  # Force Django à voir le changement
            tournoi.save()

        tournoi.whichRound = 1
        tournoi.save()

        for player in players:
            player.in_tournament = 1
            player.tournament_id = tournoi.tournament_id
            player.tournamentRound = 1
            player.save()

        match1v1_tournament(player_names[0], player_names[1], tournoi.tournament_id)
        match1v1_tournament(player_names[2], player_names[3], tournoi.tournament_id)


        return JsonResponse({"success": True, "message": "FIN DE LA VUE SECONDROUND DES GAGNANT"})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})



@login_required
def launch_tournament(request):
    if request.method == "POST":
        try:
            tournament_id = request.user.id  # Récupérer l'ID du tournoi

            # Vérifie si le tournoi existe
            tournoi = Tournoi.objects.get(tournament_id=tournament_id)

            # Récupère les joueurs dans l'ordre (organisateur en premier)
            players = tournoi.get_players()
            player_names = [player.username for player in players]  # Liste des usernames
            
            # Vérifie qu'il y a assez de joueurs pour éviter les erreurs d'index
            if len(players) == 4:
                tournoi.is_launched=True
                tournoi.save()
                launch_tournament_four(tournoi, players, player_names)
                return JsonResponse({"success": True, "players": player_names, "message": "FIN DE LA VIEW LAUNCH_TOURNAMENTfour"})
            if len(players) < 8:
                return JsonResponse({"success": False, "error": "Pas assez de joueur"})
            
            
            tournoi.is_launched=True
            tournoi.save()
            
            match1v1_tournament(players[0], players[1], tournament_id)
            
            match1v1_tournament(players[2], players[3], tournament_id)
            
            match1v1_tournament(players[4], players[5], tournament_id)
            
            match1v1_tournament(players[6], players[7], tournament_id)

            return JsonResponse({"success": True, "players": player_names, "message": "FIN DE LA VIEW LAUNCH_TOURNAMENT"})

        except Tournoi.DoesNotExist:
            return JsonResponse({"success": False, "error": "Tournoi introuvable"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)




@login_required
def secondRound(request):
    """Ajoute le joueur gagnant au round suivant et vérifie s'il est prêt."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)

    try:
        user = request.user
        data = json.loads(request.body)
        is_winner = data.get("is_winner")

        tournoi = Tournoi.objects.filter(tournament_id=user.tournament_id).first()
        if not tournoi:
            return JsonResponse({"success": False, "error": "Tournoi introuvable"})

        if is_winner == 0:
            print(f"Je suis {user.username}, le perdant.")
            return JsonResponse({"success": False, "message": "YOU SHOULD NOT BE HERE."})


        tournoi.winnerRound1.append(user.id)  # Ajoute l'ID du joueur
        tournoi.winnerRound1 = list(tournoi.winnerRound1)  # Force Django à voir le changement
        tournoi.save()  # Sauvegarde en base

        user.tournamentRound += 1
        user.save()


        if len(tournoi.winnerRound1) < 4:
            return JsonResponse({"success": True, "message": "Veuillez attendre que tout le monde finissent sa partie.", "waiting": True})

        

        tournoi.whichRound += 1
        tournoi.save()

        if len(tournoi.winnerRound1) >= 4:
            p1 = Utilisateur.objects.filter(id=tournoi.winnerRound1[0]).first()
            p2 = Utilisateur.objects.filter(id=tournoi.winnerRound1[1]).first()
            p3 = Utilisateur.objects.filter(id=tournoi.winnerRound1[2]).first()
            p4 = Utilisateur.objects.filter(id=tournoi.winnerRound1[3]).first()
            match1v1_tournament(p1.username, p2.username, tournoi.tournament_id)
            match1v1_tournament(p3.username, p4.username, tournoi.tournament_id)
        else:
            p1 = p2 = p3 = p4 = None  # Évite une IndexError si la liste est trop courte

        return JsonResponse({"success": True, "message": "FIN DE LA VUE SECONDROUND DES GAGNANT", "waiting": False})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})



        


@login_required
def secondRoundLoose(request):
    """Ajoute le joueur gagnant au round suivant et vérifie s'il est prêt."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)

    try:
        user = request.user
        data = json.loads(request.body)

        tournoi = Tournoi.objects.filter(tournament_id=user.tournament_id).first()
        if not tournoi:
            return JsonResponse({"success": False, "error": "Tournoi introuvable"})




        tournoi.looserRound1.append(user.id)
        if user.id in tournoi.players:
            tournoi.players.remove(user.id)
        tournoi.save()

        if user.tournament_id != user.id:
            user.tournamentRound = -1
            user.tournament_id = -1
            user.in_tournament = False
            user.save()
  
        return JsonResponse({"success": True, "message": "FIN DE LA SECONDEROUND LOOSER VIEW"})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})



@login_required
def lastRound(request):
    """Ajoute le joueur gagnant au round suivant et vérifie s'il est prêt."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)

    try:
        user = request.user
        data = json.loads(request.body)
        is_winner = data.get("is_winner")

        tournoi = Tournoi.objects.filter(tournament_id=user.tournament_id).first()
        if not tournoi:
            return JsonResponse({"success": False, "error": "Tournoi introuvable"})

        if is_winner == 0:
            print(f"Je suis {user.username}, le perdant.")
            return JsonResponse({"success": False, "message": "YOU SHOULD NOT BE HERE."})


        tournoi.winnerRound2.append(user.id)  # Ajoute l'ID du joueur
        tournoi.winnerRound2 = list(tournoi.winnerRound2)  # Force Django à voir le changement
        tournoi.save()  # Sauvegarde en base


        user.tournamentRound += 1
        user.save()

        if len(tournoi.winnerRound2) < 2:
            return JsonResponse({"success": True, "message": "Veuillez attendre que tout le monde finissent sa partie.", "waiting": True,})
        

        tournoi.whichRound += 1
        tournoi.save()

        if len(tournoi.winnerRound2) >= 2:
            p1 = Utilisateur.objects.filter(id=tournoi.winnerRound2[0]).first()
            p2 = Utilisateur.objects.filter(id=tournoi.winnerRound2[1]).first()
            match1v1_tournament(p1.username, p2.username, tournoi.tournament_id)
        else:
            p1, p2 = None, None



        return JsonResponse({"success": True, "message": "FIN DE LA VIEW LAST ROUND FINISH", "waiting": False})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})



@login_required
def lastRoundLoose(request):
    """Ajoute le joueur gagnant au round suivant et vérifie s'il est prêt."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)

    try:
        user = request.user
        data = json.loads(request.body)
        is_winner = data.get("is_winner")

        tournoi = Tournoi.objects.filter(tournament_id=user.tournament_id).first()
        if not tournoi:
            return JsonResponse({"success": False, "error": "Tournoi introuvable"})



        tournoi.looserRound1.append(user.id)
        if user.id in tournoi.players:
            tournoi.players.remove(user.id)
        tournoi.save()

        if user.tournament_id != user.id:
            user.tournamentRound = -1
            user.tournament_id = -1
            user.in_tournament = False
            user.save()

        return JsonResponse({"success": True, "message": "FIN DE LA VIEW LASTROUNDLOOSE "})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

@login_required
def finishTournament(request):
    """Ajoute le joueur gagnant au round suivant et vérifie s'il est prêt."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non autorisée"}, status=405)

    try:
        user = request.user
        data = json.loads(request.body)
        is_winner = data.get("is_winner")

        # Récupère le tournoi basé sur l'ID du tournoi de l'utilisateur
        if is_winner == 0:
            return JsonResponse({"success": True, "message": "TOURNOIS TERMINE NORMALEMENT"})
        tournoi = Tournoi.objects.filter(tournament_id=user.tournament_id).first()
        if not tournoi:
            return JsonResponse({"success": True, "error": "Tournoi fini ou introuvable"})

        # Sauvegarde l'ID du tournoi avant de supprimer
        tournament_id = tournoi.tournament_id

        # Mise à jour des gagnants et perdants
        if is_winner == 1:
            # Ajouter le username du gagnant à winnerLastRound, séparé par une virgule
            if tournoi.winnerLastRound:
                tournoi.winnerLastRound += "," + user.username  # Si la chaîne existe déjà, on y ajoute le username
            else:
                tournoi.winnerLastRound = user.username  # Sinon, on initialise la chaîne avec le username

        # Sauvegarder les changements dans la base de données
        tournoi.save()


        # Récupérer tous les joueurs du tournoi
        player_ids = tournoi.players  # JSONField (liste des IDs)
        players = Utilisateur.objects.filter(id__in=player_ids)
        host = tournoi.player1

        # Réinitialiser les valeurs liées au tournoi pour chaque joueur
        for player in players:
            new_player_display(player, "is_destroyed")
            player.in_tournament = False
            player.tournament_id = -1
            player.tournamentRound = -1
            player.save()

        # Réinitialiser l'hôte
        new_player_display(host, "is_destroyed")
        host.in_tournament = False
        host.tournament_id = -1
        host.tournamentRound = -1
        host.save()

        # Supprimer le tournoi
        tournoi.delete()

        # Envoyer la notification aux autres utilisateurs
        channel_layer = get_channel_layer()
        all_users = Utilisateur.objects.all().values_list('id', flat=True)
        for user_id in all_users:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    "type": "new_tournament",
                    "tournament_id": tournament_id,
                    "message": "is_destroyed",  # Indiquer que le tournoi est détruit
                },
            )

        # Réinitialiser le gagnant (s'il est toujours dans la liste des joueurs)
        if request.user.id not in player_ids:
            request.user.in_tournament = False
            request.user.tournament_id = -1
            request.user.tournamentRound = -1
            request.user.save()

        return JsonResponse({"success": True, "message": "TOURNOIS TERMINE NORMALEMENT"})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
