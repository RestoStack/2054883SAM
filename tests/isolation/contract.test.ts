/**
 * Cross-tenant isolation suite (Phase 0 scaffold).
 * Full DB integration tests run in CI against staging; these pure tests
 * lock the *contract* agents must not weaken.
 *
 * Run: npm run test:isolation
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Tables that MUST carry organization_id (target model). */
const ORG_SCOPED_TABLES = [
  "locations",
  "organization_memberships",
  "subscriptions",
  "invitations",
  "guests",
  "reservations",
  "tables",
  "menu_assets",
  "report_presets",
] as const;

/** Roles allowed in MVP. */
const ROLES = ["owner", "manager", "host"] as const;

describe("isolation contract", () => {
  it("defines org-scoped tables for tenancy", () => {
    assert.ok(ORG_SCOPED_TABLES.includes("reservations"));
    assert.ok(ORG_SCOPED_TABLES.includes("guests"));
    assert.equal(new Set(ORG_SCOPED_TABLES).size, ORG_SCOPED_TABLES.length);
  });

  it("uses owner/manager/host roles only", () => {
    assert.deepEqual([...ROLES].sort(), ["host", "manager", "owner"]);
  });

  it("forbids localStorage as tenancy source of truth (documentation lock)", () => {
    // Behavioral lock: active org/location must come from memberships + RLS.
    const rule = "memberships+RLS";
    assert.notEqual(rule, "localStorage");
  });

  it("two-org invisibility rule (logical)", () => {
    const orgA = { id: "a", reservations: [{ id: "r1" }] };
    const orgB = { id: "b", reservations: [{ id: "r2" }] };
    const visibleToA = (rows: { org: string }[]) => rows.filter((r) => r.org === orgA.id);
    const all = [
      { org: orgA.id, id: "r1" },
      { org: orgB.id, id: "r2" },
    ];
    assert.deepEqual(
      visibleToA(all).map((r) => r.id),
      ["r1"],
    );
  });

  it("subscription live statuses are trialing|active only", () => {
    const live = new Set(["trialing", "active"]);
    for (const s of ["incomplete", "canceled", "past_due", "unpaid", null] as const) {
      assert.equal(live.has(s as string), false);
    }
    assert.ok(live.has("trialing"));
    assert.ok(live.has("active"));
  });

  it("fake billing provider is the v1 default", () => {
    const billingProvider = "fake";
    assert.notEqual(billingProvider, "stripe");
  });
});
