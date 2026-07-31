# TeaFlow

A modern tea shop management system with role-based access control for super admins, shop owners, and workers.

## Features

- **Role-Based Access Control**: Super Admin, Owner, and Worker roles with separate dashboards
- **Shop Management**: Create and manage multiple tea shops
- **Owner Management**: Manage shop owners and their credentials
- **Worker Management**: Add and manage shop workers with PIN-based access
- **Order Management**: Track and manage customer orders with status updates
- **QR Code Generation**: Generate and manage QR codes for tables/orders
- **Analytics & Reports**: View sales analytics and business insights
- **Subscription Management**: Handle shop subscriptions and billing
- **Push Notifications**: Real-time order notifications (WebSocket-based)
- **Customer Display**: Public-facing order status display
- **Settings Management**: Global and shop-specific settings

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Utilities**: bcryptjs, dotenv, morgan

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **State Management**: React Context API
- **UI Components**: Custom components with Tailwind CSS
- **Animations**: Framer Motion
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Prerequisites

- Node.js >= 18.x
- npm or yarn
- Supabase account

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/teaflow.git
cd teaflow
```

### 2. Backend Setup

```bash
cd teaflow-backend
npm install
```

Create a `.env` file in the `teaflow-backend` directory:

```bash
cp .env.example .env
```

Edit `teaflow-backend/.env` and add your configuration:

```env
NODE_ENV=development
PORT=5000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (generate a strong random string)
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRY=8h

# CORS Origin
CORS_ORIGIN=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd ../teaflow-frontend
npm install
```

Create a `.env` file in the `teaflow-frontend` directory:

```bash
cp .env.example .env
```

Edit `teaflow-frontend/.env` and add your configuration:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Setup

Execute the SQL files in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Execute the following files in order:
   - `teaflow-backend/supabase-schema.sql`
   - `teaflow-backend/supabase-rls.sql`
   - `teaflow-backend/supabase-storage.sql`

Alternatively, use the Supabase CLI:

```bash
supabase db push
```

### 5. Seed Initial Data (Optional)

```bash
cd teaflow-backend
npm run seed
```

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port number | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | Yes |
| `JWT_EXPIRY` | JWT token expiration time | No (default: 8h) |
| `CORS_ORIGIN` | Allowed CORS origin | No (default: *) |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Local Development

### Start Backend Server

```bash
cd teaflow-backend
npm run dev
```

The backend server will start at `http://localhost:5000`

### Start Frontend Development Server

```bash
cd teaflow-frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Build Commands

### Build Frontend for Production

```bash
cd teaflow-frontend
npm run build
```

The build output will be in `teaflow-frontend/dist/`

### Start Backend in Production

```bash
cd teaflow-backend
npm start
```

## Project Structure

```
CK_1/
├── .gitignore
├── README.md
├── teaflow-backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── supabase-*.sql
└── teaflow-frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── layouts/
    │   ├── pages/
    │   ├── services/
    │   └── utils/
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── vite.config.js
```

## Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- Use strong JWT secrets (minimum 32 characters, randomly generated)
- Enable Supabase RLS (Row Level Security) policies
- Use HTTPS in production
- Regularly rotate API keys and secrets
- Keep dependencies up to date

## Scripts

### Backend Scripts

```bash
npm run dev     # Start development server with auto-reload
npm start       # Start production server
npm run seed    # Seed database with initial data
```

### Frontend Scripts

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
npm run lint    # Run Oxlint
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License

## Support

For issues and questions, please open an issue on GitHub.