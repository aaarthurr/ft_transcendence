# Variables
DOCKER_COMPOSE = docker-compose -f srcs/docker-compose.yml
PROJECT_NAME = transcendence

.PHONY: all up down build logs migrate shell

all: build up

build:
	@echo "Building Docker images..."
	$(DOCKER_COMPOSE) build

prune:
	@echo "Removing Docker images..."
	docker system prune -af

up:
	@echo "Starting Docker containers..."
	$(DOCKER_COMPOSE) up -d

down:
	@echo "Stopping Docker containers..."
	$(DOCKER_COMPOSE) down

logs:
	@echo "Showing logs..."
	$(DOCKER_COMPOSE) logs -f

migrate:
	@echo "Applying Django migrations..."
	$(DOCKER_COMPOSE) exec web python manage.py migrate

makemigrations:
	@echo "Creating Django migrations..."
	$(DOCKER_COMPOSE) exec web python manage.py makemigrations

shell:
	@echo "Opening Django shell..."
	$(DOCKER_COMPOSE) exec web python manage.py shell

fake:
	$(DOCKER_COMPOSE) exec web python manage.py migrate web --fake

zero:
	$(DOCKER_COMPOSE) exec web  python manage.py migrate web zero
	rm -rf web/migrations/*
	$(DOCKER_COMPOSE) exec web  python manage.py makemigrations web
	$(DOCKER_COMPOSE) exec web  python manage.py migrate

show: 
	$(DOCKER_COMPOSE) exec web  python manage.py showmigrations web
post:
	docker exec -it mypostgresdb psql -U myuser -d postgres
