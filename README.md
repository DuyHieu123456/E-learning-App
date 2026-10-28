# E-Learning App

React Native + TypeScript (Expo) — group project.
Group: **Hieu (Duy) — leader**, Khanh, Loc.
Day-26 skeleton: navigation + all 12 teacher screens as navigable placeholders
rendering real local mock data. Full Figma UI comes in the following days.

## Requirements

- **Node.js >= 22** — check first: `node -v`
  (Expo SDK 58 does not run on Node 18; if you see
  `ReferenceError: File is not defined`, your Node is too old.)
- npm (comes with Node)
- Phone with the **Expo Go** app (Android preferred for the demo video),
  or an Android emulator.

## Setup (VS Code)

1. Clone this repo and open the **project root folder** in VS Code
   (the folder that contains `package.json`).
2. Open the integrated terminal in VS Code (`` Ctrl+` ``) and run:

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npx expo start
   ```

4. Scan the QR code in the terminal with **Expo Go** on your phone
   (phone and computer on the same Wi-Fi). If the school Wi-Fi blocks
   device-to-device traffic, use `npx expo start --tunnel`.

Useful commands:

```bash
npm run typecheck   # tsc --noEmit — must pass with 0 errors before you commit
npx expo start -c   # restart with a cleared cache (needed after env changes)
```

Recommended VS Code extensions: ESLint, Prettier,
ES7+ React/React-Native snippets, React Native Tools.
Note: red squiggles in VS Code while `npm run typecheck` passes are only the
editor's stale TypeScript server — run "TypeScript: Restart TS Server".

## Data — no backend yet

For now **all data is local**: `src/data/mockData.ts` holds the mock
categories / teachers / courses / chapters / lessons / reviews / projects /
Q&A, and screens read it through `src/services/api.ts` (never import
mockData directly from a screen except shared helpers).

**mockapi.io is deferred** (group decision, 2026-10-25): when the group
creates the mockapi project later, only `src/services/api.ts` changes —
it will fetch from `EXPO_PUBLIC_API_URL` and fall back to the local data.
Personal state (bookmarks, cart, learning progress) stays on-device in
AsyncStorage via `src/storage/storage.ts`; progress % is always derived
from `completedLessonIds`, never stored as a number.

## Project structure

```
src/
  navigation/   types.ts (route params — ids only), RootNavigator.tsx
                Bottom Tabs: Home / Search / My Courses / Profile
                Stack: CourseDetails, Learning, SearchResults,
                       TeacherProfile, Cart
  screens/
    home/       HomeScreen                     <- Hieu (Duy)
    course/     CourseDetailsScreen (3 tabs)   <- Hieu (Duy)
    cart/       CartScreen                     <- Hieu (Duy)
    search/     SearchScreen, SearchResults    <- Khanh
    learn/      LearningScreen (3 tabs)        <- Khanh
    mycourses/  MyCoursesScreen                <- Loc
    teacher/    TeacherProfileScreen           <- Loc
    profile/    UserProfileScreen              <- Loc
  components/   CourseCard, RatingStars, ProgressBar, SectionHeader
  data/         types.ts, mockData.ts  (shared — only Hieu edits)
  services/     api.ts                 (data access layer)
  storage/      storage.ts             (AsyncStorage persisted state)
  theme/        colors.ts, spacing.ts, typography.ts
```

Rules to avoid Git conflicts: each member works in their own `screens/<area>`
folder and on their own branch; shared files (`data/`, `theme/`,
`navigation/`) are edited by Hieu only — ask him if you need a change.

Note the two different course screens (do not merge them):
**CourseDetails** = not bought yet (Overview / Lessons / Review + Add to cart);
**Learning** = already bought (Lessons / Projects / Q&A).
