import cors from "cors";
import express from "express";
import type {
  AuthUser,
  AvailabilityStatus,
  Booking,
  CompanyProfileUpdate,
  CreateInviteInput,
  CreateJobInput,
  CreateReviewInput,
  DriverFilters,
  DriverProfileUpdate,
  DriverSkill,
  AvailabilityPeriod,
  SignupInput
} from "@roadcred/shared";
import { repository } from "./db.js";

const availabilityValues = new Set<AvailabilityStatus>([
  "Available now",
  "Available in 2 weeks",
  "Open to offers",
  "Contracted"
]);

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    data: {
      status: "ok",
      service: "roadcred-api",
      timestamp: new Date().toISOString()
    }
  });
});

app.get("/api/drivers", (request, response) => {
  const filters: DriverFilters = {};

  if (typeof request.query.q === "string" && request.query.q.trim()) {
    filters.q = request.query.q.trim();
  }

  if (typeof request.query.country === "string" && request.query.country.trim()) {
    filters.country = request.query.country.trim();
  }

  if (typeof request.query.license === "string" && request.query.license.trim()) {
    filters.license = request.query.license.trim();
  }

  if (typeof request.query.language === "string" && request.query.language.trim()) {
    filters.language = request.query.language.trim();
  }

  if (typeof request.query.skill === "string" && request.query.skill.trim()) {
    filters.skill = request.query.skill.trim();
  }

  if (
    typeof request.query.availability === "string" &&
    availabilityValues.has(request.query.availability as AvailabilityStatus)
  ) {
    filters.availability = request.query.availability as AvailabilityStatus;
  }

  if (typeof request.query.availableFrom === "string" && request.query.availableFrom.trim()) {
    filters.availableFrom = request.query.availableFrom.trim();
  }

  if (typeof request.query.availableTo === "string" && request.query.availableTo.trim()) {
    filters.availableTo = request.query.availableTo.trim();
  }

  if (typeof request.query.minRating === "string") {
    const minRating = Number(request.query.minRating);
    if (!Number.isNaN(minRating)) {
      filters.minRating = minRating;
    }
  }

  if (request.query.verified === "true") {
    filters.verified = true;
  }

  const drivers = repository.listDrivers(filters);
  response.json({ data: drivers, meta: { count: drivers.length } });
});

app.get("/api/drivers/:id", (request, response) => {
  const driver = repository.getDriver(request.params.id);
  if (!driver) {
    response.status(404).json({ error: "Driver not found" });
    return;
  }

  response.json({ data: driver });
});

app.get("/api/companies", (_request, response) => {
  const companies = repository.listCompanies();
  response.json({ data: companies, meta: { count: companies.length } });
});

app.get("/api/companies/:id", (request, response) => {
  const company = repository.getCompany(request.params.id);
  if (!company) {
    response.status(404).json({ error: "Company not found" });
    return;
  }

  response.json({ data: company });
});

app.get("/api/jobs", (request, response) => {
  const companyId = typeof request.query.companyId === "string" ? request.query.companyId : undefined;
  const jobs = repository.listJobs(companyId);
  response.json({ data: jobs, meta: { count: jobs.length } });
});

function strField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string) : "";
}

