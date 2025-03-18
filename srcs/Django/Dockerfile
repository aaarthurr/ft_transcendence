# Utiliser une image de base Python
FROM python:3.10

# Installer les dépendances système nécessaires pour PostgreSQL
RUN apt-get update && apt-get install -y gcc libpq-dev

# Mettre à jour pip
RUN pip install --upgrade pip

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le code de l'application dans le conteneur
COPY . /app/

# Installer les dépendances Python du projet (Django, psycopg2)
RUN chmod 644 /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Exposer le port pour le serveur de développement Django
EXPOSE 8000


# Optionnel : Créer un super utilisateur si nécessaire (à personnaliser)
#RUN python3 manage.py createsuperuser --noinput --username Admin --email admin@gmail.com

# Commande pour démarrer le serveur Django
CMD ["python3", "manage.py", "runserver", "0.0.0.0:8000"]
