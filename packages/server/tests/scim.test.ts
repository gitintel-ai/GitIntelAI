/**
 * SCIM 2.0 API E2E tests
 */
import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import app from "../src/index";
import { seedDatabase, resetDatabase, testOrg } from "./setup";

const baseUrl = "http://localhost:3001";

const scimHeaders: Record<string, string> = {
  Authorization: "Bearer scim_test_token",
  "Content-Type": "application/scim+json",
  "X-SCIM-Organization": testOrg.id,
};

describe("SCIM Service Provider Config", () => {
  test("GET /scim/v2/ServiceProviderConfig returns config", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/ServiceProviderConfig`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.schemas).toContain("urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig");
    expect(data.patch.supported).toBe(true);
  });

  test("GET /scim/v2/ResourceTypes returns resource types", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/ResourceTypes`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.Resources).toBeDefined();
    expect(data.Resources.some((r: any) => r.name === "User")).toBe(true);
  });

  test("GET /scim/v2/Schemas returns schemas", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Schemas`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.Resources).toBeDefined();
  });
});

describe("SCIM Users", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  test("GET /scim/v2/Users lists users", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.schemas).toContain("urn:ietf:params:scim:api:messages:2.0:ListResponse");
    expect(data.Resources).toBeDefined();
    expect(data.totalResults).toBeGreaterThanOrEqual(0);
  });

  test("POST /scim/v2/Users creates user", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "newuser@example.com",
          displayName: "New User",
          emails: [{ value: "newuser@example.com", primary: true }],
          active: true,
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.userName).toBe("newuser@example.com");
    expect(data.id).toBeDefined();
    expect(data.meta.resourceType).toBe("User");
  });

  test("GET /scim/v2/Users/:id returns user", async () => {
    // First create a user
    const createRes = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "getuser@example.com",
          active: true,
        }),
      })
    );
    const created = await createRes.json();

    // Then get it
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users/${created.id}`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userName).toBe("getuser@example.com");
  });

  test("PUT /scim/v2/Users/:id updates user", async () => {
    // Create user
    const createRes = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "updateuser@example.com",
          active: true,
        }),
      })
    );
    const created = await createRes.json();

    // Update user
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users/${created.id}`, {
        method: "PUT",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "updateuser@example.com",
          displayName: "Updated Name",
          active: false,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Updated Name");
    expect(data.active).toBe(false);
  });

  test("PATCH /scim/v2/Users/:id patches user", async () => {
    // Create user
    const createRes = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "patchuser@example.com",
          active: true,
        }),
      })
    );
    const created = await createRes.json();

    // Patch user (deactivate)
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users/${created.id}`, {
        method: "PATCH",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          Operations: [
            { op: "replace", path: "active", value: false },
          ],
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(false);
  });

  test("DELETE /scim/v2/Users/:id deactivates user", async () => {
    // Create user
    const createRes = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "deleteuser@example.com",
          active: true,
        }),
      })
    );
    const created = await createRes.json();

    // Delete user
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users/${created.id}`, {
        method: "DELETE",
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(204);
  });

  test("filter users by userName", async () => {
    // Create a user
    await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "filtertest@example.com",
          active: true,
        }),
      })
    );

    // Filter
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users?filter=userName eq "filtertest@example.com"`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalResults).toBeGreaterThanOrEqual(1);
  });

  test("user not found returns 404", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users/00000000-0000-4000-a000-999999999999`, {
        headers: scimHeaders,
      })
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.schemas).toContain("urn:ietf:params:scim:api:messages:2.0:Error");
  });

  test("duplicate user returns 409", async () => {
    // Create user
    await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "duplicate@example.com",
          active: true,
        }),
      })
    );

    // Try to create again
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "duplicate@example.com",
          active: true,
        }),
      })
    );

    expect(res.status).toBe(409);
  });

  test("missing userName returns 400", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        method: "POST",
        headers: scimHeaders,
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          displayName: "No Username",
          active: true,
        }),
      })
    );

    expect(res.status).toBe(400);
  });
});

describe("SCIM Authentication", () => {
  test("missing auth returns 401", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        headers: { "Content-Type": "application/scim+json" },
      })
    );

    expect(res.status).toBe(401);
  });

  test("missing org context returns 401", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/scim/v2/Users`, {
        headers: {
          Authorization: "Bearer scim_test_token",
          "Content-Type": "application/scim+json",
        },
      })
    );

    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  await resetDatabase();
});
