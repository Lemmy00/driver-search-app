import rawFixture from "./demo-fixture.json";

type Role = "company" | "driver";

type DemoUser = {
  role: Role;
  id: string;
  name: string;
  email: string;
};

type DemoFixture = {
  generatedAt: string;
  demoPassword: string;
  accounts: DemoUser[];
  drivers: Record<string, any>[];
  companies: Record<string, any>[];
  jobs: Record<string, any>[];
  bookings?: Record<string, any>[];
  invites?: Record<string, any>[];
  matchesByCompanyId: Record<string, Record<string, any>[]>;
  conversationsByUserId: Record<
    string,
    {
      summaries: Record<string, any>[];
      threadsById: Record<string, Record<string, any>>;
    }
  >;
};

const fixture = rawFixture as DemoFixture;
const tokenPrefix = "roadcred-demo:";
let state = clone(fixture);
state.bookings ??= [];
state.invites ??= [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function ok(data: unknown, meta?: Record<string, unknown>, status = 200): Response {
  return json(meta ? { data, meta } : { data }, status);
}

function fail(error: string, status: number): Response {
  return json({ error }, status);
}

function segmentsFromParams(params: Record<string, unknown>): string[] {
  const value = params.path;
  const raw = Array.isArray(value) ? value.join("/") : typeof value === "string" ? value : "";
  return raw.split("/").filter(Boolean);
}

function tokenFor(user: DemoUser): string {
  return `${tokenPrefix}${user.role}:${encodeURIComponent(user.id)}:${encodeURIComponent(user.email)}`;
}

function currentUser(request: Request): DemoUser | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length);
  if (!token.startsWith(tokenPrefix)) {
    return null;
  }

  const [role, id, email] = token.slice(tokenPrefix.length).split(":");
  if ((role !== "company" && role !== "driver") || !id || !email) {
    return null;
  }

  const decodedId = decodeURIComponent(id);
  const decodedEmail = decodeURIComponent(email);
  return (
    state.accounts.find(
      (account) => account.role === role && account.id === decodedId && account.email === decodedEmail
    ) ?? null
  );
}

async function readBody(request: Request): Promise<Record<string, any>> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, any>) : {};
  } catch {
    return {};
  }
}

