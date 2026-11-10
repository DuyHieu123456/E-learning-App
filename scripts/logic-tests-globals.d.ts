// Minimal ambient declarations for the logic-test compile
// (scripts/logic-tests.mjs compiles the pure modules standalone,
// without the Expo tsconfig that normally provides Node types).
declare const process: { env: Record<string, string | undefined> };
