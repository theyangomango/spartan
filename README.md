# Spartan

Mobile fitness/social app built with Expo React Native + Firebase.

## Quick Start

```bash
npm install
npm run start
```

Optional platform runs:

```bash
npm run ios
npm run android
```

## Project Layout

- `App.js`: app bootstrap, auth hydration, root navigation wiring.
- `frontend/screens/`: screen-level routes and page containers.
- `frontend/components/`: reusable UI and feature components.
- `frontend/logic/`, `frontend/services/`, `frontend/utils/`: client-side orchestration, service helpers, and shared utility logic.
- `backend/`: client-side Firebase data operations grouped by domain (posts, messages, workouts, user).
- `functions/`: Firebase Cloud Functions (callables, triggers, scheduled jobs).
- `shared/`: logic shared by multiple runtime surfaces.
- `scripts/`: project maintenance scripts.

## Naming and Organization Rules

- Prefer descriptive file names (`FeatureAction.js`) over numbered prefixes for new files.
- Keep route-level code in `frontend/screens`; move reusable pieces into `frontend/components`.
- Put side-effect-free helpers in `frontend/utils` or `shared`.
- Keep comments short and intent-focused; explain non-obvious behavior, not obvious syntax.

## Maintenance Commands

```bash
# Validate reachable local imports from App.js
npm run audit:imports

# Report frontend files not reachable from App.js
npm run audit:unused:frontend
```

Use these before and after major refactors or file removals.