function lower(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function includesText(values: unknown[], needle: string): boolean {
  return values.some((value) => lower(value).includes(needle));
}

function listField(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function arrayField(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null) : [];
}

function driverMatchesPeriod(driver: Record<string, any>, from: string | null, to: string | null): boolean {
  if (!from && !to) {
    return true;
  }

  const fromValue = from ?? "0000-01-01";
  const toValue = to ?? "9999-12-31";
  const overlaps = (period: Record<string, any>) => {
    const startDate = String(period.startDate ?? "0000-01-01");
    const endDate = String(period.endDate ?? "9999-12-31");
    return startDate <= toValue && endDate >= fromValue;
  };
  const periods = arrayField(driver.availabilityPeriods);
  // Mirror the Express isAvailableInWindow: available only if an "Available" period
  // overlaps AND no "Hired" (e.g. booked) block does.
  const hasAvailable = periods.some((period) => String(period.status) === "Available" && overlaps(period));
  const blocked = periods.some((period) => String(period.status) === "Hired" && overlaps(period));
  return hasAvailable && !blocked;
}

function listDrivers(url: URL): Record<string, any>[] {
  const q = lower(url.searchParams.get("q") ?? "").trim();
  const country = url.searchParams.get("country");
  const license = url.searchParams.get("license");
  const language = url.searchParams.get("language");
  const skill = url.searchParams.get("skill");
  const availability = url.searchParams.get("availability");
  const availableFrom = url.searchParams.get("availableFrom");
  const availableTo = url.searchParams.get("availableTo");
  const minRating = Number(url.searchParams.get("minRating") ?? "");
  const verified = url.searchParams.get("verified") === "true";

  return state.drivers.filter((driver) => {
    const skills = arrayField(driver.skills);
    if (q) {
      const searchable = [
        driver.name,
        driver.city,
        driver.country,
        driver.headline,
        ...listField(driver.licenses),
        ...listField(driver.languages),
        ...listField(driver.countries),
        ...listField(driver.routeTypes),
        ...listField(driver.preferredRegions),
        ...skills.map((item) => item.name)
      ];
      if (!includesText(searchable, q)) return false;
    }
    if (country && driver.country !== country) return false;
    if (license && !listField(driver.licenses).includes(license)) return false;
    if (language && !listField(driver.languages).includes(language)) return false;
    if (skill && !skills.some((item) => item.name === skill)) {
      return false;
    }
    if (availability && driver.availability !== availability) return false;
    if (!Number.isNaN(minRating) && driver.rating?.average < minRating) return false;
    if (verified && !driver.profileVerified) return false;
    return driverMatchesPeriod(driver, availableFrom, availableTo);
  });
}

function findDriver(id: string): Record<string, any> | undefined {
  return state.drivers.find((driver) => driver.id === id);
}

function findCompany(id: string): Record<string, any> | undefined {
  return state.companies.find((company) => company.id === id);
}

function getSubject(role: Role, id: string): Record<string, any> | undefined {
  return role === "driver" ? findDriver(id) : findCompany(id);
}

function recomputeVerification(subject: Record<string, any>): void {
  const checks = Array.isArray(subject.verification?.checks) ? subject.verification.checks : [];
  const verifiedCount = checks.filter((check: Record<string, any>) => check.status === "verified").length;
  const totalCount = checks.length;
  subject.verification = {
    status: totalCount > 0 && verifiedCount === totalCount ? "verified" : verifiedCount > 0 ? "pending" : "unverified",
    verifiedCount,
    totalCount,
    checks
  };
}

function applyVerification(role: Role, id: string, checkIds?: string[]): Response {
  const subject = getSubject(role, id);
  if (!subject) {
    return fail(role === "driver" ? "Driver not found" : "Company not found", 404);
  }

  const requested = new Set(checkIds ?? []);
  const verifyAll = requested.size === 0;
  const today = new Date().toISOString().slice(0, 10);
  const checks = Array.isArray(subject.verification?.checks) ? subject.verification.checks : [];
  checks.forEach((check: Record<string, any>) => {
    if (verifyAll || requested.has(check.id)) {
      check.status = "verified";
      check.verifiedAt = today;
    }
  });
  recomputeVerification(subject);
  if (subject.verification.status === "verified") {
    if (role === "driver") {
      subject.profileVerified = true;
    } else {
      subject.verified = true;
    }
  }
  return ok(subject.verification);
}

function updateRating(subject: Record<string, any>, rating: number): void {
  const current = subject.rating ?? { average: 0, count: 0, verifiedCount: 0 };
  const count = Number(current.count ?? 0) + 1;
  const average = count === 1 ? rating : (Number(current.average ?? 0) * Number(current.count ?? 0) + rating) / count;
  subject.rating = {
    average: Math.round(average * 10) / 10,
    count,
    verifiedCount: Number(current.verifiedCount ?? 0) + 1
  };
}

function createReview(body: Record<string, any>): Response {
  if (body.subjectType !== "driver" && body.subjectType !== "company") {
    return fail("Invalid review payload", 400);
  }

  const subject = getSubject(body.subjectType, String(body.subjectId ?? ""));
  if (!subject) {
    return fail("Review subject not found", 404);
  }

  const review = {
    id: `review-${body.subjectId}-${Date.now()}`,
    subjectType: body.subjectType,
    subjectId: String(body.subjectId),
    authorType: body.authorType === "driver" ? "driver" : "company",
    authorId: String(body.authorId ?? ""),
    authorName: String(body.authorName ?? "Anonymous").trim() || "Anonymous",
    rating: Number(body.rating),
    title: String(body.title ?? "Review").trim() || "Review",
    comment: String(body.comment ?? "").trim(),
    routeType: String(body.routeType ?? "General").trim() || "General",
    occurredAt: new Date().toISOString().slice(0, 10),
    verified: true
  };

  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    return fail("Invalid review payload", 400);
  }

  subject.reviews = [review, ...(Array.isArray(subject.reviews) ? subject.reviews : [])];
  updateRating(subject, review.rating);
  return ok(review, undefined, 201);
}

function writeBookingPeriod(
  driver: Record<string, any>,
  periodId: string,
  startDate: string,
  endDate: string,
  companyName: string,
  note: string
): void {
  driver.availabilityPeriods = [
    ...arrayField(driver.availabilityPeriods),
    { id: periodId, startDate, endDate, status: "Hired", note: note || `Booked by ${companyName}`, origin: "booking" }
  ];
}

