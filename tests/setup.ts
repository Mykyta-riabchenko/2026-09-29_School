import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  // Isolate the persistent offline cache between tests so a store
  // hydrated in one test never leaks into the next.
  try {
    localStorage.clear();
  } catch {
    // Storage may be unavailable — ignore.
  }
});

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // Ignore.
  }
});
