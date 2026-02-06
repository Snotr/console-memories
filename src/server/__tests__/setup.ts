// Test environment setup - preloaded before all test files
// This ensures env vars are set before any module imports
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = ":memory:";
process.env.AUTH_TOKEN = "test-token";