function createBooking(request: Request, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user || user.role !== "company") {
    return fail("Only companies can book drivers", 403);
  }
  const driverId = String(body.driverId ?? "");
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? "");
  if (!driverId || !startDate || !endDate || startDate > endDate) {
    return fail("Invalid booking payload", 400);
  }
  const driver = findDriver(driverId);
  if (!driver) {
    return fail("Booking subject not found", 404);
  }
  const str = (key: string): string => (typeof body[key] === "string" ? body[key] : "");
  // A company booking is a REQUEST: created "pending" (blue "Reserved" on the company's
  // own calendar). No availability period is carved until the driver accepts it.
  const booking = {
    id: `booking-${driverId}-${Date.now()}`,
    driverId,
    driverName: driver.name,
    companyId: user.id,
    companyName: user.name,
    startDate,
    endDate,
    routeType: typeof body.routeType === "string" && body.routeType ? body.routeType : "",
    origin: str("origin"),
    destination: str("destination"),
    originCountry: str("originCountry"),
    destinationCountry: str("destinationCountry"),
    note: str("note"),
    status: "pending",
    createdAt: new Date().toISOString(),
    availabilityPeriodId: null
  };
  state.bookings = [booking, ...(state.bookings ?? [])];
  return ok(booking, undefined, 201);
}

function createJob(request: Request, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user || user.role !== "company") {
    return fail("Only companies can post routes", 403);
  }
  const title = String(body.title ?? "").trim();
  const origin = String(body.origin ?? "").trim();
  const destination = String(body.destination ?? "").trim();
  if (!title || !origin || !destination) {
    return fail("Invalid route payload", 400);
  }
  const startDate = typeof body.startDate === "string" ? body.startDate : "";
  const endDate = typeof body.endDate === "string" ? body.endDate : "";
  if (startDate && endDate && startDate > endDate) {
    return fail("Invalid route payload", 400);
  }
  const job = {
    id: `job-${user.id}-${Date.now()}`,
    companyId: user.id,
    companyName: user.name,
    title,
    origin,
    destination,
    countries: listFieldLoose(body.countries),
    truckType: typeof body.truckType === "string" ? body.truckType : "",
    requiredLicense: typeof body.requiredLicense === "string" ? body.requiredLicense : "",
    languages: listFieldLoose(body.languages),
    startWindow: startDate && endDate ? `${startDate} to ${endDate}` : "Flexible start",
    startDate,
    endDate,
    contractType: typeof body.contractType === "string" ? body.contractType : "",
    payBand: typeof body.payBand === "string" ? body.payBand : "",
    status: "Open",
    createdAt: new Date().toISOString().slice(0, 10)
  };
  state.jobs = [job, ...state.jobs];
  return ok(job, undefined, 201);
}

function listFieldLoose(value: unknown): string[] {
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

function createInvite(request: Request, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user || user.role !== "company") {
    return fail("Only companies can invite drivers", 403);
  }
  const driverEmail = String(body.driverEmail ?? "").trim();
  const driverName = String(body.driverName ?? "").trim();
  if (!driverEmail.includes("@") || !driverName) {
    return fail("Invalid invite payload", 400);
  }
  const sentAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const invite = {
    id: `invite-${crypto.randomUUID().slice(0, 8)}`,
    companyId: user.id,
    companyName: user.name,
    driverEmail,
    driverName,
    note: typeof body.note === "string" ? body.note : "",
    status: "pending",
    sentAt,
    expiresAt,
    createdAt: sentAt
  };
  state.invites = [invite, ...(state.invites ?? [])];
  return ok(invite, undefined, 201);
}

function respondToBooking(request: Request, id: string, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user || user.role !== "driver") {
    return fail("Only drivers can respond to bookings", 403);
  }
  const status = body.status;
  if (status !== "accepted" && status !== "declined") {
    return fail("Invalid decision", 400);
  }
  const booking = (state.bookings ?? []).find((entry) => entry.id === id);
  if (!booking || booking.driverId !== user.id) {
    return fail("Booking not found", 404);
  }
  const driver = findDriver(booking.driverId);
  if (status === "accepted") {
    booking.status = "accepted";
    if (!booking.availabilityPeriodId && driver) {
      const periodId = `per-${driver.id}-booking-${Date.now()}`;
      booking.availabilityPeriodId = periodId;
      writeBookingPeriod(driver, periodId, booking.startDate, booking.endDate, booking.companyName, booking.note);
    }
  } else {
    booking.status = "declined";
    if (booking.availabilityPeriodId && driver) {
      driver.availabilityPeriods = arrayField(driver.availabilityPeriods).filter(
        (period) => period.id !== booking.availabilityPeriodId
      );
    }
  }
  return ok(booking);
}

