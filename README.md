**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_API_URL=http://localhost:4000/api

# Optional fallbacks if VITE_API_URL is not set
VITE_BACKEND_API_URL=http://localhost:4000/api
VITE_BASE44_APP_BASE_URL=http://localhost:4000

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_API_URL=https://your-backend.onrender.com/api
```

Run the app: `npm run dev`

## Run with Docker

This project can be built and served as a production container.

Build the image (replace values with your own):

```bash
docker build \
	--build-arg VITE_BASE44_APP_ID=your_app_id \
	--build-arg VITE_BASE44_APP_BASE_URL=your_backend_url \
	--build-arg VITE_BASE44_FUNCTIONS_VERSION=your_functions_version \
	-t coeur-table-partage:latest .
```

Run the container:

```bash
docker run --name coeur-table-partage -p 8080:80 -d coeur-table-partage:latest
```

Open the app at `http://localhost:8080`.

Notes:

- Vite environment variables are embedded at build time, so changing them requires rebuilding the image.
- SPA routing is supported through the included Nginx fallback to `index.html`.

## Deploy Frontend on Vercel + Backend on Render

Frontend (Vercel):

- Set `VITE_API_URL=https://your-backend.onrender.com/api`
- Keep `vercel.json` in the project root so SPA routes resolve to `index.html`

Backend (Render):

- Set `CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app`
- Set `NODE_ENV=production`
- Set `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`
- For cross-site auth cookies, set `REFRESH_COOKIE_SAME_SITE=none` and `REFRESH_COOKIE_SECURE=true`
- For Google login, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL=https://your-backend-domain/api/auth/google/callback`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
