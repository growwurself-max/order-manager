# TeaFlow Backend Architecture

## Overview
TeaFlow is a multi-tenant SaaS platform for managing bubble tea shops with seamless ordering workflows. This document outlines the database architecture, data flow, API design, and system architecture for production deployment.

---

## Database Architecture

### 5 Core Data Models

#### 1. Owner
Represents shop owners with administrative privileges.

```javascript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hashed
  phone: String,
  name: String,
  shopId: { type: ObjectId, ref: 'ShopSettings', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**Key Design Decisions:**
- One-to-one relationship with ShopSettings
- Password stored as bcrypt hash (not plain text)
- Unique email constraint for authentication

#### 2. Worker
Represents shop staff who process orders.

```javascript
{
  _id: ObjectId,
  shopId: { type: ObjectId, ref: 'ShopSettings', required: true },
  name: { type: String, required: true },
  pin: { type: String, required: true }, // 4-digit PIN for quick login
  role: {
    type: String,
    enum: ['worker', 'manager'],
    default: 'worker'
  },
  isActive: { type: Boolean, default: true }, // Soft delete
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**Key Design Decisions:**
- Many-to-one relationship with ShopSettings
- Soft delete via `isActive` flag (preserves order history)
- 4-digit PIN for fast tablet-based login
- Role-based access control

#### 3. MenuItem
Individual menu items with categories and pricing.

```javascript
{
  _id: ObjectId,
  shopId: { type: ObjectId, ref: 'ShopSettings', required: true },
  name: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['milk-tea', 'fruit-tea', 'slush', 'specialty'],
    required: true
  },
  basePrice: { type: Number, required: true, min: 0 },
  sizes: [{
    name: String,
    priceModifier: Number
  }],
  toppings: [{
    name: String,
    price: Number
  }],
  isAvailable: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }, // For menu ordering
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**Key Design Decisions:**
- Shop-scoped (multi-tenant isolation)
- Support for size variations and toppings
- Display ordering for flexible menu presentation
- Availability toggle for seasonal items

#### 4. Order
Complete order record with denormalized items for history preservation.

```javascript
{
  _id: ObjectId,
  shopId: { type: ObjectId, ref: 'ShopSettings', required: true },
  orderNumber: { type: String, unique: true, required: true },
  customer: {
    name: String,
    phone: { type: String, required: true }
    // NO customer accounts - session-based via mobile number
  },
  items: [{
    menuItemId: { type: ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true }, // DENORMALIZED
    category: String, // DENORMALIZED
    size: String,
    toppings: [String],
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true }, // DENORMALIZED - preserves historical pricing
    totalPrice: { type: Number, required: true }
  }],
  status: {
    type: String,
    enum: ['placed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'placed'
  },
  totalAmount: { type: Number, required: true },
  notes: String,
  placedAt: { type: Date, default: Date.now },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: String // worker name or system
  }],
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**Key Design Decisions:**
- Denormalized items preserve pricing history (if menu item price changes, old orders remain accurate)
- Sequential `orderNumber` for customer reference
- `statusHistory` array tracks order journey
- Session-based (no persistent customer accounts)
- Customer identified by mobile number only

#### 5. ShopSettings
Configuration and settings for each shop instance.