function listField(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

app.post("/api/jobs", (request, response) => {
  const user = currentUser(request);
  if (!user || user.role !== "company") {
    response.status(403).json({ error: "Only companies can post routes" });
    return;
  }
  const body = (request.body ?? {}) as Record<string, unknown>;
  const title = strField(body, "title").trim();
  const origin = strField(body, "origin").trim();
  const destination = strField(body, "destination").trim();
  if (!title || !origin || !destination) {
    response.status(400).json({ error: "Invalid route payload" });
    return;
  }
  const input: CreateJobInput = {
    companyId: user.id,
    title,
    origin,
    destination,
    startDate: strField(body, "startDate"),
    endDate: strField(body, "endDate"),
    countries: listField(body, "countries"),
    truckType: strField(body, "truckType"),
    requiredLicense: strField(body, "requiredLicense"),
    languages: listField(body, "languages"),
    contractType: strField(body, "contractType"),
    payBand: strField(body, "payBand")
  };
  const job = repository.createJob(input);
  if (!job) {
    response.status(400).json({ error: "Invalid route payload" });
    return;
  }
  response.status(201).json({ data: job });
});

app.get("/api/matches/company/:companyId", (request, response) => {
  const matches = repository.recommendDriversForCompany(request.params.companyId);
  if (!matches) {
    response.status(404).json({ error: "Company not found" });
    return;
  }

  response.json({ data: matches, meta: { count: matches.length } });
});

function isReviewInput(body: unknown): body is CreateReviewInput {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const value = body as Record<string, unknown>;
  return (
    (value.subjectType === "driver" || value.subjectType === "company") &&
    (value.authorType === "driver" || value.authorType === "company") &&
    typeof value.subjectId === "string" &&
    typeof value.authorId === "string" &&
    typeof value.authorName === "string" &&
    typeof value.title === "string" &&
    typeof value.comment === "string" &&
    typeof value.routeType === "string" &&
    typeof value.rating === "number" &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5
  );
}

app.post("/api/reviews", (request, response) => {
  if (!isReviewInput(request.body)) {
    response.status(400).json({ error: "Invalid review payload" });
    return;
  }

  const review = repository.createReview({
    subjectType: request.body.subjectType,
    subjectId: request.body.subjectId,
    authorType: request.body.authorType,
    authorId: request.body.authorId,
    authorName: request.body.authorName.trim() || "Anonymous",
    rating: request.body.rating,
    title: request.body.title.trim() || "Review",
    comment: request.body.comment.trim(),
    routeType: request.body.routeType.trim() || "General"
  });

  if (!review) {
    response.status(404).json({ error: "Review subject not found" });
    return;
  }

  response.status(201).json({ data: review });
});

function readCheckIds(body: unknown): string[] | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const value = (body as Record<string, unknown>).checkIds;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value as string[];
  }
  return undefined;
}

app.post("/api/drivers/:id/verification", (request, response) => {
  const state = repository.submitVerification("driver", request.params.id, readCheckIds(request.body));
  if (!state) {
    response.status(404).json({ error: "Driver not found" });
    return;
  }

  response.json({ data: state });
});

app.post("/api/companies/:id/verification", (request, response) => {
  const state = repository.submitVerification("company", request.params.id, readCheckIds(request.body));
  if (!state) {
    response.status(404).json({ error: "Company not found" });
    return;
  }

  response.json({ data: state });
});

function isBookingInput(
  body: unknown
): body is { driverId: string; startDate: string; endDate: string; routeType?: string; note?: string } {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const value = body as Record<string, unknown>;
  return (
    typeof value.driverId === "string" &&
    value.driverId.length > 0 &&
    typeof value.startDate === "string" &&
    value.startDate.length > 0 &&
    typeof value.endDate === "string" &&
    value.endDate.length > 0 &&
    value.startDate <= value.endDate &&
    (value.routeType === undefined || typeof value.routeType === "string") &&
    (value.note === undefined || typeof value.note === "string")
  );
}

app.post("/api/bookings", (request, response) => {
  const user = currentUser(request);
  if (!user || user.role !== "company") {
    response.status(403).json({ error: "Only companies can book drivers" });
    return;
  }
  if (!isBookingInput(request.body)) {
    response.status(400).json({ error: "Invalid booking payload" });
    return;
  }
  const body = request.body as Record<string, unknown>;
  const str = (key: string): string => (typeof body[key] === "string" ? (body[key] as string) : "");
  const booking = repository.createBooking({
    driverId: String(body.driverId),
    companyId: user.id,
    companyName: user.name,
    startDate: String(body.startDate),
    endDate: String(body.endDate),
    routeType: typeof body.routeType === "string" && body.routeType ? body.routeType : "",
    origin: str("origin"),
    destination: str("destination"),
    originCountry: str("originCountry"),
    destinationCountry: str("destinationCountry"),
    note: str("note")
  });
  if (!booking) {
    response.status(404).json({ error: "Booking subject not found" });
    return;
  }
  response.status(201).json({ data: booking });
});

app.post("/api/bookings/:id/respond", (request, response) => {
  const user = currentUser(request);
  if (!user || user.role !== "driver") {
    response.status(403).json({ error: "Only drivers can respond to bookings" });
    return;
  }
  const status = (request.body as Record<string, unknown> | undefined)?.status;
  if (status !== "accepted" && status !== "declined") {
    response.status(400).json({ error: "Invalid decision" });
    return;
  }
  const booking = repository.respondToBooking(request.params.id, user.id, status);
  if (!booking) {
    response.status(404).json({ error: "Booking not found" });
    return;
  }
  response.json({ data: booking });
});

