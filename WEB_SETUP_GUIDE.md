# TrimiT Web Application - Setup Guide

A comprehensive guide to set up and run the TrimiT Salon Booking Platform web application locally.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
   - [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Running the Application](#running-the-application)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.9+ | Backend runtime |
| **Node.js** | 18+ | Frontend runtime |
| **npm** | 9+ | Package manager |
| **Git** | Any | Version control |

### Verify Installations

```bash
# Check Python version
python3 --version

# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

### External Services (Optional)

- **Supabase Account**: For database and authentication ([Sign up](https://supabase.com))
- **Razorpay Account**: For payment processing ([Sign up](https://razorpay.com))
- **Google Cloud Console**: For Maps API ([Get API Key](https://console.cloud.google.com))

---

## Project Structure

```
TrimiT/
├── backend/                 # FastAPI Backend
│   ├── server.py           # Main API server
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Backend environment variables
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   │   ├── customer/   # Customer-facing pages
│   │   │   └── owner/      # Salon owner pages
│   │   ├── store/          # Zustand state management
│   │   └── lib/            # Utilities and API client
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies
│   └── .env                # Frontend environment variables
├── database/
│   └── schema.sql          # Supabase database schema
└── README.md               # General project documentation
```

---

## Quick Start

For those familiar with the stack:

```bash
# 1. Clone and navigate to project
cd /Users/arqummalik/Software\ Development/trimit-emergent/TrimiT

# 2. Setup Backend
cd backend
python3 -m pip install -r requirements.txt
# Edit .env file with your credentials
cd ..

# 3. Setup Frontend
cd frontend
npm install
# Edit .env file with your credentials
cd ..

# 4. Start Backend (Terminal 1)
cd backend && python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 5. Start Frontend (Terminal 2)
cd frontend && npm start

# 6. Open browser
open http://localhost:3000
```

---

## Detailed Setup

### Backend Setup

#### Step 1: Install Python Dependencies

```bash
cd backend

# Install required packages
python3 -m pip install fastapi uvicorn python-dotenv httpx pydantic email-validator

# Or install all dependencies from requirements.txt
python3 -m pip install -r requirements.txt
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://etpoecagsfhodtfuhblk.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# JWT Secret for token signing (generate a secure random string)
JWT_SECRET=your-secret-key-minimum-32-characters-long

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
```

**How to get Supabase credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing one
3. Go to **Project Settings** > **API**
4. Copy the `URL` and `anon public` key

#### Step 3: Start the Backend Server

```bash
cd backend

# Development mode with auto-reload
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Production mode
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
```

The API will be available at:
- **API Base URL**: `http://localhost:8001`
- **Interactive Docs**: `http://localhost:8001/docs` (Swagger UI)
- **ReDoc**: `http://localhost:8001/redoc`

---

### Frontend Setup

#### Step 1: Install Node Dependencies

```bash
cd frontend

# Install all dependencies
npm install

# If you encounter peer dependency issues
npm install --legacy-peer-deps
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
cat > .env << 'EOF'
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001

# Supabase Configuration (same as backend)
REACT_APP_SUPABASE_URL=https://etpoecagsfhodtfuhblk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Razorpay Test Key
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Google Maps API Key (optional)
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Development settings
REACT_APP_DISABLE_REACT_DEVTOOLS=false
EOF
```

#### Step 3: Start the Frontend Dev Server

```bash
cd frontend

# Start development server
npm start

# The app will open automatically at http://localhost:3000
```

**Build for production:**
```bash
npm run build
```

---

### Database Setup

The application uses Supabase (PostgreSQL) as its database.

#### Step 1: Create Database Schema

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard)
2. Open your project
3. Navigate to **SQL Editor**
4. Copy the contents of `database/schema.sql`
5. Paste and click **Run**

#### Step 2: Enable Row Level Security (RLS)

The schema includes RLS policies for security. After running the schema:

1. Go to **Database** > **Tables**
2. Verify all tables have RLS enabled:
   - `users`
   - `salons`
   - `services`
   - `bookings`
   - `reviews`

#### Step 3: Configure Authentication

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email confirmation settings (optional for dev)

---

## Environment Variables

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJhbG...` |
| `RAZORPAY_KEY_ID` | No | Razorpay test key ID | `rzp_test_xxxxx` |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret | `secret_key` |
| `JWT_SECRET` | Yes | Secret for JWT signing | `your-secret-key` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins | `http://localhost:3000` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL | `http://localhost:8001` |
| `REACT_APP_SUPABASE_URL` | Yes | Supabase URL | Same as backend |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Supabase key | Same as backend |
| `REACT_APP_RAZORPAY_KEY_ID` | No | For payments | `rzp_test_xxxxx` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | No | For map features | `AIza...` |

**Note:** All frontend env vars must start with `REACT_APP_` to be accessible in React.

---

## Running the Application

### Development Mode

Open **two terminal windows** and run:

**Terminal 1 - Backend:**
```bash
cd /Users/arqummalik/Software\ Development/trimit-emergent/TrimiT/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd /Users/arqummalik/Software\ Development/trimit-emergent/TrimiT/frontend
npm start
```

**Access the app:**
- Web App: http://localhost:3000
- API Docs: http://localhost:8001/docs
- API Base: http://localhost:8001

### Production Mode

**Backend:**
```bash
cd backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
```

**Frontend (build and serve):**
```bash
cd frontend
npm run build
# Serve the build folder using any static server
npx serve -s build -l 3000
```

---

## API Documentation

The backend provides interactive API documentation via Swagger UI.

### Accessing API Docs

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Obtain the token by calling `POST /api/auth/login`.

### Key API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/signup` | POST | Register new user | No |
| `/api/auth/login` | POST | User login | No |
| `/api/auth/me` | GET | Get current user | Yes |
| `/api/salons` | GET | List salons | No |
| `/api/salons/{id}` | GET | Get salon details | No |
| `/api/salons` | POST | Create salon | Owner only |
| `/api/bookings` | POST | Create booking | Customer only |
| `/api/bookings` | GET | Get user bookings | Yes |

---

## Troubleshooting

### Common Issues

#### Issue 1: ModuleNotFoundError

**Error:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Install with --user flag
python3 -m pip install --user fastapi uvicorn

# Or use virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Issue 2: Port Already in Use

**Error:**
```
Address already in use (Port 8001 or 3000)
```

**Solution:**
```bash
# Find and kill process using port
lsof -ti:8001 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Or use different ports
python3 -m uvicorn server:app --port 8002
npm start -- --port 3001
```

#### Issue 3: CORS Errors

**Error:**
```
Access to fetch at 'http://localhost:8001/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
1. Check backend `.env` for `ALLOWED_ORIGINS`
2. Ensure it includes `http://localhost:3000`
3. Restart backend server

#### Issue 4: npm install fails

**Error:**
```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Use legacy peer deps
npm install --legacy-peer-deps

# Or use npm 9+
npm install --force
```

#### Issue 5: Supabase Connection Errors

**Error:**
```
Error connecting to Supabase: 401 Unauthorized
```

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
2. Check for trailing spaces in `.env`
3. Ensure Supabase project is active (not paused)

### Debug Mode

Enable debug logging:

**Backend:**
```python
# Add to server.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend:**
```javascript
// In browser console
localStorage.setItem('debug', '*')
```

### Getting Help

1. Check the browser console for frontend errors
2. Check the backend terminal for API errors
3. Review the FastAPI docs at `/docs`
4. Verify all environment variables are set correctly

---

## Additional Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Razorpay Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/

---

## License

MIT License - See LICENSE file for details