function applyVisualIdentity(subject: Record<string, any>, body: Record<string, any>): void {
  if (typeof body.visualIdentity !== "object" || body.visualIdentity === null) {
    return;
  }
  subject.visualIdentity = {
    ...(subject.visualIdentity ?? {}),
    ...body.visualIdentity
  };
}

function updateDriver(request: Request, id: string, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user || user.role !== "driver" || user.id !== id) {
    return fail("Not authorized to edit this profile", 403);
  }

  const driver = findDriver(id);
  if (!driver) {
    return fail("Driver not found", 404);
  }

  [
    "headline",
    "bio",
    "city",
    "country",
    "availability",
    "licenses",
    "languages",
    "countries",
    "preferredRegions",
    "routeTypes",
    "skills"
  ].forEach((key) => {
    if (body[key] !== undefined) {
      driver[key] = body[key];
    }
  });
  if (Array.isArray(body.availabilityPeriods)) {
    // Booking-origin blocks are authoritative — keep them and replace only the driver's own periods.
    const booked = arrayField(driver.availabilityPeriods).filter((period) => period.origin === "booking");
    const own = arrayField(body.availabilityPeriods).filter((period) => period.origin !== "booking");
    driver.availabilityPeriods = [...booked, ...own];
  }
  applyVisualIdentity(driver, body);
  return ok(driver);
}

function updateCompany(request: Request, id: string, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user || user.role !== "company" || user.id !== id) {
    return fail("Not authorized to edit this profile", 403);
  }

  const company = findCompany(id);
  if (!company) {
    return fail("Company not found", 404);
  }

  ["description", "fleetType", "responseTime", "city", "country", "operatingRegions"].forEach((key) => {
    if (body[key] !== undefined) {
      company[key] = body[key];
    }
  });
  applyVisualIdentity(company, body);
  return ok(company);
}

function conversationBucket(user: DemoUser): { summaries: Record<string, any>[]; threadsById: Record<string, any> } {
  state.conversationsByUserId[user.id] ??= { summaries: [], threadsById: {} };
  return state.conversationsByUserId[user.id];
}

function startConversation(request: Request, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user) {
    return fail("Not authenticated", 401);
  }

  const counterpartRole: Role = user.role === "company" ? "driver" : "company";
  const counterpartId = String(body.counterpartId ?? "");
  const counterpart = getSubject(counterpartRole, counterpartId);
  if (!counterpart) {
    return fail("Counterpart not found", 404);
  }

  const bucket = conversationBucket(user);
  const existing = bucket.summaries.find((summary) => summary.counterpartId === counterpartId);
  if (existing) {
    return ok(existing, undefined, 201);
  }

  const now = new Date().toISOString();
  const id = `conv-${crypto.randomUUID().slice(0, 8)}`;
  const summary = {
    id,
    counterpartId,
    counterpartName: counterpart.name,
    counterpartRole,
    lastMessage: "",
    lastMessageAt: now,
    messageCount: 0
  };
  bucket.summaries = [summary, ...bucket.summaries];
  bucket.threadsById[id] = {
    id,
    counterpartId,
    counterpartName: counterpart.name,
    counterpartRole,
    messages: []
  };
  return ok(summary, undefined, 201);
}

function getConversation(request: Request, id: string): Response {
  const user = currentUser(request);
  if (!user) {
    return fail("Not authenticated", 401);
  }
  const thread = conversationBucket(user).threadsById[id];
  return thread ? ok(thread) : fail("Conversation not found", 404);
}

function sendMessage(request: Request, id: string, body: Record<string, any>): Response {
  const user = currentUser(request);
  if (!user) {
    return fail("Not authenticated", 401);
  }

  const bucket = conversationBucket(user);
  const thread = bucket.threadsById[id];
  if (!thread) {
    return fail("Conversation not found", 404);
  }

  const text = String(body.body ?? "").trim();
  if (!text) {
    return fail("Message body is required", 400);
  }

  const message = {
    id: `msg-${crypto.randomUUID().slice(0, 8)}`,
    conversationId: id,
    senderRole: user.role,
    senderId: user.id,
    body: text,
    createdAt: new Date().toISOString()
  };
  thread.messages = [...(Array.isArray(thread.messages) ? thread.messages : []), message];

  const summary = bucket.summaries.find((item) => item.id === id);
  if (summary) {
    summary.lastMessage = text;
    summary.lastMessageAt = message.createdAt;
    summary.messageCount = thread.messages.length;
  }

  return ok(message, undefined, 201);
}

