# API Reference

Current backend routes exposed by the Food Ordering API.

## Base URL
- Development: `http://localhost:5000/api`
- All routes return JSON. For protected endpoints send `Authorization: Bearer <jwt>`.

## Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "optional message"
}
```
Validation failures respond with `success: false` and `details` when available.

---

## Health & Diagnostics
- `GET /api/health` – service heartbeat.
- `GET /api/debug-env` – echo selected environment variables (unauthenticated).

---

## Authentication
- `POST /api/auth/register` – create user `{ email, password, name, role (customer|restaurant_owner|driver|admin), phone? }`.
- `POST /api/auth/login` – authenticate `{ email, password }`.
- `GET /api/auth/me` – return the authenticated user.
- `PUT /api/auth/profile` – update `{ name?, phone?, avatar? }`.
- `PUT /api/auth/change-password` – `{ currentPassword, newPassword }`.

Roles are enforced by individual routes (see below); `admin` bypasses role checks.

---

## Restaurants
- `GET /api/restaurants` – public list. Query: `page`, `pageSize`, `search`, `cuisine`, `priceRange`, `sortBy` (default `rating`), `sortOrder` (`asc|desc`).
- `GET /api/restaurants/:id` – public details with categories/items, reviews, counts.
- `GET /api/restaurants/my/all` – auth (restaurant_owner/admin). Returns the caller’s restaurant (owners have one).
- `POST /api/restaurants` – auth (restaurant_owner/admin). Body: `name`, `description`, `cuisine`, `address`, `phone?`, `email?`, `priceRange (budget|medium|premium)`, `deliveryFee`, `minOrderAmount`, `estimatedDeliveryTime`.
- `PUT /api/restaurants/:id` – auth owner/admin. Body fields above plus `banner`, `isOpen`.
- `DELETE /api/restaurants/:id` – auth owner/admin.

---

## Menu Management (`/api/menu`, auth required)
- `POST /api/menu/categories` – create category `{ restaurantId, name, description?, order? }`.
- `PUT /api/menu/categories/:id` – update `{ name?, description?, order?, isActive? }`.
- `DELETE /api/menu/categories/:id` – remove category.
- `POST /api/menu/items` – create menu item `{ restaurantId, categoryId, name, description, price, image?, preparationTime? }`.
- `PUT /api/menu/items/:id` – update menu item fields `{ name?, description?, price?, image?, isAvailable?, preparationTime? }`.
- `DELETE /api/menu/items/:id` – delete menu item.
- `POST /api/menu/customizations` – add customization group `{ menuItemId, name, type, required? }`.
- `POST /api/menu/customization-options` – add option `{ menuItemCustomizationId, name, priceModifier }`.

Restaurant ownership is checked for menu items/categories; customization routes require auth but currently do not enforce ownership in code.

---

## Menu Items (public browse + protected CRUD)
- `GET /api/menu-items` – requires `restaurantId` query, optional `categoryId`.
- `GET /api/menu-items/:id` – fetch single item with customizations.
- `POST /api/menu-items` – auth owner/admin. Same body as menu item creation above.
- `PUT /api/menu-items/:id` – auth owner/admin. Same updatable fields as above.
- `DELETE /api/menu-items/:id` – auth owner/admin.

---

## Orders (`/api/orders`, auth required)
- `POST /api/orders` – customers only. Body:  
  - `restaurantId`  
  - `items`: `[{ menuItemId, quantity, customizations?: [{ customizationId, optionId, optionName?, priceModifier? }] }]`  
  - `deliveryAddress`: `{ street, latitude?, longitude?, instructions? }`  
  - `paymentMethod`: `card | digital_wallet | cash_on_delivery`  
  - `scheduledFor?` (ISO string), `notes?`  
  Enforces restaurant open status and minimum order amount; totals include restaurant delivery fee.
- `GET /api/orders/my` – list orders for the caller (customers, their restaurant as owner, or driver’s deliveries). Query: `page`, `pageSize`, `status?`.
- `GET /api/orders/:id` – view an order if you are the customer, restaurant owner, assigned driver, or admin.
- `PUT /api/orders/:id/status` – restaurant owner/driver/admin. Body `{ status }` with allowed transitions enforced (e.g., `pending`→`confirmed|cancelled`, `ready_for_pickup`→`out_for_delivery|delivered`).
- `PUT /api/orders/:id/cancel` – customer or admin; blocked once out for delivery/delivered.
- `PUT /api/orders/:orderId/assign-driver` – restaurant_owner/admin/driver. Body `{ driverId }`; creates/updates delivery record and marks order `confirmed`.

---

## Order Management (`/api/orders/manage`, auth required)
- `GET /api/orders/manage/restaurant/:restaurantId` – owner/admin list with optional `status` query.
- `PUT /api/orders/manage/:id/status` – owner/admin. Body `{ status }`.
- `POST /api/orders/manage/:id/accept` – owner; only from `pending` → `confirmed`.
- `POST /api/orders/manage/:id/reject` – owner; only from `pending` → `cancelled`.

---

## Payments (`/api/payment`)
- `POST /api/payment/webhook` – Stripe webhook endpoint (raw JSON body; no auth).
- `POST /api/payment/create-intent` – auth; customer owning the order. Body `{ orderId }`. Returns Stripe `clientSecret` and `paymentIntentId`.
- `POST /api/payment/confirm` – auth; updates payment using `{ paymentIntentId }`.
- `POST /api/payment/refund` – auth admin. Body `{ orderId, reason }`. Marks payment refunded after Stripe refund.

---

## Uploads (`/api/upload`)
- `POST /api/upload/image` – auth. `multipart/form-data` with field `image` and `restaurantId`. Ensures caller owns the restaurant; responds with file `url` (served via `/api/upload/file/:filename`).
- `GET /api/upload/file/:filename` – public file serving for uploaded assets.

---

## Restaurant Stats
- `GET /api/stats/:restaurantId` – auth owner/admin. Returns totals (orders, revenue), last-30-day daily counts, and top menu items for delivered orders.

---

## Driver API (`/api/driver`, auth required)
- `GET /api/driver/available-deliveries` – list orders in `ready_for_pickup` without a driver.
- `POST /api/driver/deliveries/:id/accept` – accept delivery for order `id`; sets order to `out_for_delivery` and driver status to `busy`.
- `PUT /api/driver/status` – update driver availability `{ status: offline|online|busy }`.
- `PUT /api/driver/location` – update driver coordinates `{ lat, lng }`.
- `PUT /api/driver/deliveries/:id/status` – update delivery `{ status }`; when set to `delivered` it closes the order and increments driver earnings/deliveries.
- `GET /api/driver/earnings` – aggregate totals (all time, today, last 7 days, last 30 days).
- `GET /api/driver/deliveries` – list deliveries for the authenticated driver.

---

## WebSocket Events
Namespace uses the same host as the API.

- Join rooms: `join-order <orderId>`, `join-restaurant <restaurantId>`, `join-user <userId>`, `join-driver <driverId>`.
- Driver location updates: client emits `driver-location-update { orderId, lat, lng }`; server broadcasts `location-update` and `driver-location-update` to the order room.
- Delivery status updates: client emits `delivery-status-update { orderId, restaurantId, status }`; server broadcasts `order-status-update` to order and restaurant rooms.

---

## Roles At A Glance
- `customer`: place/cancel orders, view own orders.
- `restaurant_owner`: manage their restaurant, menus, orders, drivers for their orders.
- `driver`: accept/update deliveries, update status/location, view earnings.
- `admin`: full access; bypasses role checks.