```javascript
{
  _id: ObjectId,
  ownerId: { type: ObjectId, ref: 'Owner', required: true, unique: true },
  shopName: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  settings: {
    orderPrefix: { type: String, default: 'TF' }, // Order number prefix
    allowPreorder: { type: Boolean, default: false },
    preorderSchedule: {
      openTime: String,
      closeTime: String
    },
    taxRate: { type: Number, default: 0.08 },
    currency: { type: String, default: 'USD' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  branding: {
    logo: String, // URL
    primaryColor: { type: String, default: '#4CAF50' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**Key Design Decisions:**
- One-to-one with Owner (unique constraint)
- Nested settings object for modularity
- Supports brand customization
- Centralized configuration for entire shop

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Shop (ShopSettings)                      │
│  ┌──────────────┐                                                 │
│  │ _id (PK)     │                                                 │
│  │ shopName     │                                                 │
│  │ settings     │                                                 │
│  │ branding     │                                                 │
│  └──────┬───────┘                                                 │
│         │                                                         │
│         │ 1                                                       │
│         │                                                         │
│    ┌────┴───────────────────────────────────┐                   │
│    │                                       │                   │
│    │                                       │                   │
│    ▼ 1                                    M ▼                 │
│ ┌─────────┐                           ┌──────────┐             │
│ │ Owner   │                           │ Worker   │             │
│ │  _id    │                           │  _id     │             │
│ │  email  │                           │  shopId  │──FK────────►│
│ │ password│                           │  name    │             │
│ │ shopId  │──FK────────────────────────│  pin     │             │
│ └─────────┘                           │  isActive│             │
│                                        └──────────┘             │
│    ▲ 1                                    │ M                  │
│    │                                      │                    │
│    │                                      1                    │
│    │                                       │                    │
│    │ M                                     │                    │
│    │                                       │                    │
│    │ 1                                     │                    │
│    │                                       │                    │
│ ┌──┴────────────────────┐                  │                    │
│ │ MenuItem  ─────────────┴──────────────────┘                    │
│ │  _id                                                            │
│ │  shopId  ────────────────────────────────────┐                 │
│ │  name     │                                  │                 │
│ │  category │   M                              1|                 │
│ │  basePrice│                                   |                 │
│ └───────────┘                                   |                 │
│                                                  |                 │
│                                                   1               │
│                                                   │                 │
│                                                   |                 │
│                                    ┌──────────────┴──────────┐   │
│                                    │ Order                   │   │
│                                    │  _id                    │   │
│                                    │  shopId  ─────────────────┤   │
│                                    │  orderNumber            │   │
│                                    │  customer               │   │
│                                    │  items[] (DENORMALIZED) │   │
│                                    │  status                 │   │
│                                    │  statusHistory[]        │   │
│                                    └─────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Relationship Summary

| Relationship | Type | Cascade Behavior |
|--------------|------|------------------|
| ShopSettings → Owner | 1:1 | Owner deletion disables shop |
| ShopSettings → Worker | 1:M | Soft delete on Worker (isActive) |
| ShopSettings → MenuItem | 1:M | Hard delete on MenuItem removal |
| ShopSettings → Order | 1:M | Hard delete on shop deletion |
| Order → MenuItem | M:1 | Reference only (denormalized in Order) |

---

## Folder Architecture

```
teaflow-backend/
├── src/
│   ├── server.js                    # Entry point
│   ├── config/
│   │   └── db.js                    # Database connection
│   ├── models/
│   │   ├── Owner.js                 # Owner schema
│   │   ├── Worker.js                # Worker schema
│   │   ├── MenuItem.js              # MenuItem schema
│   │   ├── Order.js                 # Order schema
│   │   └── ShopSettings.js          # ShopSettings schema
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── orderController.js       # Order CRUD
│   │   ├── menuController.js        # Menu management
│   │   ├── workerController.js      # Worker management
│   │   └── settingsController.js    # Shop settings
│   ├── routes/
│   │   ├── customerRoutes.js        # Public endpoints
│   │   ├── ownerRoutes.js           # Owner-only endpoints
│   │   └── workerRoutes.js          # Worker endpoints
│   ├── services/
│   │   ├── orderService.js          # Business logic for orders
│   │   ├── authService.js           # JWT and auth logic
│   │   └── notificationService.js   # SMS/Email notifications
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── role.js                  # Role-based access
│   │   └── validate.js              # Input validation
│   ├── validators/
│   │   ├── orderValidator.js        # Order input validation
│   │   ├── menuValidator.js         # Menu item validation
│   │   └── authValidator.js         # Login/signup validation
│   └── utils/
│       ├── generateOrderId.js       # Sequential order ID
│       ├── hash.js                  # Password hashing
│       └── constants.js             # App-wide constants
├── package.json
└── .env
```

### Architecture Pattern: MVC + Service Layer

```
Client Request
     ↓
Routes (URL mapping)
     ↓
Middleware (Auth, Validation)
     ↓
Controllers (Request handling)
     ↓
Services (Business logic)
     ↓
Models (Data access)
     ↓
MongoDB
```

---

## API Architecture

### Public Endpoints (No Authentication Required)

**Customer Flow:**
```
GET    /api/customer/menu              # Browse menu items
POST   /api/customer/orders            # Place new order
GET    /api/customer/orders/:id        # Check order status
POST   /api/customer/orders/:id/track  # Track order by mobile number
```

### Owner Endpoints (JWT + Owner Role)

```javascript
// Authentication
POST   /api/owner/auth/login           # Owner login
POST   /api/owner/auth/register        # Owner registration

