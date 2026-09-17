# PROJECT CONTEXT
- **Name:** Vét Tủ (ChefMatch)
- **Type:** Mobile Application + RESTful API Backend
- **Core Mission:**
  1. **Ingredient-based Recipe Matching (Vét Tủ):** Help users find instant, practical recipes based on leftover ingredients in their fridge.
  2. **Hyper-local Community Sharing:** Allow neighbors to post, find, and share surplus fresh ingredients within nearby vicinity to reduce food waste.

---

# TECH STACK ARCHITECTURE

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React Native (Expo) | Cross-platform mobile UI, React Navigation, Axios |
| **State Management** | Zustand / Context API | Lightweight local/global state (Auth, Pantry selection) |
| **Backend** | Node.js + Express.js | RESTful API, authentication, matching algorithms, MVC structure |
| **Database** | MongoDB + Mongoose | Primary database, GeoJSON spatial index (`2dsphere`) for nearby queries |
| **Third-Party / BaaS** | Firebase Services | **Storage** (media uploads), **Auth** (Social Login), **FCM** (Push Notifications) |

> ⚠️ **CRITICAL DATABASE BOUNDARY:** Do NOT use Firebase Cloud Firestore or Realtime Database. All application data MUST reside strictly in **MongoDB**.

---

# STRICT DEVELOPMENT RULES & CONVENTIONS

## 1. General Principles
- **Clean & Modular Code:** Write concise, readable, self-documenting code with clear separation of concerns.
- **MVP Prioritization:** Prioritize MVP core flows:
  - Phase 1: Authentication & User Profile.
  - Phase 2: Ingredient Matcher ("Vét Tủ" algorithm).
  - Phase 3: Community Food Sharing & Claiming.

## 2. Naming Conventions
- **React Components & Screens:** `PascalCase` (e.g., `RecipeCard.js`, `PantryScreen.js`).
- **Files, Folders, Helpers, Variables:** `camelCase` (e.g., `axiosClient.js`, `calculateDistance.js`).
- **Database Models:** `PascalCase` singular (e.g., `User`, `Recipe`, `IngredientShare`).
- **RESTful Endpoints:** `kebab-case` or plural nouns (e.g., `/api/recipes/match`, `/api/shares/nearby`).

## 3. Standardized API Response Format
All Backend endpoints must return a predictable JSON payload:

```json
// Success Response (HTTP 200/201)
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}

// Error Response (HTTP 400/401/403/404/500)
{
  "success": false,
  "message": "Detailed error description",
  "errors": []
}
```

## 4. Geospatial Data Guidelines (MongoDB)
- Location coordinates must **STRICTLY** follow the GeoJSON specification: `[longitude, latitude]`.
- Always maintain a `2dsphere` index on location fields for spatial proximity queries (`$near`, `$geoWithin`).

## 5. Frontend Rules (React Native + Expo)
- **Hooks & Functional Style:** Use functional components with React Hooks exclusively.
- **Folder Organization:** Keep structure organized under `Fe/src/`:
  - `api/`: Centralized API clients with automatic JWT token attachment.
  - `components/`: Modular, reusable atomic components (`common/`, `recipe/`, `share/`).
  - `constants/`: Unified color palettes, typography, and spacing tokens.
  - `navigation/`: App, Auth, and BottomTab navigators.
  - `screens/`: Screen views organized by feature.
- **Never Hardcode IP/URL:** Always read API base URL from `process.env.EXPO_PUBLIC_API_URL`.

## 6. Backend Rules (Node.js + Express)
- **MVC + Service Architecture:** Separate logic across `routes/`, `controllers/`, `services/`, and `models/`.
- **Payload Validation:** Validate and sanitize all incoming request bodies, params, and queries.
- **Environment Security:** Never commit or hardcode credentials, secrets, or database URIs; strictly use `.env`.
- **Centralized Error Handling:** Pass errors to the global error middleware via `next(error)`.