function signup(body: Record<string, any>): Response {
  const role = body.role === "driver" ? "driver" : body.role === "company" ? "company" : null;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!role || !email.includes("@") || password.length < 6) {
    return fail("Invalid signup payload", 400);
  }
  if (state.accounts.some((account) => account.email === email)) {
    return fail("An account with this email already exists", 409);
  }

  const name = String(body.name ?? "").trim() || (role === "company" ? "New Company" : "New Driver");
  const id = `${role}-${crypto.randomUUID().slice(0, 8)}`;
  const user = { role, id, name, email };
  state.accounts = [...state.accounts, user];
  if (role === "driver") {
    state.drivers = [
      {
        id,
        name,
        city: String(body.city ?? "New"),
        country: String(body.country ?? "RoadCred"),
        headline: "New driver on RoadCred",
        bio: "Just joined RoadCred and is building a portable reputation profile.",
        yearsExperience: 0,
        availability: "Available now",
        licenses: [],
        languages: ["English"],
        countries: [],
        preferredRegions: [],
        routeTypes: [],
        skills: [],
        availabilityPeriods: [],
        rating: { average: 0, count: 0, verifiedCount: 0 },
        completedTransports: 0,
        responseRate: 100,
        profileVerified: false,
        verification: { status: "unverified", verifiedCount: 0, totalCount: 0, checks: [] },
        visualIdentity: { profileImageUrl: "", coverImageUrl: "", galleryImageUrls: [], accentColor: "#2f64e6", tagline: "" },
        lastActive: new Date().toISOString().slice(0, 10),
        reliability: { onTimeRate: 100, incidentFreeRate: 100, documentsVerified: false },
        experience: [],
        reviews: []
      },
      ...state.drivers
    ];
  } else {
    state.companies = [
      {
        id,
        name,
        city: String(body.city ?? "New"),
        country: String(body.country ?? "RoadCred"),
        description: "New company on RoadCred.",
        fleetType: "General freight",
        operatingRegions: [],
        rating: { average: 0, count: 0, verifiedCount: 0 },
        activeJobs: 0,
        verified: false,
        verification: { status: "unverified", verifiedCount: 0, totalCount: 0, checks: [] },
        visualIdentity: { profileImageUrl: "", coverImageUrl: "", galleryImageUrls: [], accentColor: "#2f64e6", tagline: "" },
        responseTime: "New on RoadCred",
        reviews: [],
        openJobs: []
      },
      ...state.companies
    ];
  }

  return ok({ token: tokenFor(user), user }, undefined, 201);
}

