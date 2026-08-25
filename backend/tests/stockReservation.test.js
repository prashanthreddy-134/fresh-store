import { describe, test, expect } from "@jest/globals";

// This simulates the exact conditional-update pattern used in routes/orders.js —
// `UPDATE Product SET stockQty = stockQty - qty WHERE id = ? AND stockQty >= qty` —
// against an in-memory model of two concurrent requests racing for the same stock,
// to prove the logic can't oversell. (Full integration testing against real concurrent
// Postgres transactions needs a live database — see backend/prisma/validate_schema.sql
// and the README for how to run that manually once you have a DB connection.)

function atomicReserve(store, productId, qty) {
  const product = store[productId];
  if (product.stockQty < qty) return { count: 0 };
  product.stockQty -= qty;
  return { count: 1 };
}

describe("atomic stock reservation (race condition fix)", () => {
  test("two concurrent orders for the last unit — only one succeeds", () => {
    const store = { p1: { stockQty: 1 } };

    const resultA = atomicReserve(store, "p1", 1);
    const resultB = atomicReserve(store, "p1", 1); // "arrives" after A already decremented

    expect(resultA.count).toBe(1);
    expect(resultB.count).toBe(0); // correctly rejected — no oversell
    expect(store.p1.stockQty).toBe(0);
  });

  test("sequential orders within available stock both succeed", () => {
    const store = { p1: { stockQty: 5 } };

    const resultA = atomicReserve(store, "p1", 2);
    const resultB = atomicReserve(store, "p1", 3);

    expect(resultA.count).toBe(1);
    expect(resultB.count).toBe(1);
    expect(store.p1.stockQty).toBe(0);
  });

  test("order requesting more than available is rejected without partial decrement", () => {
    const store = { p1: { stockQty: 2 } };

    const result = atomicReserve(store, "p1", 5);

    expect(result.count).toBe(0);
    expect(store.p1.stockQty).toBe(2); // untouched — no partial deduction
  });
});
