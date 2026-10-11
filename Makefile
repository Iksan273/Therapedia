# Pintasan Docker untuk DEV lokal (docker-compose.yml). Tanpa `make` (mis. Windows PowerShell)? Jalankan perintah di kanan langsung.
# Argumen: make artisan c="migrate --seed" | make composer c="require laravel/sanctum"
.DEFAULT_GOAL := help
DC := docker compose

help: ## Daftar perintah
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

laravel-new: ## Buat project Laravel 11 di backend/ (sekali saja)
	./docker/scripts/laravel-new.sh

up: ## Jalankan app + web + mysql
	$(DC) up -d --build

tools: ## Jalankan juga Mailpit (email OTP) + Adminer (DB)
	$(DC) --profile tools up -d

scheduler: ## Jalankan scheduler (schedule:work)
	$(DC) --profile scheduler up -d

down: ## Hentikan semua container
	$(DC) --profile tools --profile scheduler down

logs: ## Ikuti log app + web
	$(DC) logs -f app web

sh: ## Shell di container app
	$(DC) exec app sh

artisan: ## php artisan $(c)
	$(DC) exec app php artisan $(c)

composer: ## composer $(c)
	$(DC) exec app composer $(c)

test: ## php artisan test
	$(DC) exec app php artisan test

mysql: ## Klien mysql di container
	$(DC) exec mysql sh -c 'mysql -uroot -p"$$MYSQL_ROOT_PASSWORD" "$$MYSQL_DATABASE"'

reset-db: ## HAPUS semua data dev lalu migrate:fresh --seed
	$(DC) exec app php artisan migrate:fresh --seed

.PHONY: help laravel-new up tools scheduler down logs sh artisan composer test mysql reset-db
