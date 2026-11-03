import "@testing-library/jest-dom/vitest";
// Classes IndexedDB globales (IDBRequest…) : idb s'appuie sur elles pour envelopper les objets.
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest tourne sans `globals` : Testing Library ne démonte pas tout seul entre deux tests.
afterEach(cleanup);
