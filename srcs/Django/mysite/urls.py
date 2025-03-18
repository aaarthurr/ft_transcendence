# mysite/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Route pour l'administration
    path('admin/', admin.site.urls),

    # Inclure les URLs de l'app 'web' (page d'accueil et autres)
    path('', include('web.urls')),



    # D'autres apps peuvent être ajoutées ici si nécessaire
    # path('users/', include('users.urls')),  # Exemple pour l'app 'users'
]