app.get("/api/bookings", (request, response) => {
  const driverId = typeof request.query.driverId === "string" ? request.query.driverId : undefined;
  const companyId = typeof request.query.companyId === "string" ? request.query.companyId : undefined;
  let bookings: Booking[];
  if (driverId) {
    bookings = repository.listBookingsForDriver(driverId);
  } else if (companyId) {
    bookings = repository.listBookingsForCompany(companyId);
  } else {
    response.status(400).json({ error: "driverId or companyId is required" });
    return;
  }
  response.json({ data: bookings, meta: { count: bookings.length } });
});

app.post("/api/invites", (request, response) => {
  const user = currentUser(request);
  if (!user || user.role !== "company") {
    response.status(403).json({ error: "Only companies can invite drivers" });
    return;
  }
  const body = (request.body ?? {}) as Record<string, unknown>;
  const driverEmail = strField(body, "driverEmail").trim();
  const driverName = strField(body, "driverName").trim();
  if (!driverEmail.includes("@") || !driverName) {
    response.status(400).json({ error: "Invalid invite payload" });
    return;
  }
  const input: CreateInviteInput = { driverEmail, driverName, note: strField(body, "note") };
  const invite = repository.createInvite(user.id, user.name, input);
  if (!invite) {
    response.status(400).json({ error: "Invalid invite payload" });
    return;
  }
  response.status(201).json({ data: invite });
});

app.get("/api/invites", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  const companyId =
    typeof request.query.companyId === "string" && request.query.companyId
      ? request.query.companyId
      : user.role === "company"
        ? user.id
        : "";
  if (!companyId) {
    response.status(400).json({ error: "companyId is required" });
    return;
  }
  const invites = repository.listInvites(companyId);
  response.json({ data: invites, meta: { count: invites.length } });
});

app.get("/api/invites/pending", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  const email = typeof request.query.email === "string" ? request.query.email : user.email;
  const invites = repository.listInvitesForEmail(email).filter((invite) => invite.status === "pending");
  response.json({ data: invites, meta: { count: invites.length } });
});

function currentUser(request: express.Request): AuthUser | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  return repository.getUserByToken(header.slice(7));
}

app.post("/api/auth/signup", (request, response) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const role = body.role;
  if (
    (role !== "driver" && role !== "company") ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    response.status(400).json({ error: "Invalid signup payload" });
    return;
  }

  const signupInput: SignupInput = { role, name: body.name, email: body.email, password: body.password };
  if (typeof body.city === "string") signupInput.city = body.city;
  if (typeof body.country === "string") signupInput.country = body.country;
  const result = repository.signup(signupInput);

  if ("error" in result) {
    response.status(409).json({ error: result.error });
    return;
  }

  response.status(201).json({ data: result });
});

app.post("/api/auth/login", (request, response) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    response.status(400).json({ error: "Email and password are required" });
    return;
  }

  const result = repository.login({ email: body.email, password: body.password });
  if (!result) {
    response.status(401).json({ error: "Invalid email or password" });
    return;
  }

  response.json({ data: result });
});

app.post("/api/auth/logout", (request, response) => {
  const header = request.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    repository.logout(header.slice(7));
  }
  response.json({ data: { ok: true } });
});

app.get("/api/auth/me", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  response.json({ data: user });
});

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function toVisualIdentityUpdate(body: Record<string, unknown>): DriverProfileUpdate["visualIdentity"] | undefined {
  if (typeof body.visualIdentity !== "object" || body.visualIdentity === null) {
    return undefined;
  }
  const visual = body.visualIdentity as Record<string, unknown>;
  const update: NonNullable<DriverProfileUpdate["visualIdentity"]> = {};
  if (typeof visual.profileImageUrl === "string") update.profileImageUrl = visual.profileImageUrl;
  if (typeof visual.coverImageUrl === "string") update.coverImageUrl = visual.coverImageUrl;
  const galleryImageUrls = toStringArray(visual.galleryImageUrls);
  if (galleryImageUrls) update.galleryImageUrls = galleryImageUrls;
  if (typeof visual.accentColor === "string") update.accentColor = visual.accentColor;
  if (typeof visual.tagline === "string") update.tagline = visual.tagline;
  return update;
}

