FROM nginx:latest

# Copier le fichier de configuration Nginx dans le conteneur
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copier les certificats SSL
COPY nginx/certs /etc/nginx/certs

# Exposer le port HTTPS (443)
EXPOSE 80 443
