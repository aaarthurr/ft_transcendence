# Utiliser une image de base Python
FROM python:3.11-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y gcc libpq-dev

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le code de l'application dans le conteneur
COPY . /app/

# Installer les dépendances directement dans le Dockerfile
RUN pip install --no-cache-dir Django psycopg2

# Exposer le port pour le serveur de développement Django
EXPOSE 8000

# Commande pour démarrer le serveur Django
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
