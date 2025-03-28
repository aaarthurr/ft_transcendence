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

from .models import Utilisateur, FriendRequest, Message

from urllib.parse import urlencode



@login_required
def home(request):
    utilisateur = request.user  # L'utilisateur connecté
    friends = utilisateur.get_friends()  # Utilise la méthode get_friends() pour récupérer les amis

    return render(request, 'web/index.html', {
        'nickname': utilisateur.username,  # Passe le pseudo de l'utilisateur
        'friends': friends,  # Passe la liste des amis au template
        'user_id': utilisateur.id, # Passe l'ID de l'utilisateur au template
        "picture": utilisateur.picture,
        "color1": utilisateur.color_1,
        "color2": utilisateur.color_2,
    })


def login(request):
    return render(request, 'web/login.html')



#API CONNECTION

def generate_state():
    """Generate a random string to protect against CSRF attacks"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

def generate_random_password(length=12):
    """Generate a random password of a given length."""
    characters = string.ascii_letters + string.digits + string.punctuation  # Inclut lettres, chiffres et symboles
    password = ''.join(random.choices(characters, k=length))  # Choisir aléatoirement des caractères
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
    # Your 42 app credentials (from settings.py)
    client_id = settings.CLIENT_ID  # You should have this in your settings
    redirect_uri = settings.REDIRECT_URI  # Same as your registered redirect URI
    scope = "public"  # You can modify the scope depending on what you need
    state = generate_state()  # Generate a state to prevent CSRF attacks
    
    # Construct the authorization URL
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
        {"id": user.id, "username": user.username, "is_online": user.is_online, "image":user.picture, "color1":user.color_1, "color2":user.color_2}
        for user in users
    ]
    
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
                            },
                        )
                        async_to_sync(channel_layer.group_send)(
                            f"user_{to_user.id}",
                            {
                                "type": "update_lists",
                                "message": f"{from_user.username} a accepté votre demande d'ami",
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
                },
            )
            async_to_sync(channel_layer.group_send)(
                f"user_{to_user.id}",
                {
                    "type": "update_lists",
                    "message": f"Nouvelle demande d'ami de {from_user.username}",
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
    return redirect('/login/') 


@login_required
def sendMessage(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)  # Convertit le JSON en dictionnaire Python
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Format JSON invalide."}, status=400)

        to_user_id = data.get("to_user_id")  # Récupère l'ID de l'utilisateur
        message_txt = data.get("message")  # Récupère le message

        if not to_user_id or not message_txt:
            return JsonResponse({"success": False, "message": "Données manquantes."}, status=400)

        from_user = request.user
        channel_layer = get_channel_layer()

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
    return JsonResponse({"status": "error", "message": "Invalid Resquest"}, satus=400)


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
    return JsonResponse({"status": "error", "message": "Invalid Resquest"}, satus=400)


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
    
    # Récupérer tous les utilisateurs avec leur ratio
    players = Utilisateur.objects.annotate(
        ratio=ExpressionWrapper(F('victory') * 1.0 / (F('losses') + 1), output_field=FloatField())
    ).order_by('-ratio', '-victory')
    
    # Déterminer le classement de l'utilisateur
    ranked_players = list(players)
    rank = next((i + 1 for i, p in enumerate(ranked_players) if p.id == user.id), None)
    
    return JsonResponse({
        "success": True,
        "user_id": user.id,
        "victories": user.victory,
        "losses": user.losses,
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

        user = request.user
        user.username = username_given
        user.save()

        update_session_auth_hash(request, user)  # Empêche la déconnexion

        # return JsonResponse({"status": "success", "message": "Username changé avec succès."})
        messages.success(request, "Nom d'utilisateur changé avec succès.")
        return redirect('/')

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
def check_usernames_tournament(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Méthode non autorisée."}, status=405)

    usernames = request.POST.get("usernames", "").split(",")
    if not usernames or usernames == [""]:
        return JsonResponse({"status": "error", "message": "Aucun pseudo fourni."}, status=400)

    existing_users = set(Utilisateur.objects.filter(username__in=usernames).values_list("username", flat=True))
    missing_users = [user for user in usernames if user not in existing_users]

    return JsonResponse({"status": "success", "all_exist": not missing_users, "missing": missing_users})