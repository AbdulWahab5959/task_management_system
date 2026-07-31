# LaunchStack Frontend

React TypeScript frontend for the LaunchStack SaaS Boilerplate.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173` by default.

## Environment

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Key Areas

- `src/pages/Auth`: login and registration
- `src/pages/Dashboard`: dashboard, profile, and settings pages
- `src/components/common`: reusable UI primitives
- `src/components/dashboard`: dashboard layout components
- `src/services`: Axios API services
- `src/context` and `src/hooks`: authentication state
