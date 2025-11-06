```markdown
# Server (User Authentication API)
 
Simple Express.js API for user registration and login with CSRF protection and Swagger docs.
 
## Features
- User registration and login (JWT)
- Password hashing with bcryptjs
- CSRF protection using `csurf`
- API documentation with Swagger (swagger-jsdoc + swagger-ui-express)
- MongoDB via Mongoose
 
## Prerequisites
- Node.js v16+ (or compatible)
- npm
- MongoDB instance (local or cloud)
 
## Getting started (local)
 
1. Clone the repository
   git clone <repo-url>
   cd <repo-folder>
 
2. Install dependencies
   npm install
 
3. Create environment file
   Create a `.env` in repo root with at least:

   PORT=
   MONGO_URI=
   JWT_SECRET=your_jwt_secret
   
   Adjust values as needed.
 
4. Start the server
   - Development (auto-reload):
     npm run dev
 
5. API docs (Swagger)
   - Open http://localhost:5000/api-docs (or change port in `.env`)
 
## Important implementation notes
- CSRF:
  - The app exposes `GET /api/csrf-token` which returns a token from `req.csrfToken()`. The client must send this token in header `x-csrf-token` (unless you configured a different header).
  - You may use the Swagger UI "Authorize" button (apiKey header) or the custom docs page that fetches the token and injects it using `requestInterceptor`.
- Swagger:
  - The OpenAPI spec is generated via `swagger-jsdoc` from JSDoc comments in `./routes/*.js`.
  - Raw JSON is available at `/swagger-output.json`.
 
## Common commands
- Install: `npm install`
- Start dev server: `npm run dev`
- Generate docs (jsdoc): `npm run docs` (if configured)
 
## Project structure (example)
- index.js / app.js — Express entry point
- routes/ — route files (e.g., userRoutes.js)
- controllers/ — route handlers (e.g., userController.js)
- middlewares/ — middleware (csrf, error handlers)
- config/ — DB and other config
- swagger.js — swagger setup
- package.json — scripts & deps
 
## How to test CSRF flow with Swagger UI
1. Open Swagger UI at `/api-docs`.
2. If you added the apiKey security scheme, click "Authorize" and paste the token returned by `GET /api/csrf-token`.

## JSDoc Documentation
You can generate the API and code documentation using JSDoc.
- Run the command to generate docs:
-npm run docs
- This will create a `docs` folder in the project root.
- Open the documentation by opening `index.html` inside the `docs` folder in a web browser to view detailed docs for methods and functions.
## License
MIT
```
