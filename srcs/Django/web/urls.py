from django.urls import path
from django.conf import settings
from . import views

urlpatterns = [
    path('', views.home, name='home'),  # Route pour afficher la vue `home`
    path('login/', views.login, name='login'),  # Route pour afficher la vue `login`
    path('inscription/', views.inscription, name='inscription'), #Route pour commencer l'inscription
    path('connexion/', views.connexion, name='connexion'),


	path('change_password/', views.change_password, name='change_password'),
	path('change_username/', views.change_username, name='change_username'),

    path('update/color_1/', views.update_color_1, name='update_color_1'),
    path('update/color_2/', views.update_color_2, name='update_color_2'),
    path('update/picture/', views.update_picture, name='update_picture'),


    path('search_users/', views.search_users, name='search_users'), #pour search bar

    path("send-friend-request/", views.send_friend_request, name="send_friend_request"), #pour la demande d'ami
    path("blockUser/", views.block_user, name="blockUser"),
    path("unblockUser/", views.unblock_user, name="unblockUser"),

    path("isUserBlocked/", views.is_user_blocked, name="isUserBlocked"),
    path("isUserFriend/", views.is_user_friend, name="isUserFriend"),
    path("get-user-id/", views.get_user_id, name="get_user_id"), #pour recup l'id de la personne a ajouter selon son pseudo

    path("showFriendList/", views.showFriendList, name="showFriendList"), #pour recup la liste d'amis
    path("showFriendRequestList/", views.showFriendRequestList, name="showFriendRequestList"), #pour recup la liste de requete d'amis
    path('logout/', views.logout_view, name='logout'),
    
    path('send-message/', views.sendMessage, name='send_message'),
    path('get-messages/', views.getMessages, name='get_messages'),

	path('increment_victory/', views.increment_victory, name='increment_victory'),
	path('increment_losses/', views.increment_losses, name='increment_losses'),

	path('get_player_stats/', views.get_player_stats, name='get_player_stats'),





	
	#API PATH
	path('auth/42/', views.redirect_to_42, name='auth_42'),
    path('auth/42/callback/', views.auth_callback, name='auth_callback'),
]


