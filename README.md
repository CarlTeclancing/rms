# Restaurant Management System

A complete mobile-responsive restaurant management web app with a React/Vite frontend, Node.js/Express backend, Prisma ORM, JWT authentication, RBAC, Cloudinary uploads, and PostgreSQL/MySQL-ready data modeling.

## Features

- Admin login and JWT-protected API routes
- Role-based permissions
- POS sales flow with automatic stock deduction
- Public ordering portal for anonymous delivery orders
- Meal reservation requests
- Menu, categories, stock, ingredients, suppliers, expenses, users, roles
- Product images on menu/POS/customer ordering screens
- Dashboard metrics for sales, online orders, reservations, expenses, profit, and low-stock alerts
- Chart.js analytics for sales channels, top items, inventory, and expense categories
- Sales and expense reports
- Cloudinary receipt uploads
- Search, filters, pagination-ready API patterns
- Mobile bottom navigation and desktop sidebar
- Toasts, loading states, form validation, charts, modals, tables

## Structure

```text
backend/
  prisma/schema.prisma
  prisma/seed.js
  src/
    app.js
    server.js
    config/
    controllers/
    middleware/
    routes/
    services/
    utils/
frontend/
  src/
    components/
    context/
    hooks/
    layouts/
    pages/
    services/
    utils/
```

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Configure environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Set `DATABASE_URL`, `JWT_SECRET`, and Cloudinary keys in `backend/.env`.

PostgreSQL example:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/restaurant_system?schema=public"
```

MySQL example:

```env
DATABASE_URL="mysql://root:password@localhost:3306/restaurant_system"
```

If using MySQL, change `provider = "postgresql"` to `provider = "mysql"` in `backend/prisma/schema.prisma`.

4. Run migrations and seed data:

```bash
npm run prisma:migrate
npm run seed
```

5. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Default Login

- Email: `admin@restaurant.test`
- Password: `Admin123!`

## API Highlights

- `POST /api/auth/login`
- `GET /api/dashboard/stats`
- `GET /api/menu-items`
- `POST /api/menu-items`
- `PUT /api/menu-items/:id`
- `DELETE /api/menu-items/:id`
- `GET /api/stock-items`
- `POST /api/stock-items`
- `POST /api/sales`
- `GET /api/sales`
- `GET /api/public/menu`
- `POST /api/public/orders`
- `POST /api/public/reservations`
- `GET /api/online-orders`
- `GET /api/reservations`
- `POST /api/expenses`
- `GET /api/expenses`
- `GET /api/reports/sales`
- `GET /api/reports/expenses`
- `POST /api/upload/receipt`
