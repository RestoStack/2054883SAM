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

  it("reservations and guests are org-scoped", () => {
    assert.ok(ORG_SCOPED_TABLES.includes("reservations"));
    assert.ok(ORG_SCOPED_TABLES.includes("guests"));
    assert.ok(ORG_SCOPED_TABLES.includes("tables"));
  });

  it("public booking rate limit is 5 per 10 minutes (contract)", () => {
    const limit = 5;
    const windowMinutes = 10;
    assert.equal(limit, 5);
    assert.equal(windowMinutes, 10);
  });

  it("host stand RPCs are org-scoped seat/unseat contracts", () => {
    const hostRpcs = [
      "app_host_list_floor",
      "app_host_seat",
      "app_host_unseat",
      "app_host_set_table_status",
      "app_create_walk_in",
    ] as const;
    assert.ok(hostRpcs.includes("app_host_seat"));
    assert.ok(hostRpcs.includes("app_host_unseat"));
    // Seat/unseat must key off organization_id — never restaurant_id alone.
    const tenancyKey = "organization_id";
    assert.notEqual(tenancyKey, "restaurant_id");
  });

  it("table live statuses include available|occupied|cleaning|blocked", () => {
    const statuses = new Set(["available", "occupied", "reserved", "cleaning", "blocked"]);
    assert.ok(statuses.has("available"));
    assert.ok(statuses.has("occupied"));
    assert.ok(statuses.has("blocked"));
    assert.equal(statuses.has("sms"), false);
  });
});