export async function onRequest(context: { request: Request; params: Record<string, unknown> }): Promise<Response> {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const url = new URL(request.url);
  const segments = segmentsFromParams(context.params);

  try {
    if (request.method === "GET" && segments[0] === "health") {
      return ok({ status: "ok", service: "roadcred-pages-demo-api", timestamp: new Date().toISOString() });
    }

    if (request.method === "GET" && segments.length === 1 && segments[0] === "drivers") {
      const drivers = listDrivers(url);
      return ok(drivers, { count: drivers.length });
    }
    if (request.method === "GET" && segments.length === 2 && segments[0] === "drivers") {
      const driver = findDriver(segments[1]);
      if (!driver) {
        return fail("Driver not found", 404);
      }
      return ok({ ...driver, bookings: (state.bookings ?? []).filter((entry) => entry.driverId === driver.id) });
    }
    if (request.method === "PUT" && segments.length === 2 && segments[0] === "drivers") {
      return updateDriver(request, segments[1], await readBody(request));
    }
    if (request.method === "POST" && segments.length === 3 && segments[0] === "drivers" && segments[2] === "verification") {
      const body = await readBody(request);
      return applyVerification("driver", segments[1], Array.isArray(body.checkIds) ? body.checkIds : undefined);
    }

    if (request.method === "GET" && segments.length === 1 && segments[0] === "companies") {
      return ok(state.companies, { count: state.companies.length });
    }
    if (request.method === "GET" && segments.length === 2 && segments[0] === "companies") {
      const company = findCompany(segments[1]);
      return company ? ok(company) : fail("Company not found", 404);
    }
    if (request.method === "PUT" && segments.length === 2 && segments[0] === "companies") {
      return updateCompany(request, segments[1], await readBody(request));
    }
    if (
      request.method === "POST" &&
      segments.length === 3 &&
      segments[0] === "companies" &&
      segments[2] === "verification"
    ) {
      const body = await readBody(request);
      return applyVerification("company", segments[1], Array.isArray(body.checkIds) ? body.checkIds : undefined);
    }

    if (request.method === "GET" && segments.length === 1 && segments[0] === "jobs") {
      const companyId = url.searchParams.get("companyId");
      const jobs = companyId ? state.jobs.filter((job) => job.companyId === companyId) : state.jobs;
      return ok(jobs, { count: jobs.length });
    }
    if (request.method === "POST" && segments.length === 1 && segments[0] === "jobs") {
      return createJob(request, await readBody(request));
    }
    if (request.method === "GET" && segments.length === 3 && segments[0] === "matches" && segments[1] === "company") {
      return state.matchesByCompanyId[segments[2]]
        ? ok(state.matchesByCompanyId[segments[2]], { count: state.matchesByCompanyId[segments[2]].length })
        : fail("Company not found", 404);
    }
    if (request.method === "POST" && segments.length === 1 && segments[0] === "reviews") {
      return createReview(await readBody(request));
    }

    if (request.method === "POST" && segments.length === 1 && segments[0] === "bookings") {
      return createBooking(request, await readBody(request));
    }
    if (request.method === "POST" && segments.length === 3 && segments[0] === "bookings" && segments[2] === "respond") {
      return respondToBooking(request, segments[1], await readBody(request));
    }
    if (request.method === "GET" && segments.length === 1 && segments[0] === "bookings") {
      const driverId = url.searchParams.get("driverId");
      const companyId = url.searchParams.get("companyId");
      let list = state.bookings ?? [];
      if (driverId) {
        list = list.filter((entry) => entry.driverId === driverId);
      }
      if (companyId) {
        list = list.filter((entry) => entry.companyId === companyId);
      }
      return ok(list, { count: list.length });
    }

    if (request.method === "POST" && segments.length === 1 && segments[0] === "invites") {
      return createInvite(request, await readBody(request));
    }
    if (request.method === "GET" && segments.length === 2 && segments[0] === "invites" && segments[1] === "pending") {
      const user = currentUser(request);
      if (!user) {
        return fail("Not authenticated", 401);
      }
      const email = (url.searchParams.get("email") ?? user.email).toLowerCase();
      const list = (state.invites ?? []).filter(
        (invite) => String(invite.driverEmail).toLowerCase() === email && invite.status === "pending"
      );
      return ok(list, { count: list.length });
    }
    if (request.method === "GET" && segments.length === 1 && segments[0] === "invites") {
      const user = currentUser(request);
      if (!user) {
        return fail("Not authenticated", 401);
      }
      const companyId =
        url.searchParams.get("companyId") || (user.role === "company" ? user.id : "");
      if (!companyId) {
        return fail("companyId is required", 400);
      }
      const list = (state.invites ?? []).filter((invite) => invite.companyId === companyId);
      return ok(list, { count: list.length });
    }

    if (request.method === "POST" && segments[0] === "auth" && segments[1] === "login") {
      const body = await readBody(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const user = state.accounts.find((account) => account.email === email);
      return user && password === state.demoPassword
        ? ok({ token: tokenFor(user), user })
        : fail("Invalid email or password", 401);
    }
    if (request.method === "POST" && segments[0] === "auth" && segments[1] === "signup") {
      return signup(await readBody(request));
    }
    if (request.method === "POST" && segments[0] === "auth" && segments[1] === "logout") {
      return ok({ ok: true });
    }
    if (request.method === "GET" && segments[0] === "auth" && segments[1] === "me") {
      const user = currentUser(request);
      return user ? ok(user) : fail("Not authenticated", 401);
    }

    if (segments[0] === "conversations") {
      const user = currentUser(request);
      if (!user) {
        return fail("Not authenticated", 401);
      }
      if (request.method === "GET" && segments.length === 1) {
        return ok(conversationBucket(user).summaries);
      }
      if (request.method === "POST" && segments.length === 1) {
        return startConversation(request, await readBody(request));
      }
      if (request.method === "GET" && segments.length === 2) {
        return getConversation(request, segments[1]);
      }
      if (request.method === "POST" && segments.length === 3 && segments[2] === "messages") {
        return sendMessage(request, segments[1], await readBody(request));
      }
    }

    return fail("Not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Demo API error", 500);
  }
}
