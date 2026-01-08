# Participium - Citizen Issue Reporting Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue)](LICENSE)

**Participium** is a comprehensive web-based platform designed to facilitate citizen engagement with municipal services. The application enables residents to report urban issues (such as broken streetlights, potholes, garbage collection problems, water leaks, accessibility barriers, etc.) directly to the appropriate municipal technical offices through an intuitive map-based interface.

Developed as a group project for the **Software Engineering II** course at **Politecnico di Torino** (Master's Degree, Second Year), this project demonstrates full-stack development practices, RESTful API design, role-based access control, and containerized deployment strategies.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Documentation](#documentation)
- [License](#license)

## Features

### For Citizens

- **Interactive Map Interface**: View and create reports on an interactive map with geospatial capabilities
- **Address Search**: Search for locations by address with autocomplete suggestions powered by OpenStreetMap Nominatim API
- **Rich Report Creation**: Submit reports with up to 3 photos, precise location, and detailed descriptions
- **Categorized Issues**: Select from 9 report categories (waste, water supply, sewer system, public lighting, roads, etc.)
- **Real-time Status Tracking**: Monitor the status of submitted reports (Pending Approval → Assigned → In Progress → Resolved)
- **Anonymous Reporting**: Option to submit reports anonymously
- **Email Verification**: Confirm registration with a 6-digit verification code sent via email (30-minute expiry)
- **Comments & Collaboration**: Internal comments system for municipality staff and external maintainers to collaborate on reports
  - **Comment Access Control**: Only municipality staff and assigned external maintainers can view and add comments
  - **Comment Restriction on Resolved Reports**: Comments are disabled when a report reaches "Resolved" status
- **Profile Management**: Customize profile settings and notification preferences

### For Municipality Staff

- **Role-Based Access Control**: Different permissions for Public Relations Officers and Technical Office Staff
  - **Municipal Public Relations Officer**: Reviews and approves/rejects all reports
  - **Technical Officers**: Manage assigned reports by category and update status
- **Report Management Dashboard**: Filter and view reports by category, status, date range, and assigned staff
- **Report Assignment**: Automatic category-based routing and manual assignment to external maintainers
- **Status Updates**: Update report status, add comments, and mark reports as resolved
- **Office-Based Filtering**: See only reports relevant to their technical office
- **External Maintainer Integration**: Assign reports to contractors with automatic load-balancing
- **Collaboration**: Communicate with citizens and external maintainers through report comments
  - **Internal Comments**: Staff-only comments for coordinating work on reports
  - **Comment Collaboration Flow**:
    - Technical officers can add comments while managing reports
    - Once assigned to an external maintainer, technical officers lose the ability to update status (but can still comment)
    - External maintainers can add comments and update status until report is resolved
    - Both parties cannot add comments once report status becomes "Resolved"

### For Administrators

- **User Management**: Create and manage municipality users and external maintainer accounts
- **Role Configuration**: Define and assign municipality roles
- **External Maintainer Setup**: Create external maintainer accounts with category assignments

### System Features

- **Secure Authentication**: Session-based authentication with Passport.js and bcrypt password hashing
- **Image Upload & Storage**: Multi-file upload handling with validation (JPEG, JPG, PNG)
- **Data Validation**: Comprehensive input validation on both client and server
- **Error Handling**: Centralized error handling with custom error types
- **Responsive Design**: Mobile-first responsive UI using Tailwind CSS
- **Database Persistence**: PostgreSQL database with Prisma ORM for type-safe data management
- **Containerization**: Docker Compose for seamless deployment
- **Testing**: Comprehensive unit and E2E tests using Jest
- **Internal Comments System**: 
  - Role-based comment access control (municipality staff and external maintainers only)
  - Comments disabled on resolved reports to prevent unauthorized updates
### Key Design Patterns

- **Repository Pattern**: Data access logic abstraction through `userRepository`, `reportRepository`, etc.
- **DTO (Data Transfer Object)**: Clean separation between database entities and API responses
- **Service Layer**: Business logic encapsulation in dedicated service classes
- **Middleware Chain**: Authentication, error handling, and request processing
- **Load-Balancing Algorithm**: Automatic distribution of reports to least-loaded external maintainers
- **Custom Error Handling**: Centralized error management with specific error types

### Request Flow

1. **Frontend** (React) - User interface with interactive map and forms
   - Browser-based single-page application (SPA)
   - Client-side routing with React Router
   - Real-time location selection and visualization
   - Form validation before submission

2. **Backend** (Express + Prisma) - API and business logic
   - RESTful API endpoints with role-based middleware
   - Session-based authentication with Passport.js
   - Service layer for business logic encapsulation
   - Repository pattern for data access abstraction
   - File upload handling with Multer (images validation & storage)

3. **Database** (PostgreSQL) - Data persistence
   - Relational schema with proper constraints and indexes
   - Automatic migrations with Prisma
   - Support for complex queries and aggregations

## Tech Stack

### Frontend

- **React 19.1.1** - Modern UI library with latest features
- **TypeScript 5.9.3** - Type-safe development
- **Vite 7.1.7** - Fast build tool and dev server
- **React Router 7.9.5** - Client-side routing
- **React Leaflet 5.0** - Interactive maps with OpenStreetMap
- **Leaflet 1.9.4** - Core mapping library
- **Leaflet Marker Cluster 1.5.3** - Map clustering
- **Tailwind CSS 3.4.18** - Utility-first CSS framework
- **Axios 1.13.1** - HTTP client
- **Framer Motion 12.23.24** - Animations library
- **Turf.js 7.3.0** - Geospatial analysis
- **Lucide React 0.552** - Icon library
- **ESLint & Prettier** - Code quality and formatting

### Backend

- **Node.js 20** - Runtime environment
- **Express 5.1** - Web framework
- **TypeScript 5.9.3** - Type-safe server development
- **Prisma 6.19** - Type-safe ORM with migrations
- **Passport 0.7** - Authentication middleware
- **Multer 2.0** - File upload handling
- **bcrypt 6.0** - Password hashing
- **Cookie Parser 1.4.7** - Cookie handling
- **JWT 9.0.2** - Token-based authentication
- **Winston 3.11** - Logging framework
- **Redis (IORedis 5.8.2)** - In-memory cache/session store
- **Swagger/OpenAPI 6.2** - API documentation
- **Jest 30.2** - Testing framework
- **Supertest 7.x** - HTTP assertion library for tests

### Database

- **PostgreSQL 15** - Relational database
- **Prisma Migrations** - Database schema versioning

### DevOps

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Prerequisites

Before running Participium, ensure you have the following installed:

### Required

- **Docker Desktop** (version 20.10 or higher)
  - Download: https://www.docker.com/products/docker-desktop
  - Includes Docker Compose automatically
- **Git** (for cloning the repository)
  - Download: https://git-scm.com/downloads

### Optional (for local development without Docker)

- **Node.js 20.x** or higher
- **npm 10.x** or higher
- **PostgreSQL 15**

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/andreadp02/participium.git
cd participium
```

### 2. Environment Configuration (Optional)

The application uses default configuration values suitable for Docker Compose deployment. If you need to customize settings, you can create environment files:

**Backend** (`backend/.env`):

```env
DATABASE_URL=postgresql://participium:participium@postgres:5432/participium
PORT=4000
NODE_ENV=development
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=Participium
```

> **Note**: The `docker-compose.yml` file already contains these values as environment variables, so creating `.env` files is optional.

## Running the Application

### Using Docker Compose (Recommended)

Docker Compose will automatically build and start all services (PostgreSQL, Backend, Frontend) with proper networking and health checks.

#### 1. Start the Application

From the project root directory:

```bash
docker-compose up --build
```
#### 2. Access the Application

- **Frontend (Web UI)**: http://localhost:5173
- **Backend API**: http://localhost:4000/api

#### 3. Default Credentials

After initialization, you can login with:

- **Admin User**
  - Username: `admin`
  - Email: `admin@participium.com`
  - Password: `admin` (default credentials)

#### 4. Stop the Application

```bash
# Stop containers (preserves database data)
docker-compose down

# Stop containers and remove database volume (fresh start)
docker-compose down -v
```

#### 5. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

#### 6. Rebuild After Code Changes

```bash
# Rebuild with cache
docker-compose up --build

# Rebuild without cache (clean build)
docker-compose build --no-cache
docker-compose up
```

## Testing

### Backend Tests

The backend includes comprehensive unit and E2E tests using Jest and Supertest.

```bash
cd backend

# Run all tests
npm test

# Run unit tests only
npm run test-unit

# Run integration tests only
npm run test-integration

# Run E2E tests only
npm run test-e2e

# Run tests with coverage report
npm run test-coverage
```

### Frontend Tests

Manual E2E UI testing documentation is available in the test directory.

**Test Coverage:**

- **E2E Citizens Tests**: Report creation, authentication, profile management
- **E2E Municipality Users Tests**: Report approval/rejection, status updates
- **E2E Technical Officers Tests**: Report assignment and management
- **E2E External Maintainers Tests**: Report handling and status tracking
- **E2E Admin Tests**: User and municipality configuration
- **E2E Report Workflow Tests**: Complete report lifecycle and collaboration
- **E2E Map and Location Tests**: Interactive map features

## Real-Time Features

### WebSocket Implementation

The application uses WebSocket for real-time notifications and comment synchronization between municipality staff and external maintainers.

**WebSocket Server Details:**
- **Port**: 8080 (configurable in `websocketService.ts`)
- **Authentication**: JWT token passed as query parameter (`?token=<jwt_token>`)
- **Supported Roles**: Municipality users and External maintainers only

**WebSocket Events:**

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `CONNECTED` | Server → Client | Initial connection confirmation | `{ type: "CONNECTED", message: "Welcome message" }` |
| `MARK_COMMENTS_AS_READ` | Client → Server | Mark report comments as read | `{ type: "MARK_COMMENTS_AS_READ", reportId: number }` |
| Comment notification | Server → Client | Real-time comment added notification | `{ id, reportId, content, municipality_user_id or external_maintainer_id, createdAt, updatedAt }` |

**How It Works:**

1. **Connection**: When a municipality user or external maintainer logs in, a WebSocket connection is established with their JWT token
2. **Comment Notifications**: When a comment is added to a report, the system automatically notifies the other party (municipality ↔ external maintainer) via WebSocket
3. **Read Status Tracking**: When a user reads comments, they mark them as read by sending the `MARK_COMMENTS_AS_READ` event
4. **Real-time Updates**: Users see comment counts update in real-time without refreshing the page.

---

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/api/auth/session` | Login (citizen/municipality/admin) | No |
| GET | `/api/auth/session` | Verify authentication status | No |
| DELETE | `/api/auth/session` | Logout | Yes |
| POST | `/api/auth/verify` | Verify email and complete registration with verification code | No |
| POST | `/api/auth/resend-code` | Resend verification code to email | No |

### Email

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/api/email/send-verification` | Send verification email to citizen | No |

### Reports

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|-----------------|------|
| POST | `/api/reports` | Create new report (with up to 3 photos) | Yes | Citizen |
| GET | `/api/reports` | Get all reports (with filters by status, category, date range) | Yes | Citizen/Municipality |
| GET | `/api/reports/:id` | Get report by ID | No | Any |
| POST | `/api/reports/:id` | Update report status (approve/reject/assign) | Yes | Municipality/External Maintainer |
| GET | `/api/reports/search` | Search reports by bounding box (map bounds) | No | Any |
| GET | `/api/reports/reports-map` | Get all reports for map view | No | Any |
| GET | `/api/reports/municipality-user/:municipalityUserId` | Get reports assigned to a municipality user | Yes | Municipality |
| GET | `/api/reports/external-maintainers/:externalMaintainersId` | Get reports assigned to an external maintainer | Yes | External Maintainer |
| POST | `/api/reports/:report_id/external-maintainers` | Assign report to an external maintainer | Yes | Municipality |

### Comments

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|-----------------|------|
| POST | `/api/reports/:report_id/comments` | Add a comment to a report | Yes | Municipality/External Maintainer |
| GET | `/api/reports/:report_id/comments` | Get all comments on a report | Yes | Municipality/External Maintainer |
| GET | `/api/reports/:report_id/comments/unread` | Get unread comments on a report | Yes | Municipality/External Maintainer |

### Users

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|-----------------|------|
| POST | `/api/users` | Register new citizen with email verification | No | Any |
| PATCH | `/api/users` | Update citizen profile (with optional photo) | Yes | Citizen |
| GET | `/api/users` | Get all users (pagination available) | Yes | Admin |
| GET | `/api/users/:id` | Get user by ID | Yes | Admin |
| DELETE | `/api/users/:id` | Delete user by ID | Yes | Admin |
| POST | `/api/users/municipality-users` | Create municipality user | Yes | Admin |
| GET | `/api/users/municipality-users` | Get all municipality users | Yes | Admin |
| GET | `/api/users/municipality-users/roles` | Get all available municipality roles | Yes | Admin |
| POST | `/api/users/external-users` | Create external maintainer user | Yes | Admin |
| GET | `/api/users/external-users` | Get all external maintainer users | Yes | Admin |

## Documentation

Comprehensive documentation is available in the `/doc` directory:

- **Technical_offices_details.md** - Detailed information about municipal technical offices and category-to-office mapping
- **Workflow.md** - System workflow and user story documentation
- **OpenAPI_swagger.yml** - Complete API specification in OpenAPI format
- **RELEASE_1.md** - Features and improvements in Release 1
- **TD_strategy.md** - Technical debt management strategy and prioritization approach

## Technical Debt Management Strategy

The project follows a structured approach to managing technical debt based on the strategy documented in [TD_strategy.md](doc/TD_strategy.md):

### Prioritization Principles

1. **Category First**
   - Handle issues by categories in the following sequence:
     1. Security
     2. Reliability
     3. Maintainability

2. **Severity First**
   - For issues of the same category, handle issues in descending severity (Critical → High → Medium → Low)
   - Within each severity level, prioritize items that affect multiple services before localized ones

3. **Type Order**
   - When the previous rules still leave a tie, prefer the following order:
     1. Bugs
     2. Vulnerability
     3. Code smell

### Execution Workflow

1. **Triage** - Review new SonarQube findings, bug reports, and incident retros at the start of every sprint
2. **Planning** - Reserve sprint capacity for top pending technical debt items following the prioritization stack
3. **Remediation** - Implement fixes with regression tests; add monitoring/alert rules for security issues when relevant
4. **Verification** - Re-run the full automated test suite for every fix and document any residual risks

## Report Categories

The system supports 9 report categories:

| Category | Technical Office | Description |
|----------|------------------|-------------|
| WATER_SUPPLY_DRINKING_WATER | Environmental Protection Officer | Water leaks, hydrants, fountains |
| ARCHITECTURAL_BARRIERS | Urban Planning Specialist | Accessibility issues, ramps |
| SEWER_SYSTEM | Public Works Project Manager | Drainage, blocked sewers |
| PUBLIC_LIGHTING | Public Works Project Manager | Broken streetlights, poles |
| WASTE | Sanitation Officer | Overflowing bins, waste issues |
| ROAD_SIGNS_TRAFFIC_LIGHTS | Traffic Coordinator | Road signs, traffic lights |
| ROADS_URBAN_FURNISHINGS | Public Works Project Manager | Potholes, pavements, furniture |
| PUBLIC_GREEN_AREAS_PLAYGROUNDS | Parks Officer | Parks, playgrounds, green spaces |
| OTHER | Municipal Administrator | General municipal matters |

## License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0).

Key points:
- The software is free to use, modify, and distribute
- If you modify and deploy this software, you must share your modifications with others
- You must provide source code access to users of your modified version
- See the [LICENSE](LICENSE) file for the complete license text

For more information, visit: https://www.gnu.org/licenses/agpl-3.0.html