// Shop Management
GET    /api/owner/settings             # Get shop settings
PUT    /api/owner/settings             # Update shop settings

// Menu Management
GET    /api/owner/menu                 # List all menu items
POST   /api/owner/menu                 # Create menu item
PUT    /api/owner/menu/:id             # Update menu item
DELETE /api/owner/menu/:id             # Delete menu item

// Order Management
GET    /api/owner/orders               # List all orders (with filters)
GET    /api/owner/orders/:id           # Get order details
PUT    /api/owner/orders/:id/status    # Update order status

// Worker Management
GET    /api/owner/workers              # List workers
POST   /api/owner/workers              # Add worker
PUT    /api/owner/workers/:id          # Update worker
DELETE /api/owner/workers/:id          # Deactivate worker (soft delete)
```

### Worker Endpoints (JWT + Worker/Manager Role)

```javascript
// Authentication
POST   /api/worker/auth/pin-login      # PIN-based login

// Order Processing
GET    /api/worker/orders              # View active orders
PUT    /api/worker/orders/:id/status   # Update order status
GET    /api/worker/orders/queue        # Get order queue
```

### Order Creation Flow

```javascript
POST /api/customer/orders
{
  customer: {
    phone: "+1234567890",
    name: "John Doe"
  },
  items: [
    {
      menuItemId: "6523...",
      size: "large",
      toppings: ["pearls", "pudding"],
      quantity: 2
    }
  ],
  notes: "Extra ice please"
}

Response (201):
{
  orderNumber: "TF-0001",
  status: "placed",
  estimatedTime: "10-15 mins",
  totalAmount: 12.50
}
```

---

## Authentication & Authorization

### JWT Strategy

```javascript
{
  payload: {
    userId: "6523...",
    shopId: "6523...",
    role: "owner" | "worker",
    iat: 1699999999,
    exp: 1700086399
  }
}
```

**Token Expiry:** 24 hours (configurable)

### Role-Based Access Control (RBAC)

| Role | Can Access |
|------|------------|
| Customer | Public endpoints only |
| Worker | Order viewing, status updates |
| Manager | All worker permissions + menu management |
| Owner | All endpoints |

**Middleware Implementation:**
```javascript
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.use('/owner', auth, role('owner'));
router.use('/worker', auth, role(['worker', 'manager']));
```

---

## Data Integrity & Indexing

### Compound Indexes

```javascript
// Orders: Fast lookup by shop + status + timestamp
OrderSchema.index({ shopId: 1, status: 1, createdAt: -1 });

// Orders: Unique order numbers per shop
OrderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });

// MenuItems: Category ordering within shop
MenuItemSchema.index({ shopId: 1, category: 1, displayOrder: 1 });

// Workers: Active workers per shop
WorkerSchema.index({ shopId: 1, isActive: 1 });

// Orders: Customer lookup by phone
OrderSchema.index({ shopId: 1, 'customer.phone': 1 });
```

---

## Key Design Decisions

### 1. Denormalized Order Items
**Why:** Preserve historical pricing even if menu items change.

```javascript
// When order is created:
{
  items: [{
    menuItemId: "...",        // Reference
    name: "Bubble Tea",       // DENORMALIZED
    basePrice: 4.50,         // DENORMALIZED
    unitPrice: 5.00          // DENORMALIZED (with size modifier)
  }]
}
```

### 2. Sequential Order Status State Machine
```
placed → preparing → ready → completed
   ↓         ↓          ↓
cancelled  cancelled  cancelled
```

**Valid Transitions:**
- `placed` → `preparing` (worker picks up)
- `preparing` → `ready` (order prepared)
- `ready` → `completed` (customer picks up)
- Any → `cancelled` (with reason)

### 3. No Customer Accounts
**Why:** Reduce friction, faster ordering.

- Customer identified by mobile number (no password)
- Session-based (no persistent login)
- Minimal data collection (name + phone only)

### 4. Soft Delete for Workers
**Why:** Preserve order history attribution.

```javascript
Worker.isActive = false  // Deactivate
// NOT: Worker.delete()  // Would break order history
```

---

## Scalability Path

### Phase 1: Current Setup (Monolith)
- Single Node.js server
- MongoDB for persistence
- All features in one codebase

### Phase 2: Optimization
```javascript
// Redis caching for:
- Menu items (TTL: 1 hour)
- Active orders (TTL: 5 mins)
- Session tokens