function toDriverUpdate(body: Record<string, unknown>): DriverProfileUpdate {
  const update: DriverProfileUpdate = {};
  if (typeof body.headline === "string") update.headline = body.headline;
  if (typeof body.bio === "string") update.bio = body.bio;
  if (typeof body.city === "string") update.city = body.city;
  if (typeof body.country === "string") update.country = body.country;
  if (typeof body.availability === "string") update.availability = body.availability as AvailabilityStatus;
  const licenses = toStringArray(body.licenses);
  if (licenses) update.licenses = licenses;
  const languages = toStringArray(body.languages);
  if (languages) update.languages = languages;
  const countries = toStringArray(body.countries);
  if (countries) update.countries = countries;
  const preferredRegions = toStringArray(body.preferredRegions);
  if (preferredRegions) update.preferredRegions = preferredRegions;
  const routeTypes = toStringArray(body.routeTypes);
  if (routeTypes) update.routeTypes = routeTypes;
  const visualIdentity = toVisualIdentityUpdate(body);
  if (visualIdentity) update.visualIdentity = visualIdentity;
  if (Array.isArray(body.skills)) {
    update.skills = (body.skills as Record<string, unknown>[])
      .filter((skill) => typeof skill?.name === "string")
      .map((skill) => ({
        name: String(skill.name),
        category: String(skill.category ?? "Other") as DriverSkill["category"],
        level: String(skill.level ?? "Proficient") as DriverSkill["level"]
      }));
  }
  if (Array.isArray(body.availabilityPeriods)) {
    update.availabilityPeriods = (body.availabilityPeriods as Record<string, unknown>[])
      .filter((period) => typeof period?.startDate === "string")
      .map((period) => ({
        startDate: String(period.startDate),
        endDate: period.endDate ? String(period.endDate) : null,
        status: String(period.status ?? "Available") as AvailabilityPeriod["status"],
        note: typeof period.note === "string" ? period.note : ""
      }));
  }
  return update;
}

app.put("/api/drivers/:id", (request, response) => {
  const user = currentUser(request);
  if (!user || user.role !== "driver" || user.id !== request.params.id) {
    response.status(403).json({ error: "Not authorized to edit this profile" });
    return;
  }

  const updated = repository.updateDriver(request.params.id, toDriverUpdate((request.body ?? {}) as Record<string, unknown>));
  if (!updated) {
    response.status(404).json({ error: "Driver not found" });
    return;
  }
  response.json({ data: updated });
});

app.put("/api/companies/:id", (request, response) => {
  const user = currentUser(request);
  if (!user || user.role !== "company" || user.id !== request.params.id) {
    response.status(403).json({ error: "Not authorized to edit this profile" });
    return;
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  const update: CompanyProfileUpdate = {};
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.fleetType === "string") update.fleetType = body.fleetType;
  if (typeof body.responseTime === "string") update.responseTime = body.responseTime;
  if (typeof body.city === "string") update.city = body.city;
  if (typeof body.country === "string") update.country = body.country;
  const regions = toStringArray(body.operatingRegions);
  if (regions) update.operatingRegions = regions;
  const visualIdentity = toVisualIdentityUpdate(body);
  if (visualIdentity) update.visualIdentity = visualIdentity;

  const updated = repository.updateCompany(request.params.id, update);
  if (!updated) {
    response.status(404).json({ error: "Company not found" });
    return;
  }
  response.json({ data: updated });
});

app.get("/api/conversations", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  response.json({ data: repository.listConversations(user) });
});

app.post("/api/conversations", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  const body = (request.body ?? {}) as Record<string, unknown>;
  if (typeof body.counterpartId !== "string") {
    response.status(400).json({ error: "counterpartId is required" });
    return;
  }
  const conversation = repository.getOrCreateConversation(user, body.counterpartId);
  if (!conversation) {
    response.status(404).json({ error: "Counterpart not found" });
    return;
  }
  response.status(201).json({ data: conversation });
});

app.get("/api/conversations/:id", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  const thread = repository.getConversationThread(user, request.params.id);
  if (!thread) {
    response.status(404).json({ error: "Conversation not found" });
    return;
  }
  response.json({ data: thread });
});

app.post("/api/conversations/:id/messages", (request, response) => {
  const user = currentUser(request);
  if (!user) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }
  const body = (request.body ?? {}) as Record<string, unknown>;
  if (typeof body.body !== "string" || !body.body.trim()) {
    response.status(400).json({ error: "Message body is required" });
    return;
  }
  const message = repository.addMessage(user, request.params.id, body.body.trim());
  if (!message) {
    response.status(404).json({ error: "Conversation not found" });
    return;
  }
  response.status(201).json({ data: message });
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    console.log(`RoadCred API listening on http://localhost:${port}`);
  });
}
