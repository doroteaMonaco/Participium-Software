# Participium - Release 1

## Quick Start

### Start the System
```bash
cp .env.example .env
docker compose up --build -d
```

### Access Points
- **Web Application**: http://localhost:4173
- **API Documentation**: http://localhost:4000/api/docs
- **Database Admin**: http://localhost:5555

## Usage


## Stop the System
```bash
docker compose down
```

## Troubleshooting
If issues occur:
```bash
docker compose logs -f
docker compose down -v  # Reset everything
docker compose up --build -d
```