from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur

class UtilisateurAdmin(UserAdmin):
    model = Utilisateur
    list_display = ['username', 'first_name', 'last_name', 'email' , 'is_online', 'victory']
    search_fields = ['username', 'email']
    list_filter = ['is_staff', 'is_superuser']

admin.site.register(Utilisateur, UtilisateurAdmin)