// CDN for:
- Menu images
- Static assets
```

### Phase 3: Microservices
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  API Gateway │────►│ Order Service│────►│   MongoDB    │
└──────────────┘     └──────────────┘     └──────────────┘
         │                                       ▲
         ▼                                       │
┌──────────────┐     ┌──────────────┐           │
│ Auth Service │     │Menu Service  │───────────┘
└──────────────┘     └──────────────┘
         │
         ▼
┌──────────────┐
│ Redis Cache  │
└──────────────┘
```

### Phase 4: Multi-Tenancy
- Shared database with `shopId` isolation
- Potential dedicated databases for enterprise clients

---

## Security Best Practices

### Current Implementation
1. **Password Security:** bcrypt hashing with salt rounds (10)
2. **JWT:** Signed with strong secret key, 24h expiry
3. **Input Validation:** express-validator on all endpoints
4. **Rate Limiting:** express-rate-limit on public endpoints
5. **CORS:** Configured for allowed origins
6. **Helmet:** Security headers enabled

### Future Enhancements
- SMS OTP for customer verification
- IP whitelisting for owner access
- Audit logging for all mutations
- Automated vulnerability scanning
- Regular penetration testing

---

## Performance Optimization

### Database Optimization
- Compound indexes on frequently queried fields
- Aggregation pipelines for complex queries
- Connection pooling (Mongoose default: 5)
- Read preference: secondaryPreferred for analytics

### API Optimization
- Response compression (gzip)
- Pagination on list endpoints
- Field selection (GraphQL-style partial responses)
- HTTP/2 support

### Caching Strategy
```javascript
// Redis cache layers:
L1: Menu items (1 hour TTL)
L2: Active orders (5 min TTL)
L3: Shop settings (24 hour TTL)
```

---

## Backup & Disaster Recovery

### Backup Strategy
- **Automated:** Daily MongoDB Atlas backups
- **Manual:** Weekly full dump to S3
- **Point-in-Time:** 7-day retention

### Recovery Plan
1. RTO: 1 hour (Restore from backup)
2. RPO: 24 hours (Daily backups)
3. Test restores Monthly

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js | Server-side JavaScript |
| Framework | Express.js | Web framework |
| Database | MongoDB 6.x | Document store |
| ODM | Mongoose 7.x | Schema & validation |
| Auth | JWT + bcrypt | Authentication |
| Validation | express-validator | Input sanitization |
| Security | Helmet, CORS | HTTP security |
| Rate Limiting | express-rate-limit | Abuse prevention |
| Logging | Winston | Structured logging |
| Testing | Jest + Supertest | Unit & integration tests |

---

## Deployment Architecture

### Production Stack
```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Frontend) │
                    └──────┬──────┘
                           │
                           │ HTTPS
                           │
                    ┌──────▼──────┐
                    │   Nginx     │
                    │ (Reverse    │
                    │  Proxy)     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PM2        │
                    │ (Process    │
                    │  Manager)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Node.js   │
                    │  (Express)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐           ┌──────▼──────┐
       │ MongoDB     │           │   Redis     │
       │  (Primary)  │           │   (Cache)   │
       └─────────────┘           └─────────────┘
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/teaflow

# Auth
JWT_SECRET=your-256-bit-secret
JWT_EXPIRY=24h

# Redis (optional)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=https://teaflow.app
```

---

## Monitoring & Observability

### Metrics to Track
1. **Performance:** Response times, database query times
2. **Business:** Orders per minute, revenue, popular items
3. **System:** CPU, memory, connections
4. **Errors:** 4xx/5xx rates, failed orders

### Logging Strategy
```javascript
{
  level: "info",
  timestamp: "2024-01-01T12:00:00Z",
  service: "order-service",
  method: "POST /api/orders",
  statusCode: 201,
  responseTime: 45,
  userId: "...",
  shopId: "...",
  action: "order.created"
}
```

---

## Conclusion

This architecture is production-ready and follows best practices for:
- **Scalability:** Horizontal scaling, microservices-ready
- **Security:** Industry-standard auth, validation, and protection
- **Maintainability:** Clean MVC structure, separation of concerns
- **Performance:** Indexed queries, caching, optimized queries
- **Reliability:** Soft deletes, audit trails, backup strategies

The system is designed to evolve from a single-tenant monolith to a scalable multi-tenant SaaS platform without requiring architectural rewrites.