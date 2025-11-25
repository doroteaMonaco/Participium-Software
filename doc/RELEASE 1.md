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

### Public Pages
- **Landing Page** (`/`): Welcome page with system overview and navigation to login/register
- **Login Page** (`/login`): User authentication with email/username and password
- **Register Page** (`/register`): New user registration form
- **Report Details** (`/report/:id`): Public view of individual report details and status

### Citizen Dashboard (requires CITIZEN role)
- **User Dashboard** (`/dashboard`): Overview of user's submitted reports with status tracking
- **New Report** (`/dashboard/new-report`): Form to submit new reports with:
  - Title and description
  - Category selection
  - Location (latitude/longitude)
  - Photo upload (1-3 images required)

### Municipality Dashboard (requires MUNICIPALITY role)
- **Reports Management** (`/municipality/reports`): View pending reports and approve/reject them
- **Technical Reports** (`/municipality/technical-reports`): Manage assigned reports with status updates (Assigned → In Progress → Resolved)

### Admin Dashboard (requires ADMIN role)
- **Admin Overview** (`/admin`): Administrative dashboard with system statistics
- **User Management** (`/admin/users`): Create municipality users and manage system users

### User Roles
- **CITIZEN**: Can submit reports and track their status
- **MUNICIPALITY**: Staff who review and manage reports for their technical office
- **ADMIN**: System administrators who manage users and oversee operations
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