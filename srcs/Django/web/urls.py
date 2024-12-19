from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),  # Route pour afficher la vue `home`
]
