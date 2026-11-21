import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { app } from "./server.js";
import type {
  ApiEnvelope,
  AuthResult,
  CompanySummary,
  DriverProfile,
  DriverSummary,
  Review,
  VerificationState
} from "@roadcred/shared";

const server = app.listen(0);
const address = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${address.port}`;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<{ status: number; payload: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, payload: (await response.json()) as T };
}

describe("RoadCred API", () => {
  before(() => {
    assert.ok(address.port > 0);
  });

  after(() => {
    server.close();
  });

  it("reports API health", async () => {
    const payload = await getJson<ApiEnvelope<{ status: string; service: string }>>("/api/health");
    assert.equal(payload.data.status, "ok");
    assert.equal(payload.data.service, "roadcred-api");
  });

  it("filters drivers by country, license, and rating", async () => {
    const payload = await getJson<ApiEnvelope<DriverSummary[]>>(
      "/api/drivers?country=Germany&license=ADR&minRating=4.7"
    );

    assert.ok(payload.data.length >= 2);
    assert.ok(payload.data.every((driver) => driver.countries.includes("Germany")));
    assert.ok(payload.data.every((driver) => driver.licenses.includes("ADR")));
    assert.ok(payload.data.every((driver) => driver.rating.average >= 4.7));
  });

  it("returns profile details with experience, skills, availability, and reviews", async () => {
    const payload = await getJson<ApiEnvelope<DriverProfile>>("/api/drivers/driver-mateo-kovac");

    assert.equal(payload.data.name, "Demo Driver 01");
    assert.ok(payload.data.experience.length > 0);
    assert.ok(payload.data.reviews.length > 0);
    assert.ok(payload.data.skills.length > 0);
    assert.ok(payload.data.availabilityPeriods.length > 0);
    assert.equal(payload.data.reliability.documentsVerified, true);
  });

  it("lists companies with verification state", async () => {
    const payload = await getJson<ApiEnvelope<CompanySummary[]>>("/api/companies");
    assert.ok(payload.data.length >= 9);
    assert.ok(payload.data.every((company) => typeof company.verification.status === "string"));
    assert.ok(payload.data.every((company) => typeof company.visualIdentity.profileImageUrl === "string"));
  });

  it("searches drivers by availability window", async () => {
    const payload = await getJson<ApiEnvelope<DriverSummary[]>>(
      "/api/drivers?availableFrom=2026-09-25&availableTo=2026-10-05"
    );
    const ids = payload.data.map((driver) => driver.id);
    assert.ok(ids.includes("driver-anna-nowak"), "expected an available driver in the window");
    assert.ok(!ids.includes("driver-tomas-eriksen"), "contracted driver should be excluded");
    assert.ok(!ids.includes("driver-mateo-kovac"), "hired driver should be excluded");
  });

  it("filters drivers by skill", async () => {
    const payload = await getJson<ApiEnvelope<DriverSummary[]>>("/api/drivers?skill=Forklift%20operation");
    assert.ok(payload.data.length >= 1);
    assert.ok(payload.data.every((driver) => driver.skills.some((skill) => skill.name === "Forklift operation")));
  });

  it("creates a review and grows the subject rating count", async () => {
    const before = await getJson<ApiEnvelope<DriverProfile>>("/api/drivers/driver-anna-nowak");

    const { status, payload } = await postJson<ApiEnvelope<Review>>("/api/reviews", {
      subjectType: "driver",
      subjectId: "driver-anna-nowak",
      authorType: "company",
      authorId: "company-nordtrail",
      authorName: "NordTrail Logistics GmbH",
      rating: 5,
      title: "Great cooperation",
      comment: "On time and professional.",
      routeType: "ADR"
    });

    assert.equal(status, 201);
    assert.equal(payload.data.subjectId, "driver-anna-nowak");
    assert.equal(payload.data.verified, true);

    const after = await getJson<ApiEnvelope<DriverProfile>>("/api/drivers/driver-anna-nowak");
    assert.equal(after.data.rating.count, before.data.rating.count + 1);
  });

  it("rejects an invalid review rating", async () => {
    const { status } = await postJson("/api/reviews", {
      subjectType: "driver",
      subjectId: "driver-mateo-kovac",
      authorType: "company",
      authorId: "company-nordtrail",
      authorName: "NordTrail",
      rating: 9,
      title: "Bad",
      comment: "Out of range",
      routeType: "General"
    });
    assert.equal(status, 400);
  });

  it("completes mock verification for a driver", async () => {
    const { status, payload } = await postJson<ApiEnvelope<VerificationState>>(
      "/api/drivers/driver-nikola-jovanovic/verification",
      {}
    );
    assert.equal(status, 200);
    assert.equal(payload.data.status, "verified");
    assert.equal(payload.data.verifiedCount, payload.data.totalCount);

    const profile = await getJson<ApiEnvelope<DriverProfile>>("/api/drivers/driver-nikola-jovanovic");
    assert.equal(profile.data.profileVerified, true);
  });

  it("accepts demo admin and driver logins", async () => {
    const companyLogin = await postJson<ApiEnvelope<AuthResult>>("/api/auth/login", {
      email: "admin@nordtrail.eu",
      password: "demo1234"
    });

    assert.equal(companyLogin.status, 200);
    assert.equal(companyLogin.payload.data.user.role, "company");
    assert.equal(companyLogin.payload.data.user.id, "company-nordtrail");

    const driverLogin = await postJson<ApiEnvelope<AuthResult>>("/api/auth/login", {
      email: "driver-07@roadcred.demo",
      password: "demo1234"
    });

    assert.equal(driverLogin.status, 200);
    assert.equal(driverLogin.payload.data.user.role, "driver");
    assert.equal(driverLogin.payload.data.user.id, "driver-nikola-jovanovic");
    assert.equal(driverLogin.payload.data.user.name, "Demo Driver 07");
  });

  it("includes supplemental demo users and empty media fields", async () => {
    const drivers = await getJson<ApiEnvelope<DriverSummary[]>>("/api/drivers");
    assert.ok(drivers.data.some((driver) => driver.id === "driver-mira-horvat"));
    assert.ok(drivers.data.some((driver) => driver.id === "driver-erik-weiss"));
    assert.ok(drivers.data.some((driver) => driver.id === "driver-amina-haddad"));
    assert.ok(drivers.data.some((driver) => driver.id === "driver-petra-kovacova"));
    assert.ok(drivers.data.some((driver) => driver.id === "driver-ioannis-papadopoulos"));

    const companies = await getJson<ApiEnvelope<CompanySummary[]>>("/api/companies");
    assert.ok(companies.data.some((company) => company.id === "company-alpinefreight"));
    assert.ok(companies.data.some((company) => company.id === "company-balticroute"));
    assert.ok(companies.data.some((company) => company.id === "company-rhinebridge"));
    assert.ok(companies.data.some((company) => company.id === "company-medlogica"));
    assert.ok(companies.data.some((company) => company.id === "company-visegrad-auto"));
    assert.ok(companies.data.some((company) => company.id === "company-aegeanlink"));

    const mira = drivers.data.find((driver) => driver.id === "driver-mira-horvat");
    assert.equal(mira?.visualIdentity.profileImageUrl, "");
    assert.equal(mira?.visualIdentity.coverImageUrl, "");
    assert.deepEqual(mira?.visualIdentity.galleryImageUrls, []);
  });
});
