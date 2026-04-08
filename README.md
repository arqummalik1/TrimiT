# TrimiT - Salon Booking Platform

A Zomato-like platform for salons where customers can discover nearby salons, view services, pricing, and availability, book time slots, and pay online. Salon owners can list and manage their business.

## Tech Stack

- **Frontend**: React 19 with Tailwind CSS, React Query, Zustand
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Payments**: Razorpay (test mode - keys to be configured)
- **Maps**: Google Maps (API key to be configured)

## Setup Instructions

### 1. Supabase Database Setup

Before the app can work, you need to create the database tables in Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `etpoecagsfhodtfuhblk`
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `/app/database/schema.sql`
5. Click **Run** to execute

This will create:
- `users` table - User profiles linked to Supabase Auth
- `salons` table - Salon information
- `services` table - Services offered by salons
- `bookings` table - Customer bookings
- `reviews` table - Customer reviews

Plus all necessary indexes and Row Level Security (RLS) policies.

### 2. Environment Variables

#### Backend (`/app/backend/.env`)
```
SUPABASE_URL=https://etpoecagsfhodtfuhblk.supabase.co
SUPABASE_ANON_KEY=your_anon_key
RAZORPAY_KEY_ID=rzp_test_xxxxx (optional - placeholder set)
RAZORPAY_KEY_SECRET=xxxxx (optional - placeholder set)
JWT_SECRET=your_secret_key
```

#### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://your-preview-url.emergentagent.com
REACT_APP_SUPABASE_URL=https://etpoecagsfhodtfuhblk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxx
REACT_APP_GOOGLE_MAPS_API_KEY=your_key
```

### 3. Running the Application

The application runs on Emergent's infrastructure:
- Backend: Port 8001 (FastAPI)
- Frontend: Port 3000 (React)

To restart services:
```bash
sudo supervisorctl restart backend frontend
```

## User Roles

### Customer
- Browse nearby salons
- View salon details and services
- Book appointments
- Pay online
- View booking history
- Cancel bookings
- Leave reviews

### Salon Owner
- Create and manage salon profile
- Add/Edit/Delete services
- Accept/Reject bookings
- View schedule
- Track earnings

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile

### Salons
- `GET /api/salons` - List salons (with location filtering)
- `GET /api/salons/{id}` - Get salon details
- `POST /api/salons` - Create salon (owner only)
- `PATCH /api/salons/{id}` - Update salon (owner only)
- `DELETE /api/salons/{id}` - Delete salon (owner only)

### Services
- `POST /api/salons/{id}/services` - Add service
- `PATCH /api/services/{id}` - Update service
- `DELETE /api/services/{id}` - Delete service

### Bookings
- `GET /api/salons/{id}/slots` - Get available time slots
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `PATCH /api/bookings/{id}/status` - Update booking status

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

### Analytics (Owner)
- `GET /api/owner/salon` - Get owner's salon
- `GET /api/owner/analytics` - Get dashboard analytics

## Features Implemented

✅ User authentication with role selection (Customer/Owner)
✅ Customer: Browse salons with map/list view
✅ Customer: View salon details and services
✅ Customer: Book appointments with time slot selection
✅ Customer: View and cancel bookings
✅ Owner: Create and edit salon profile
✅ Owner: Manage services (add/edit/delete)
✅ Owner: View and manage bookings
✅ Owner: Dashboard with analytics
✅ Row Level Security for data protection

## Pending Configuration

- [ ] **Razorpay**: Add test keys for payment processing
- [ ] **Google Maps**: Add API key for map view functionality
- [ ] **Supabase Tables**: Run schema.sql in Supabase SQL Editor

## Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   ├── lib/          # Utilities and API client
│   │   ├── App.js        # Main app with routing
│   │   └── index.js      # Entry point
│   ├── public/           # Static assets
│   ├── package.json      # Node dependencies
│   └── .env             # Frontend environment variables
└── database/
    └── schema.sql        # Supabase database schema
```

## License

MIT License
