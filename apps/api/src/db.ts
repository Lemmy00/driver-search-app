import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { DEMO_PASSWORD, demoAccounts, demoDriverNames } from "@roadcred/shared";
import type {
  AuthResult,
  AuthUser,
  AvailabilityPeriod,
  AvailabilityStatus,
  Booking,
  BookingStatus,
  CreateBookingInput,
  CompanyProfile,
  CompanyProfileUpdate,
  CompanySummary,
  ConversationSummary,
  ConversationThread,
  CreateReviewInput,
  CreateJobInput,
  CreateInviteInput,
  DriverFilters,
  DriverProfile,
  DriverProfileUpdate,
  DriverSkill,
  DriverSummary,
  ExperienceItem,
  Invite,
  Job,
  LoginInput,
  MatchRecommendation,
  Message,
  ProfileVisualIdentity,
  RatingSummary,
  ReliabilityMetrics,
  Review,
  SignupInput,
  DemoAccount,
  VerificationCheck,
  VerificationState
} from "@roadcred/shared";

const SCHEMA_VERSION = 7;

type DriverRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  headline: string;
  bio: string;
  years_experience: number;
  availability: AvailabilityStatus;
  licenses: string;
  languages: string;
  countries: string;
  preferred_regions: string;
  route_types: string;
  rating_average: number;
  review_count: number;
  verified_review_count: number;
  completed_transports: number;
  response_rate: number;
  profile_verified: number;
  last_active: string;
  on_time_rate: number;
  incident_free_rate: number;
  documents_verified: number;
  profile_image_url: string;
  cover_image_url: string;
  gallery_image_urls: string;
  accent_color: string;
  profile_tagline: string;
};

type CompanyRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  fleet_type: string;
  operating_regions: string;
  rating_average: number;
  review_count: number;
  verified_review_count: number;
  active_jobs: number;
  verified: number;
  response_time: string;
  profile_image_url: string;
  cover_image_url: string;
  gallery_image_urls: string;
  accent_color: string;
  profile_tagline: string;
};

type ExperienceRow = {
  id: string;
  company_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  countries: string;
  truck_types: string;
  description: string;
  verified: number;
};

type ReviewRow = {
  id: string;
  subject_type: "driver" | "company";
  subject_id: string;
  author_type: "driver" | "company";
  author_id: string;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  route_type: string;
  occurred_at: string;
  verified: number;
};

type JobRow = {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  origin: string;
  destination: string;
  countries: string;
  truck_type: string;
  required_license: string;
  languages: string;
  start_window: string;
  start_date: string;
  end_date: string;
  contract_type: string;
  pay_band: string;
  status: "Open" | "Interviewing" | "Paused";
  created_at: string;
};

type SkillRow = {
  id: string;
  driver_id: string;
  name: string;
  category: DriverSkill["category"];
  level: DriverSkill["level"];
};

type PeriodRow = {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string | null;
  status: AvailabilityPeriod["status"];
  note: string;
  origin: string;
};

type BookingRow = {
  id: string;
  driver_id: string;
  driver_name: string;
  company_id: string;
  company_name: string;
  start_date: string;
  end_date: string;
  route_type: string;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  note: string;
  status: BookingStatus;
  created_at: string;
  availability_period_id: string | null;
};

type InviteRow = {
  id: string;
  company_id: string;
  company_name: string;
  driver_email: string;
  driver_name: string;
  note: string;
  status: Invite["status"];
  sent_at: string;
  expires_at: string;
  created_at: string;
};

type VerificationRow = {
  id: string;
  subject_type: "driver" | "company";
  subject_id: string;
  label: string;
  description: string;
  status: VerificationCheck["status"];
  verified_at: string | null;
};

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
mkdirSync(dataDir, { recursive: true });

const databasePath = process.env.ROADCRED_DB_PATH ?? path.join(dataDir, "roadcred.sqlite");
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");

function json(value: string[]): string {
  return JSON.stringify(value);
}

function parseList(value: string): string[] {
  return JSON.parse(value) as string[];
}

function parseListSafe(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) {
    return false;
  }
  const derived = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return derived.length === keyBuffer.length && timingSafeEqual(derived, keyBuffer);
}

const DRIVER_VERIFICATION_CHECKS: [string, string][] = [
  ["Identity", "Government ID matched to profile"],
  ["Driving licence", "Licence class and validity confirmed"],
  ["Specialist certificates", "ADR / tanker / oversized permits"],
  ["Tachograph card", "Digital tachograph driver card valid"],
  ["Background & references", "Prior-employer references checked"]
];

const COMPANY_VERIFICATION_CHECKS: [string, string][] = [
  ["Business registration", "Company registration number verified"],
  ["VAT / tax ID", "EU VAT number validated"],
  ["Operating licence", "Community transport licence confirmed"],
  ["Insurance certificate", "Carrier liability cover confirmed"]
];

function rating(row: {
  rating_average: number;
  review_count: number;
  verified_review_count: number;
}): RatingSummary {
  return {
    average: Number(row.rating_average),
    count: Number(row.review_count),
    verifiedCount: Number(row.verified_review_count)
  };
}

function visualIdentity(row: {
  profile_image_url: string;
  cover_image_url: string;
  gallery_image_urls: string;
  accent_color: string;
  profile_tagline: string;
}): ProfileVisualIdentity {
  return {
    profileImageUrl: row.profile_image_url,
    coverImageUrl: row.cover_image_url,
    galleryImageUrls: parseListSafe(row.gallery_image_urls),
    accentColor: row.accent_color || "#2f64e6",
    tagline: row.profile_tagline
  };
}

function resetIfNeeded(): void {
  const { user_version: version } = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  if (version >= 4) {
    return;
  }

  db.exec(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS conversations;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS verification_checks;
    DROP TABLE IF EXISTS availability_periods;
    DROP TABLE IF EXISTS driver_skills;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS jobs;
    DROP TABLE IF EXISTS experience;
    DROP TABLE IF EXISTS companies;
    DROP TABLE IF EXISTS drivers;
  `);
}

function setupSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      headline TEXT NOT NULL,
      bio TEXT NOT NULL,
      years_experience INTEGER NOT NULL,
      availability TEXT NOT NULL,
      licenses TEXT NOT NULL,
      languages TEXT NOT NULL,
      countries TEXT NOT NULL,
      preferred_regions TEXT NOT NULL,
      route_types TEXT NOT NULL,
      rating_average REAL NOT NULL,
      review_count INTEGER NOT NULL,
      verified_review_count INTEGER NOT NULL,
      completed_transports INTEGER NOT NULL,
      response_rate INTEGER NOT NULL,
      profile_verified INTEGER NOT NULL,
      last_active TEXT NOT NULL,
      on_time_rate INTEGER NOT NULL,
      incident_free_rate INTEGER NOT NULL,
      documents_verified INTEGER NOT NULL,
      profile_image_url TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      gallery_image_urls TEXT NOT NULL DEFAULT '[]',
      accent_color TEXT NOT NULL DEFAULT '#2f64e6',
      profile_tagline TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      description TEXT NOT NULL,
      fleet_type TEXT NOT NULL,
      operating_regions TEXT NOT NULL,
      rating_average REAL NOT NULL,
      review_count INTEGER NOT NULL,
      verified_review_count INTEGER NOT NULL,
      active_jobs INTEGER NOT NULL,
      verified INTEGER NOT NULL,
      response_time TEXT NOT NULL,
      profile_image_url TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT NOT NULL DEFAULT '',
      gallery_image_urls TEXT NOT NULL DEFAULT '[]',
      accent_color TEXT NOT NULL DEFAULT '#2f64e6',
      profile_tagline TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS experience (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      role TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      countries TEXT NOT NULL,
      truck_types TEXT NOT NULL,
      description TEXT NOT NULL,
      verified INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      subject_type TEXT NOT NULL CHECK (subject_type IN ('driver', 'company')),
      subject_id TEXT NOT NULL,
      author_type TEXT NOT NULL CHECK (author_type IN ('driver', 'company')),
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      route_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      verified INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      countries TEXT NOT NULL,
      truck_type TEXT NOT NULL,
      required_license TEXT NOT NULL,
      languages TEXT NOT NULL,
      start_window TEXT NOT NULL,
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      contract_type TEXT NOT NULL,
      pay_band TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Open', 'Interviewing', 'Paused')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS driver_skills (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('Familiar', 'Proficient', 'Expert'))
    );

    CREATE TABLE IF NOT EXISTS availability_periods (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL CHECK (status IN ('Available', 'Hired', 'Tentative')),
      note TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL DEFAULT 'driver'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      driver_name TEXT NOT NULL,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      route_type TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      origin_country TEXT NOT NULL DEFAULT '',
      destination_country TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
      created_at TEXT NOT NULL,
      availability_period_id TEXT
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      driver_email TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
      sent_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_checks (
      id TEXT PRIMARY KEY,
      subject_type TEXT NOT NULL CHECK (subject_type IN ('driver', 'company')),
      subject_id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('unverified', 'pending', 'verified')),
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('driver', 'company')),
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      UNIQUE (company_id, driver_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('driver', 'company')),
      sender_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

type MigratableTable = "drivers" | "companies" | "availability_periods" | "jobs" | "bookings";

function columnExists(table: MigratableTable, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function addColumnIfMissing(table: MigratableTable, column: string, definition: string): void {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateProfileVisuals(): void {
  (["drivers", "companies"] as const).forEach((table) => {
    addColumnIfMissing(table, "profile_image_url", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(table, "cover_image_url", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(table, "gallery_image_urls", "TEXT NOT NULL DEFAULT '[]'");
    addColumnIfMissing(table, "accent_color", "TEXT NOT NULL DEFAULT '#2f64e6'");
    addColumnIfMissing(table, "profile_tagline", "TEXT NOT NULL DEFAULT ''");
  });
  // Bookings write availability periods with origin='booking' so a driver's own
  // calendar edits (replace-all) can't wipe or un-block them.
  addColumnIfMissing("availability_periods", "origin", "TEXT NOT NULL DEFAULT 'driver'");
}

function migrateRoutesAndInvites(): void {
  // Routes (from -> to) on bookings; structured dates on jobs.
  addColumnIfMissing("bookings", "origin", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("bookings", "destination", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("bookings", "origin_country", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("bookings", "destination_country", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("jobs", "start_date", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("jobs", "end_date", "TEXT NOT NULL DEFAULT ''");
  // NOTE: 'Reserved' is a UI-only calendar state computed client-side from PENDING
  // bookings (visible only to the reserving company). It is NEVER persisted as an
  // availability_period, so the availability_periods status CHECK is left untouched.
  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      driver_email TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
      sent_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

const demoReviewComments = {
  "review-mateo-1": "Kept dispatch updated before every border and delivered with clean temperature logs.",
  "review-anna-1": "Flagged a documentation issue early and prevented a delayed handoff.",
  "review-luis-1": "Handled receiver changes professionally and protected the cold-chain process.",
  "review-mira-supp-1": "Sealed trailer checks and customer notes were consistently excellent.",
  "review-erik-supp-1": "Managed the Gdansk-Copenhagen rotation without missed loading windows.",
  "review-petra-1": "Handled tight plant windows and a last-minute dock change without delay.",
  "review-sofia-1": "Checked seals thoroughly and kept dispatch updated during port congestion.",
  "review-david-1": "Protected the delivery window despite a ferry delay and kept paperwork clean.",
  "review-kateryna-1": "Caught a customs document mismatch before departure and avoided a border delay.",
  "review-ioannis-1": "Planned ferry timing well and kept the reefer load within tolerance."
};

const demoFleetTypes = {
  "company-iberiafreight": "Refrigerated, high-value, and ADR freight",
  "company-rhinebridge": "Container, Ro-Ro, curtainsider, and refrigerated fleet",
  "company-visegrad-auto": "Automotive JIT, box, curtainsider, and ADR-capable freight"
};

const demoInvitees = {
  "invite-seed-1": ["invitee-01@example.com", "Demo Invitee 01"],
  "invite-seed-2": ["invitee-02@example.com", "Demo Invitee 02"],
  "invite-seed-3": ["invitee-03@example.com", "Demo Invitee 03"]
} as const;

const demoIntroMessage = "Hi! We have a Hamburg–Rotterdam refrigerated rotation opening in two weeks. Are you available?";

function seedDatabase() {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM drivers").get() as { count: number };
  if (existing.count > 0) {
    return;
  }

  db.exec("BEGIN;");
  try {
    const insertDriver = db.prepare(`
      INSERT INTO drivers (
        id,
        name,
        city,
        country,
        headline,
        bio,
        years_experience,
        availability,
        licenses,
        languages,
        countries,
        preferred_regions,
        route_types,
        rating_average,
        review_count,
        verified_review_count,
        completed_transports,
        response_rate,
        profile_verified,
        last_active,
        on_time_rate,
        incident_free_rate,
        documents_verified
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    [
      [
        "driver-mateo-kovac",
        demoDriverNames["driver-mateo-kovac"],
        "Zagreb",
        "Croatia",
        "Cross-border CE driver for refrigerated and high-value freight",
        "Eleven years moving temperature-sensitive freight across Central Europe. Known for strict documentation, calm border handling, and consistent delivery communication.",
        11,
        "Available now",
        json(["CE", "ADR", "Refrigerated"]),
        json(["Croatian", "English", "German"]),
        json(["Croatia", "Slovenia", "Austria", "Germany", "Italy"]),
        json(["DACH", "Balkans", "Northern Italy"]),
        json(["Refrigerated", "Long-haul", "Cross-border"]),
        4.9,
        36,
        31,
        428,
        94,
        1,
        "2026-06-17",
        98,
        99,
        1
      ],
      [
        "driver-anna-nowak",
        demoDriverNames["driver-anna-nowak"],
        "Poznan",
        "Poland",
        "ADR-certified route lead for Benelux and German lanes",
        "Specializes in scheduled industrial freight with strong safety records and practical German-speaking dispatch coordination.",
        8,
        "Open to offers",
        json(["C", "CE", "ADR"]),
        json(["Polish", "English", "German"]),
        json(["Poland", "Germany", "Netherlands", "Belgium", "Czech Republic"]),
        json(["Benelux", "DACH", "Central Europe"]),
        json(["ADR", "Industrial", "Cross-border"]),
        4.7,
        24,
        20,
        295,
        91,
        1,
        "2026-06-16",
        96,
        98,
        1
      ],
      [
        "driver-luis-martin",
        demoDriverNames["driver-luis-martin"],
        "Valencia",
        "Spain",
        "Iberia-France refrigerated specialist with export documentation focus",
        "Experienced with fruit, pharma-adjacent cold chain, and mixed French-Spanish dispatch teams. Prefers predictable weekly lanes.",
        10,
        "Available in 2 weeks",
        json(["C", "CE", "Refrigerated"]),
        json(["Spanish", "English", "French"]),
        json(["Spain", "France", "Portugal", "Italy"]),
        json(["Iberia", "France", "Northern Italy"]),
        json(["Refrigerated", "Long-haul", "Export"]),
        4.8,
        28,
        23,
        352,
        89,
        1,
        "2026-06-15",
        97,
        98,
        1
      ],
      [
        "driver-jelena-petrovic",
        demoDriverNames["driver-jelena-petrovic"],
        "Novi Sad",
        "Serbia",
        "Oversized-load driver for Balkans, Austria, and Germany",
        "Heavy-route driver with escort coordination experience, strong compliance habits, and a clean incident record on complex routes.",
        13,
        "Available now",
        json(["CE", "Oversized"]),
        json(["Serbian", "English", "German"]),
        json(["Serbia", "Hungary", "Austria", "Germany", "Romania"]),
        json(["Balkans", "DACH", "Central Europe"]),
        json(["Oversized", "Industrial", "Cross-border"]),
        4.6,
        19,
        16,
        241,
        87,
        1,
        "2026-06-17",
        95,
        99,
        1
      ],
      [
        "driver-ovidiu-ionescu",
        demoDriverNames["driver-ovidiu-ionescu"],
        "Cluj-Napoca",
        "Romania",
        "Flexible Central Europe driver for general cargo and express lanes",
        "Reliable on medium-distance work, comfortable with mixed fleets, and often available for short-notice rotations.",
        6,
        "Open to offers",
        json(["C", "CE", "C1E"]),
        json(["Romanian", "English", "Italian"]),
        json(["Romania", "Hungary", "Italy", "Austria", "Slovakia"]),
        json(["Central Europe", "Balkans", "Northern Italy"]),
        json(["General cargo", "Express", "Cross-border"]),
        4.5,
        17,
        12,
        188,
        92,
        1,
        "2026-06-14",
        94,
        97,
        1
      ],
      [
        "driver-tomas-eriksen",
        demoDriverNames["driver-tomas-eriksen"],
        "Aarhus",
        "Denmark",
        "Nordics-Benelux tanker and ADR driver with high retention history",
        "Senior tanker driver trusted by chemical and food-grade operators. Strong preventive maintenance reporting and route planning habits.",
        14,
        "Contracted",
        json(["CE", "ADR", "Tanker"]),
        json(["Danish", "English", "German"]),
        json(["Denmark", "Sweden", "Germany", "Netherlands", "Belgium"]),
        json(["Nordics", "Benelux", "DACH"]),
        json(["ADR", "Tanker", "Long-haul"]),
        4.9,
        41,
        35,
        516,
        88,
        1,
        "2026-06-13",
        99,
        99,
        1
      ],
      [
        "driver-nikola-jovanovic",
        demoDriverNames["driver-nikola-jovanovic"],
        "Belgrade",
        "Serbia",
        "Newly onboarded C+CE driver building a verified track record",
        "Three years on regional and domestic lanes, now expanding into cross-border work and building a public reputation on RoadCred.",
        3,
        "Available now",
        json(["C", "CE"]),
        json(["Serbian", "English"]),
        json(["Serbia", "Hungary", "Croatia"]),
        json(["Balkans", "Central Europe"]),
        json(["General cargo", "Regional"]),
        4.3,
        4,
        2,
        62,
        96,
        0,
        "2026-06-18",
        93,
        96,
        0
      ]
    ].forEach((driver) => insertDriver.run(...driver));

    const insertCompany = db.prepare(`
      INSERT INTO companies (
        id,
        name,
        city,
        country,
        description,
        fleet_type,
        operating_regions,
        rating_average,
        review_count,
        verified_review_count,
        active_jobs,
        verified,
        response_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      [
        "company-nordtrail",
        "NordTrail Logistics GmbH",
        "Hamburg",
        "Germany",
        "Mid-sized refrigerated and high-value freight operator serving DACH, Benelux, and Nordic routes.",
        demoFleetTypes["company-iberiafreight"],
        json(["DACH", "Benelux", "Nordics", "Central Europe"]),
        4.6,
        18,
        15,
        3,
        1,
        "Usually replies within 6 hours"
      ],
      [
        "company-adriatrans",
        "AdriaTrans Group",
        "Ljubljana",
        "Slovenia",
        "Regional transport group connecting Adriatic ports with Austria, Hungary, and Southern Germany.",
        "General cargo and port-connected freight",
        json(["Balkans", "DACH", "Northern Italy"]),
        4.4,
        14,
        11,
        2,
        1,
        "Usually replies within 1 business day"
      ],
      [
        "company-iberiafreight",
        "Iberia Freight Network",
        "Valencia",
        "Spain",
        "Produce and refrigerated freight network for Spain, Portugal, France, and Northern Italy.",
        "Refrigerated export lanes",
        json(["Iberia", "France", "Northern Italy"]),
        4.5,
        12,
        10,
        2,
        1,
        "Usually replies within 8 hours"
      ]
    ].forEach((company) => insertCompany.run(...company));

    const insertExperience = db.prepare(`
      INSERT INTO experience VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      [
        "exp-mateo-1",
        "driver-mateo-kovac",
        "Alpine Cold Chain",
        "Lead CE Driver",
        "2020-03",
        null,
        json(["Austria", "Germany", "Italy", "Slovenia"]),
        json(["Refrigerated trailer", "Euro 6 tractor"]),
        "Led weekly refrigerated lanes with strict temperature logs and customs paperwork.",
        1
      ],
      [
        "exp-mateo-2",
        "driver-mateo-kovac",
        "AdriaTrans Group",
        "Cross-border Driver",
        "2016-05",
        "2020-02",
        json(["Croatia", "Slovenia", "Germany"]),
        json(["Curtainsider", "Refrigerated trailer"]),
        "Handled DACH-Balkans routes with consistent delivery scoring.",
        1
      ],
      [
        "exp-anna-1",
        "driver-anna-nowak",
        "Baltic Industrial Freight",
        "ADR Driver",
        "2019-04",
        null,
        json(["Poland", "Germany", "Netherlands", "Belgium"]),
        json(["ADR trailer", "Curtainsider"]),
        "Runs planned industrial lanes with strong safety and load-securing reviews.",
        1
      ],
      [
        "exp-luis-1",
        "driver-luis-martin",
        "Iberia Freight Network",
        "Refrigerated Export Driver",
        "2018-01",
        null,
        json(["Spain", "France", "Portugal"]),
        json(["Refrigerated trailer"]),
        "Fruit and chilled goods exports with bilingual dispatch communication.",
        1
      ],
      [
        "exp-jelena-1",
        "driver-jelena-petrovic",
        "Danube Heavy Logistics",
        "Oversized Driver",
        "2017-09",
        null,
        json(["Serbia", "Hungary", "Austria", "Germany"]),
        json(["Low-loader", "Heavy tractor"]),
        "Coordinates permits and escort vehicles for industrial equipment.",
        1
      ],
      [
        "exp-ovidiu-1",
        "driver-ovidiu-ionescu",
        "Carpathian Express",
        "General Cargo Driver",
        "2021-02",
        null,
        json(["Romania", "Hungary", "Austria", "Italy"]),
        json(["Box truck", "Curtainsider"]),
        "Short-notice general cargo rotations across Central Europe.",
        1
      ],
      [
        "exp-tomas-1",
        "driver-tomas-eriksen",
        "Nordic Tanker Alliance",
        "Senior Tanker Driver",
        "2015-06",
        null,
        json(["Denmark", "Sweden", "Germany", "Netherlands"]),
        json(["Tanker", "ADR trailer"]),
        "Food-grade and chemical tanker lanes with excellent compliance reporting.",
        1
      ],
      [
        "exp-nikola-1",
        "driver-nikola-jovanovic",
        "Beograd Regional Transport",
        "C+CE Driver",
        "2023-05",
        null,
        json(["Serbia", "Hungary", "Croatia"]),
        json(["Box truck", "Curtainsider"]),
        "Regional and domestic distribution, now moving into cross-border lanes.",
        0
      ]
    ].forEach((experience) => insertExperience.run(...experience));

    const insertReview = db.prepare(`
      INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      [
        "review-mateo-1",
        "driver",
        "driver-mateo-kovac",
        "company",
        "company-nordtrail",
        "NordTrail Logistics GmbH",
        5,
        "Precise cold-chain communication",
        demoReviewComments["review-mateo-1"],
        "Refrigerated",
        "2026-05-22",
        1
      ],
      [
        "review-mateo-2",
        "driver",
        "driver-mateo-kovac",
        "company",
        "company-adriatrans",
        "AdriaTrans Group",
        5,
        "Reliable on DACH-Balkans lanes",
        "Strong paperwork discipline and calm handling when the loading window moved.",
        "Cross-border",
        "2026-03-11",
        1
      ],
      [
        "review-anna-1",
        "driver",
        "driver-anna-nowak",
        "company",
        "company-nordtrail",
        "NordTrail Logistics GmbH",
        5,
        "Excellent ADR safety habits",
        demoReviewComments["review-anna-1"],
        "ADR",
        "2026-04-18",
        1
      ],
      [
        "review-anna-2",
        "driver",
        "driver-anna-nowak",
        "company",
        "company-adriatrans",
        "AdriaTrans Group",
        4,
        "Dependable German lanes",
        "Consistent delivery timing and good driver-dispatch communication.",
        "Industrial",
        "2026-02-08",
        1
      ],
      [
        "review-luis-1",
        "driver",
        "driver-luis-martin",
        "company",
        "company-iberiafreight",
        "Iberia Freight Network",
        5,
        "Strong French-Spanish coordination",
        demoReviewComments["review-luis-1"],
        "Refrigerated",
        "2026-05-04",
        1
      ],
      [
        "review-jelena-1",
        "driver",
        "driver-jelena-petrovic",
        "company",
        "company-adriatrans",
        "AdriaTrans Group",
        5,
        "Complex route handled cleanly",
        "Permit coordination and escort communication were handled without surprises.",
        "Oversized",
        "2026-04-29",
        1
      ],
      [
        "review-ovidiu-1",
        "driver",
        "driver-ovidiu-ionescu",
        "company",
        "company-adriatrans",
        "AdriaTrans Group",
        4,
        "Good short-notice option",
        "Flexible and responsive on a tight Central Europe rotation.",
        "General cargo",
        "2026-01-20",
        1
      ],
      [
        "review-tomas-1",
        "driver",
        "driver-tomas-eriksen",
        "company",
        "company-nordtrail",
        "NordTrail Logistics GmbH",
        5,
        "Top-tier tanker professionalism",
        "Clear reporting and excellent preventive maintenance notes.",
        "Tanker",
        "2026-03-30",
        1
      ],
      [
        "review-nikola-1",
        "driver",
        "driver-nikola-jovanovic",
        "company",
        "company-adriatrans",
        "AdriaTrans Group",
        4,
        "Promising regional driver",
        "Punctual and eager on a Belgrade-Zagreb run. Still building cross-border experience.",
        "Regional",
        "2026-05-18",
        1
      ],
      [
        "review-company-nordtrail-1",
        "company",
        "company-nordtrail",
        "driver",
        "driver-mateo-kovac",
        demoDriverNames["driver-mateo-kovac"],
        5,
        "Organized dispatch and quick payment",
        "Route instructions were clear and payment landed within the agreed window.",
        "Refrigerated",
        "2026-05-24",
        1
      ],
      [
        "review-company-nordtrail-2",
        "company",
        "company-nordtrail",
        "driver",
        "driver-anna-nowak",
        demoDriverNames["driver-anna-nowak"],
        4,
        "Professional team",
        "Good dispatch response and practical loading support in Hamburg.",
        "ADR",
        "2026-04-20",
        1
      ],
      [
        "review-company-adriatrans-1",
        "company",
        "company-adriatrans",
        "driver",
        "driver-jelena-petrovic",
        demoDriverNames["driver-jelena-petrovic"],
        4,
        "Fair planning on difficult routes",
        "The permit work was well prepared and dispatch stayed available.",
        "Oversized",
        "2026-04-30",
        1
      ],
      [
        "review-company-iberiafreight-1",
        "company",
        "company-iberiafreight",
        "driver",
        "driver-luis-martin",
        demoDriverNames["driver-luis-martin"],
        5,
        "Well-run cold-chain lanes",
        "Clear loading windows and respectful dispatch. Paid on time, every time.",
        "Refrigerated",
        "2026-05-06",
        1
      ]
    ].forEach((review) => insertReview.run(...review));

    const insertJob = db.prepare(`
      INSERT INTO jobs (
        id, company_id, title, origin, destination, countries, truck_type,
        required_license, languages, start_window, contract_type, pay_band,
        status, created_at, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      [
        "job-nordtrail-reefer-rotterdam",
        "company-nordtrail",
        "Refrigerated CE driver for Hamburg-Rotterdam rotations",
        "Hamburg, Germany",
        "Rotterdam, Netherlands",
        json(["Germany", "Netherlands"]),
        "Refrigerated trailer",
        "CE",
        json(["English", "German"]),
        "Immediate start",
        "3-month renewable contract",
        "EUR 3,400-4,100 monthly",
        "Open",
        "2026-06-12",
        "2026-06-20",
        "2026-09-20"
      ],
      [
        "job-nordtrail-adr-copenhagen",
        "company-nordtrail",
        "ADR-qualified driver for Germany-Denmark industrial freight",
        "Munich, Germany",
        "Copenhagen, Denmark",
        json(["Germany", "Denmark"]),
        "ADR trailer",
        "ADR",
        json(["English", "German"]),
        "Starts in 2 weeks",
        "Full-time",
        "EUR 3,800-4,500 monthly",
        "Open",
        "2026-06-10",
        "2026-07-02",
        "2026-10-02"
      ],
      [
        "job-nordtrail-dach-relief",
        "company-nordtrail",
        "DACH relief driver for high-value freight",
        "Frankfurt, Germany",
        "Vienna, Austria",
        json(["Germany", "Austria"]),
        "Box trailer",
        "CE",
        json(["German", "English"]),
        "Immediate start",
        "6-week assignment",
        "EUR 230-280 daily",
        "Interviewing",
        "2026-06-08",
        "2026-06-22",
        "2026-08-03"
      ],
      [
        "job-adriatrans-heavy",
        "company-adriatrans",
        "Oversized equipment driver for Slovenia-Austria lane",
        "Koper, Slovenia",
        "Graz, Austria",
        json(["Slovenia", "Austria"]),
        "Low-loader",
        "Oversized",
        json(["English", "German"]),
        "Starts next month",
        "Project contract",
        "EUR 290-340 daily",
        "Open",
        "2026-06-09",
        "2026-07-15",
        "2026-09-15"
      ],
      [
        "job-iberiafreight-france",
        "company-iberiafreight",
        "Cold-chain export driver for Valencia-Lyon",
        "Valencia, Spain",
        "Lyon, France",
        json(["Spain", "France"]),
        "Refrigerated trailer",
        "CE",
        json(["Spanish", "French"]),
        "Immediate start",
        "Seasonal contract",
        "EUR 3,100-3,800 monthly",
        "Open",
        "2026-06-11",
        "2026-06-25",
        "2026-09-30"
      ]
    ].forEach((job) => insertJob.run(...job));

    const insertSkill = db.prepare(`INSERT INTO driver_skills VALUES (?, ?, ?, ?, ?)`);

    const skillSeed: [string, string, string, DriverSkill["category"], DriverSkill["level"]][] = [
      ["skill-mateo-1", "driver-mateo-kovac", "Refrigerated / temperature control", "Vehicle & equipment", "Expert"],
      ["skill-mateo-2", "driver-mateo-kovac", "Tachograph & EU driving-time compliance", "Compliance & safety", "Expert"],
      ["skill-mateo-3", "driver-mateo-kovac", "Customs & cross-border paperwork", "Logistics", "Expert"],
      ["skill-mateo-4", "driver-mateo-kovac", "Roadside mechanical troubleshooting", "Mechanical", "Proficient"],
      ["skill-mateo-5", "driver-mateo-kovac", "Eco-driving", "Soft skills", "Proficient"],
      ["skill-anna-1", "driver-anna-nowak", "ADR dangerous-goods handling", "Compliance & safety", "Expert"],
      ["skill-anna-2", "driver-anna-nowak", "Load securing & lashing", "Vehicle & equipment", "Expert"],
      ["skill-anna-3", "driver-anna-nowak", "Curtainsider operation", "Vehicle & equipment", "Proficient"],
      ["skill-anna-4", "driver-anna-nowak", "Dispatch coordination", "Soft skills", "Proficient"],
      ["skill-anna-5", "driver-anna-nowak", "Basic vehicle maintenance", "Mechanical", "Familiar"],
      ["skill-luis-1", "driver-luis-martin", "Cold chain / pharma-adjacent freight", "Vehicle & equipment", "Expert"],
      ["skill-luis-2", "driver-luis-martin", "Export documentation", "Logistics", "Expert"],
      ["skill-luis-3", "driver-luis-martin", "Tail-lift operation", "Vehicle & equipment", "Proficient"],
      ["skill-luis-4", "driver-luis-martin", "Bilingual dispatch (ES/FR)", "Soft skills", "Proficient"],
      ["skill-luis-5", "driver-luis-martin", "Pre-trip mechanical checks", "Mechanical", "Familiar"],
      ["skill-jelena-1", "driver-jelena-petrovic", "Oversized / abnormal loads", "Vehicle & equipment", "Expert"],
      ["skill-jelena-2", "driver-jelena-petrovic", "Permit & escort coordination", "Logistics", "Expert"],
      ["skill-jelena-3", "driver-jelena-petrovic", "Low-loader operation", "Vehicle & equipment", "Expert"],
      ["skill-jelena-4", "driver-jelena-petrovic", "Crane / HIAB awareness", "Mechanical", "Proficient"],
      ["skill-jelena-5", "driver-jelena-petrovic", "Heavy-haul risk assessment", "Compliance & safety", "Expert"],
      ["skill-ovidiu-1", "driver-ovidiu-ionescu", "General cargo handling", "Vehicle & equipment", "Proficient"],
      ["skill-ovidiu-2", "driver-ovidiu-ionescu", "Express / short-notice operations", "Logistics", "Proficient"],
      ["skill-ovidiu-3", "driver-ovidiu-ionescu", "Forklift operation", "Vehicle & equipment", "Familiar"],
      ["skill-ovidiu-4", "driver-ovidiu-ionescu", "Basic mechanical repairs", "Mechanical", "Familiar"],
      ["skill-tomas-1", "driver-tomas-eriksen", "Tanker operation (food-grade & chemical)", "Vehicle & equipment", "Expert"],
      ["skill-tomas-2", "driver-tomas-eriksen", "ADR dangerous-goods handling", "Compliance & safety", "Expert"],
      ["skill-tomas-3", "driver-tomas-eriksen", "Preventive maintenance reporting", "Mechanical", "Expert"],
      ["skill-tomas-4", "driver-tomas-eriksen", "Route planning", "Logistics", "Proficient"],
      ["skill-tomas-5", "driver-tomas-eriksen", "Mentoring junior drivers", "Soft skills", "Proficient"],
      ["skill-nikola-1", "driver-nikola-jovanovic", "General cargo handling", "Vehicle & equipment", "Proficient"],
      ["skill-nikola-2", "driver-nikola-jovanovic", "Regional route planning", "Logistics", "Familiar"],
      ["skill-nikola-3", "driver-nikola-jovanovic", "Basic vehicle maintenance", "Mechanical", "Proficient"]
    ];
    skillSeed.forEach((skill) => insertSkill.run(...skill));

    const insertPeriod = db.prepare(`INSERT INTO availability_periods (id, driver_id, start_date, end_date, status, note) VALUES (?, ?, ?, ?, ?, ?)`);

    const periodSeed: [string, string, string, string | null, AvailabilityPeriod["status"], string][] = [
      ["per-mateo-1", "driver-mateo-kovac", "2026-06-18", "2026-08-31", "Available", "Open for DACH & Balkans reefer lanes"],
      ["per-mateo-2", "driver-mateo-kovac", "2026-09-01", "2026-10-15", "Hired", "Seasonal contract — Alpine Cold Chain"],
      ["per-mateo-3", "driver-mateo-kovac", "2026-10-16", null, "Available", "Open from mid-October"],
      ["per-anna-1", "driver-anna-nowak", "2026-06-18", "2026-07-20", "Available", "Open to Benelux / DACH offers"],
      ["per-anna-2", "driver-anna-nowak", "2026-07-21", "2026-08-20", "Tentative", "Tentative hold — pending contract"],
      ["per-anna-3", "driver-anna-nowak", "2026-08-21", null, "Available", "Available"],
      ["per-luis-1", "driver-luis-martin", "2026-06-18", "2026-07-02", "Hired", "Finishing Valencia–Lyon rotation"],
      ["per-luis-2", "driver-luis-martin", "2026-07-03", "2026-09-30", "Available", "Available for Iberia / France lanes"],
      ["per-jelena-1", "driver-jelena-petrovic", "2026-06-18", "2026-09-15", "Available", "Open for oversized projects"],
      ["per-jelena-2", "driver-jelena-petrovic", "2026-09-16", "2026-11-30", "Hired", "Project — Danube Heavy Logistics"],
      ["per-ovidiu-1", "driver-ovidiu-ionescu", "2026-06-18", null, "Available", "Flexible, short-notice rotations"],
      ["per-tomas-1", "driver-tomas-eriksen", "2026-06-18", "2026-12-31", "Hired", "Contracted — Nordic Tanker Alliance"],
      ["per-tomas-2", "driver-tomas-eriksen", "2027-01-01", null, "Available", "Open from January 2027"],
      ["per-nikola-1", "driver-nikola-jovanovic", "2026-06-18", null, "Available", "Available for regional & cross-border work"]
    ];
    periodSeed.forEach((period) => insertPeriod.run(...period));

    const insertCheck = db.prepare(`INSERT INTO verification_checks VALUES (?, ?, ?, ?, ?, ?, ?)`);

    const driverCheckTemplate: [string, string][] = [
      ["Identity", "Government ID matched to profile"],
      ["Driving licence", "Licence class and validity confirmed"],
      ["Specialist certificates", "ADR / tanker / oversized permits"],
      ["Tachograph card", "Digital tachograph driver card valid"],
      ["Background & references", "Prior-employer references checked"]
    ];
    // status overrides per driver; default verified
    const driverCheckStatus: Record<string, VerificationCheck["status"][]> = {
      "driver-mateo-kovac": ["verified", "verified", "pending", "verified", "unverified"],
      "driver-anna-nowak": ["verified", "verified", "verified", "verified", "verified"],
      "driver-luis-martin": ["verified", "verified", "verified", "verified", "verified"],
      "driver-jelena-petrovic": ["verified", "verified", "verified", "verified", "verified"],
      "driver-ovidiu-ionescu": ["verified", "verified", "verified", "verified", "pending"],
      "driver-tomas-eriksen": ["verified", "verified", "verified", "verified", "verified"],
      "driver-nikola-jovanovic": ["pending", "unverified", "unverified", "unverified", "unverified"]
    };
    Object.entries(driverCheckStatus).forEach(([driverId, statuses]) => {
      driverCheckTemplate.forEach(([label, description], index) => {
        const status = statuses[index] ?? "unverified";
        insertCheck.run(
          `vc-${driverId}-${index}`,
          "driver",
          driverId,
          label,
          description,
          status,
          status === "verified" ? "2026-05-30" : null
        );
      });
    });

    const companyCheckTemplate: [string, string][] = [
      ["Business registration", "Company registration number verified"],
      ["VAT / tax ID", "EU VAT number validated"],
      ["Operating licence", "Community transport licence confirmed"],
      ["Insurance certificate", "Carrier liability cover confirmed"]
    ];
    const companyCheckStatus: Record<string, VerificationCheck["status"][]> = {
      "company-nordtrail": ["verified", "verified", "verified", "pending"],
      "company-adriatrans": ["verified", "verified", "verified", "verified"],
      "company-iberiafreight": ["verified", "verified", "verified", "verified"]
    };
    Object.entries(companyCheckStatus).forEach(([companyId, statuses]) => {
      companyCheckTemplate.forEach(([label, description], index) => {
        const status = statuses[index] ?? "unverified";
        insertCheck.run(
          `vc-${companyId}-${index}`,
          "company",
          companyId,
          label,
          description,
          status,
          status === "verified" ? "2026-05-12" : null
        );
      });
    });

    // Demo login accounts are provisioned by ensureDemoAccounts() from the shared
    // demoAccounts list, so their emails always match the frontend.

    db.prepare(`INSERT INTO conversations VALUES (?, ?, ?, ?, ?)`).run(
      "conv-nordtrail-mateo",
      "company-nordtrail",
      "driver-mateo-kovac",
      "2026-06-15T09:00:00.000Z",
      "2026-06-15T10:05:00.000Z"
    );
    const insertMessage = db.prepare(`INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)`);
    (
      [
        [
          "msg-seed-1",
          "conv-nordtrail-mateo",
          "company",
          "company-nordtrail",
          demoIntroMessage,
          "2026-06-15T09:00:00.000Z"
        ],
        [
          "msg-seed-2",
          "conv-nordtrail-mateo",
          "driver",
          "driver-mateo-kovac",
          "Hi! Thanks for reaching out. Yes, I'm open from now — happy to talk schedule and rates.",
          "2026-06-15T09:40:00.000Z"
        ],
        [
          "msg-seed-3",
          "conv-nordtrail-mateo",
          "company",
          "company-nordtrail",
          "Great. It's a 3-month renewable contract, EUR 3,400–4,100/month. Could you do a quick call Thursday?",
          "2026-06-15T10:05:00.000Z"
        ]
      ] as [string, string, string, string, string, string][]
    ).forEach((message) => insertMessage.run(...message));

    const insertBooking = db.prepare(
      `INSERT INTO bookings (
        id, driver_id, driver_name, company_id, company_name, start_date, end_date,
        route_type, origin, destination, origin_country, destination_country,
        note, status, created_at, availability_period_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertBookingPeriod = db.prepare(
      "INSERT INTO availability_periods (id, driver_id, start_date, end_date, status, note, origin) VALUES (?, ?, ?, ?, ?, ?, 'booking')"
    );
    // Accepted bookings carve a "Hired" block into the driver's calendar (and out of availability search).
    // Seeds deliberately span PAST / ACTIVE / UPCOMING relative to 2026-06-18 so the company
    // "Routes & activity" dashboard shows all three groups, and so red "Hired" days are visible
    // in the current month.

    // NordTrail (default demo company) — one route in each dashboard group.
    insertBooking.run(
      "booking-seed-past", "driver-mateo-kovac", demoDriverNames["driver-mateo-kovac"], "company-nordtrail", "NordTrail Logistics GmbH",
      "2026-05-04", "2026-05-29", "Refrigerated DACH", "Hamburg", "Rotterdam", "Germany", "Netherlands",
      "Hamburg–Rotterdam reefer rotation (completed)", "accepted", "2026-04-20T09:00:00.000Z", "per-mateo-past"
    );
    insertBookingPeriod.run("per-mateo-past", "driver-mateo-kovac", "2026-05-04", "2026-05-29", "Hired", "Booked by NordTrail Logistics GmbH");
    insertBooking.run(
      "booking-seed-active", "driver-anna-nowak", demoDriverNames["driver-anna-nowak"], "company-nordtrail", "NordTrail Logistics GmbH",
      "2026-06-12", "2026-06-28", "Box freight", "Warsaw", "Berlin", "Poland", "Germany",
      "Warsaw–Berlin high-value freight", "accepted", "2026-06-01T10:00:00.000Z", "per-anna-active"
    );
    insertBookingPeriod.run("per-anna-active", "driver-anna-nowak", "2026-06-12", "2026-06-28", "Hired", "Booked by NordTrail Logistics GmbH");
    insertBooking.run(
      "booking-seed-1", "driver-mateo-kovac", demoDriverNames["driver-mateo-kovac"], "company-nordtrail", "NordTrail Logistics GmbH",
      "2026-07-10", "2026-07-25", "Refrigerated DACH", "Hamburg", "Rotterdam", "Germany", "Netherlands",
      "Hamburg–Rotterdam reefer rotation", "accepted", "2026-06-12T09:00:00.000Z", "per-mateo-booking-1"
    );
    insertBookingPeriod.run("per-mateo-booking-1", "driver-mateo-kovac", "2026-07-10", "2026-07-25", "Hired", "Booked by NordTrail Logistics GmbH");

    // AdriaTrans — an active and an upcoming route.
    insertBooking.run(
      "booking-seed-2", "driver-jelena-petrovic", demoDriverNames["driver-jelena-petrovic"], "company-adriatrans", "AdriaTrans Group",
      "2026-06-10", "2026-06-24", "Oversized", "Koper", "Graz", "Slovenia", "Austria",
      "Koper–Graz heavy lift project", "accepted", "2026-05-28T11:30:00.000Z", "per-jelena-active"
    );
    insertBookingPeriod.run("per-jelena-active", "driver-jelena-petrovic", "2026-06-10", "2026-06-24", "Hired", "Booked by AdriaTrans Group");
    insertBooking.run(
      "booking-seed-4", "driver-jelena-petrovic", demoDriverNames["driver-jelena-petrovic"], "company-adriatrans", "AdriaTrans Group",
      "2026-08-04", "2026-08-18", "Oversized", "Koper", "Graz", "Slovenia", "Austria",
      "Koper–Graz autumn project", "accepted", "2026-06-13T11:30:00.000Z", "per-jelena-booking-1"
    );
    insertBookingPeriod.run("per-jelena-booking-1", "driver-jelena-petrovic", "2026-08-04", "2026-08-18", "Hired", "Booked by AdriaTrans Group");

    // A PENDING request (no calendar block until accepted). The reserving company
    // (Iberia Freight) sees these days as blue "Reserved"; nobody else does.
    insertBooking.run(
      "booking-seed-3", "driver-mateo-kovac", demoDriverNames["driver-mateo-kovac"], "company-iberiafreight", "Iberia Freight Network",
      "2026-08-10", "2026-08-22", "Refrigerated export", "Valencia", "Lyon", "Spain", "France",
      "Valencia–Lyon cold-chain run", "pending", "2026-06-16T08:15:00.000Z", null
    );

    const insertInvite = db.prepare(
      `INSERT INTO invites (
        id, company_id, company_name, driver_email, driver_name, note,
        status, sent_at, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertInvite.run(
      "invite-seed-1", "company-nordtrail", "NordTrail Logistics GmbH", ...demoInvitees["invite-seed-1"],
      "Saw your reefer experience — we run weekly Hamburg lanes and would love you on RoadCred.",
      "pending", "2026-06-15T08:00:00.000Z", "2026-06-29T08:00:00.000Z", "2026-06-15T08:00:00.000Z"
    );
    insertInvite.run(
      "invite-seed-2", "company-nordtrail", "NordTrail Logistics GmbH", ...demoInvitees["invite-seed-2"],
      "ADR-qualified contacts welcome — join and connect with our dispatch team.",
      "pending", "2026-06-16T14:30:00.000Z", "2026-06-30T14:30:00.000Z", "2026-06-16T14:30:00.000Z"
    );
    insertInvite.run(
      "invite-seed-3", "company-adriatrans", "AdriaTrans Group", ...demoInvitees["invite-seed-3"],
      "Balkans–DACH routes opening up. Set up your verified profile and let's talk.",
      "pending", "2026-06-14T09:15:00.000Z", "2026-06-28T09:15:00.000Z", "2026-06-14T09:15:00.000Z"
    );

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function ensureSupplementalExamples(): void {
  db.exec("BEGIN;");
  try {
    const insertDriver = db.prepare(`
      INSERT OR IGNORE INTO drivers (
        id,
        name,
        city,
        country,
        headline,
        bio,
        years_experience,
        availability,
        licenses,
        languages,
        countries,
        preferred_regions,
        route_types,
        rating_average,
        review_count,
        verified_review_count,
        completed_transports,
        response_rate,
        profile_verified,
        last_active,
        on_time_rate,
        incident_free_rate,
        documents_verified,
        profile_image_url,
        cover_image_url,
        gallery_image_urls,
        accent_color,
        profile_tagline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [
        "driver-mira-horvat",
        demoDriverNames["driver-mira-horvat"],
        "Rijeka",
        "Croatia",
        "High-value freight driver for DACH and Northern Italy",
        "Nine years across high-value electronics, sealed trailers, and scheduled night routes. Strong handover notes and calm customer communication.",
        9,
        "Available in 2 weeks",
        json(["CE", "ADR"]),
        json(["Croatian", "English", "Italian", "German"]),
        json(["Croatia", "Slovenia", "Austria", "Germany", "Italy"]),
        json(["DACH", "Northern Italy", "Balkans"]),
        json(["High-value", "ADR", "Cross-border"]),
        4.8,
        22,
        19,
        274,
        93,
        1,
        "2026-06-18",
        97,
        99,
        1,
        "",
        "",
        json([]),
        "#0f9d76",
        ""
      ],
      [
        "driver-erik-weiss",
        demoDriverNames["driver-erik-weiss"],
        "Gdansk",
        "Poland",
        "Baltic-Nordic curtainsider driver with winter-route experience",
        "Experienced on Poland, Lithuania, Sweden, and Denmark lanes with strong load-securing habits and low incident history in winter conditions.",
        7,
        "Open to offers",
        json(["C", "CE"]),
        json(["Polish", "English", "German"]),
        json(["Poland", "Lithuania", "Denmark", "Sweden", "Germany"]),
        json(["Baltics", "Nordics", "DACH"]),
        json(["Curtainsider", "Industrial", "Cross-border"]),
        4.6,
        18,
        15,
        213,
        90,
        1,
        "2026-06-17",
        95,
        98,
        1,
        "",
        "",
        json([]),
        "#2150c4",
        ""
      ],
      [
        "driver-amina-haddad",
        demoDriverNames["driver-amina-haddad"],
        "Marseille",
        "France",
        "France-Iberia refrigerated driver with port pickup experience",
        "Seven years on chilled food and port-connected freight between southern France, Spain, Benelux, and northern Italy. Known for precise temperature logs and calm receiver communication.",
        7,
        "Available now",
        json(["CE", "Refrigerated"]),
        json(["French", "Arabic", "English", "Spanish"]),
        json(["France", "Spain", "Belgium", "Netherlands", "Italy"]),
        json(["France", "Iberia", "Benelux", "Northern Italy"]),
        json(["Refrigerated", "Port pickup", "Cross-border"]),
        4.7,
        21,
        17,
        236,
        91,
        1,
        "2026-06-18",
        96,
        98,
        1,
        "",
        "",
        json([]),
        "#c05621",
        ""
      ],
      [
        "driver-petra-kovacova",
        demoDriverNames["driver-petra-kovacova"],
        "Brno",
        "Czechia",
        "Automotive just-in-time CE driver across Central Europe",
        "Twelve years on automotive and industrial time-windowed freight. Strong handover discipline, German-speaking dispatch work, and reliable tachograph compliance.",
        12,
        "Open to offers",
        json(["CE", "ADR"]),
        json(["Czech", "Slovak", "English", "German"]),
        json(["Czechia", "Slovakia", "Germany", "Austria", "Hungary", "Poland"]),
        json(["Central Europe", "DACH", "Visegrad"]),
        json(["Automotive", "Just-in-time", "ADR"]),
        4.9,
        34,
        29,
        411,
        95,
        1,
        "2026-06-17",
        98,
        99,
        1,
        "",
        "",
        json([]),
        "#5f6f52",
        ""
      ],
      [
        "driver-sofia-rossi",
        demoDriverNames["driver-sofia-rossi"],
        "Bologna",
        "Italy",
        "Intermodal and container driver for northern Italy and Alpine lanes",
        "Handles port, rail terminal, and regional container movements with careful terminal check-ins and practical loading documentation.",
        5,
        "Available now",
        json(["C", "CE", "Container"]),
        json(["Italian", "English", "French"]),
        json(["Italy", "Slovenia", "Austria", "France", "Switzerland"]),
        json(["Northern Italy", "Alps", "France"]),
        json(["Intermodal", "Container", "Regional"]),
        4.4,
        13,
        9,
        149,
        97,
        0,
        "2026-06-18",
        94,
        97,
        0,
        "",
        "",
        json([]),
        "#6f4e37",
        ""
      ],
      [
        "driver-david-oconnor",
        demoDriverNames["driver-david-oconnor"],
        "Dublin",
        "Ireland",
        "Ro-Ro ferry and UK-Benelux driver for chilled and ADR freight",
        "Long-tenured driver on Ireland, UK, France, and Benelux ferry-connected lanes. Experienced with port cutoffs, trailer swaps, and mixed documentation rules.",
        15,
        "Contracted",
        json(["CE", "ADR", "Refrigerated"]),
        json(["English", "French"]),
        json(["Ireland", "United Kingdom", "France", "Belgium", "Netherlands"]),
        json(["Ireland-UK", "Benelux", "France"]),
        json(["Ro-Ro", "Ferry", "Refrigerated"]),
        4.8,
        39,
        32,
        489,
        86,
        1,
        "2026-06-12",
        97,
        98,
        1,
        "",
        "",
        json([]),
        "#1f7a8c",
        ""
      ],
      [
        "driver-kateryna-shevchenko",
        demoDriverNames["driver-kateryna-shevchenko"],
        "Lublin",
        "Poland",
        "Poland-Ukraine cross-border CE driver with ADR paperwork discipline",
        "Nine years across Poland, Ukraine, Slovakia, Czechia, and Germany. Strong with bilingual paperwork, mixed cargo, and winter route planning.",
        9,
        "Available in 2 weeks",
        json(["CE", "ADR"]),
        json(["Ukrainian", "Polish", "English", "Russian"]),
        json(["Poland", "Ukraine", "Slovakia", "Czechia", "Germany"]),
        json(["Central Europe", "Ukraine-Poland", "DACH"]),
        json(["General cargo", "Cross-border", "Humanitarian"]),
        4.7,
        26,
        21,
        301,
        92,
        1,
        "2026-06-16",
        96,
        98,
        1,
        "",
        "",
        json([]),
        "#7a4f9a",
        ""
      ],
      [
        "driver-luka-kralj",
        demoDriverNames["driver-luka-kralj"],
        "Maribor",
        "Slovenia",
        "Flatbed and timber driver for Alpine and Adriatic industrial routes",
        "Eleven years on timber, steel, and industrial flatbed freight. Comfortable with permit checks, careful lashing, and mountain-route timing.",
        11,
        "Available now",
        json(["CE", "Oversized"]),
        json(["Slovenian", "Croatian", "English", "German"]),
        json(["Slovenia", "Austria", "Italy", "Croatia", "Germany"]),
        json(["Balkans", "DACH", "Northern Italy"]),
        json(["Flatbed", "Timber", "Oversized"]),
        4.6,
        20,
        16,
        267,
        88,
        1,
        "2026-06-15",
        95,
        99,
        1,
        "",
        "",
        json([]),
        "#8a6f2a",
        ""
      ],
      [
        "driver-lea-schneider",
        demoDriverNames["driver-lea-schneider"],
        "Hannover",
        "Germany",
        "Vehicle transporter for DACH, Benelux, and Denmark dealer networks",
        "Six years moving finished vehicles and dealer stock with careful inspection photos, low-clearance route planning, and clean handovers.",
        6,
        "Open to offers",
        json(["CE", "Vehicle transporter"]),
        json(["German", "English", "Dutch"]),
        json(["Germany", "Netherlands", "Belgium", "France", "Denmark"]),
        json(["DACH", "Benelux", "Nordics"]),
        json(["Vehicle transporter", "High-value", "Regional"]),
        4.5,
        15,
        11,
        179,
        90,
        1,
        "2026-06-14",
        95,
        98,
        1,
        "",
        "",
        json([]),
        "#b45309",
        ""
      ],
      [
        "driver-ioannis-papadopoulos",
        demoDriverNames["driver-ioannis-papadopoulos"],
        "Thessaloniki",
        "Greece",
        "Aegean and Balkan reefer driver with ferry-route experience",
        "Runs refrigerated freight between Greece, Bulgaria, Romania, Turkey, and Italy. Strong with ferry bookings, mountain routes, and receiver updates.",
        10,
        "Available now",
        json(["CE", "Refrigerated"]),
        json(["Greek", "English", "Turkish"]),
        json(["Greece", "Bulgaria", "Romania", "Turkey", "Italy"]),
        json(["Balkans", "Aegean", "Northern Italy"]),
        json(["Refrigerated", "Ferry", "Long-haul"]),
        4.6,
        18,
        14,
        224,
        94,
        0,
        "2026-06-17",
        95,
        97,
        0,
        "",
        "",
        json([]),
        "#2563eb",
        ""
      ]
    ].forEach((driver) => insertDriver.run(...driver));

    const insertCompany = db.prepare(`
      INSERT OR IGNORE INTO companies (
        id,
        name,
        city,
        country,
        description,
        fleet_type,
        operating_regions,
        rating_average,
        review_count,
        verified_review_count,
        active_jobs,
        verified,
        response_time,
        profile_image_url,
        cover_image_url,
        gallery_image_urls,
        accent_color,
        profile_tagline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [
        "company-alpinefreight",
        "Alpine Freight Labs AG",
        "Innsbruck",
        "Austria",
        "High-value and time-windowed freight operator across Austria, Germany, Switzerland, and Northern Italy.",
        "High-value, sealed trailer, time-critical freight",
        json(["DACH", "Northern Italy", "Central Europe"]),
        4.7,
        16,
        14,
        2,
        1,
        "Usually replies within 4 hours",
        "",
        "",
        json([]),
        "#0f9d76",
        ""
      ],
      [
        "company-balticroute",
        "BalticRoute Carriers",
        "Gdansk",
        "Poland",
        "Cross-border carrier for Poland, the Baltics, Germany, Denmark, and Sweden with mixed curtainsider and box fleets.",
        "Curtainsider and box trailer network",
        json(["Baltics", "Nordics", "DACH", "Central Europe"]),
        4.3,
        11,
        9,
        2,
        1,
        "Usually replies within 1 business day",
        "",
        "",
        json([]),
        "#2150c4",
        ""
      ],
      [
        "company-rhinebridge",
        "RhineBridge Freight BV",
        "Rotterdam",
        "Netherlands",
        "Container, intermodal, and Ro-Ro freight operator connecting Rotterdam, Antwerp, western Germany, France, and UK-Ireland ferry lanes.",
        demoFleetTypes["company-rhinebridge"],
        json(["Benelux", "DACH", "France", "UK-Ireland"]),
        4.6,
        17,
        14,
        2,
        1,
        "Usually replies within 6 hours",
        "",
        "",
        json([]),
        "#1f7a8c",
        ""
      ],
      [
        "company-medlogica",
        "MedLogica Transport SAS",
        "Lyon",
        "France",
        "Temperature-controlled transport company focused on pharma-adjacent, chilled food, and audited handover lanes across western Europe.",
        "Pharma-adjacent cold-chain and dual-temp trailers",
        json(["France", "Iberia", "Benelux", "Northern Italy", "DACH"]),
        4.8,
        19,
        16,
        2,
        1,
        "Usually replies within 3 hours",
        "",
        "",
        json([]),
        "#2a9d8f",
        ""
      ],
      [
        "company-visegrad-auto",
        "Visegrad Automotive Logistics Sp. z o.o.",
        "Wroclaw",
        "Poland",
        "Automotive just-in-time carrier serving plants and tier suppliers in Poland, Czechia, Slovakia, Hungary, Austria, and eastern Germany.",
        demoFleetTypes["company-visegrad-auto"],
        json(["Central Europe", "DACH", "Visegrad", "Baltics"]),
        4.5,
        13,
        11,
        2,
        1,
        "Usually replies within 1 business day",
        "",
        "",
        json([]),
        "#d97706",
        ""
      ],
      [
        "company-aegeanlink",
        "Aegean Link Logistics SA",
        "Thessaloniki",
        "Greece",
        "Regional operator for Greece, Bulgaria, Romania, Turkey, and Italy with ferry-linked refrigerated and general cargo lanes.",
        "Refrigerated, ferry-linked, and Balkan general cargo fleet",
        json(["Balkans", "Aegean", "Northern Italy", "Turkey"]),
        4.4,
        10,
        8,
        1,
        1,
        "Usually replies within 8 hours",
        "",
        "",
        json([]),
        "#2563eb",
        ""
      ]
    ].forEach((company) => insertCompany.run(...company));

    const insertSkill = db.prepare(`INSERT OR IGNORE INTO driver_skills VALUES (?, ?, ?, ?, ?)`);
    [
      ["skill-mira-1", "driver-mira-horvat", "High-value sealed trailer handling", "Vehicle & equipment", "Expert"],
      ["skill-mira-2", "driver-mira-horvat", "ADR dangerous-goods handling", "Compliance & safety", "Proficient"],
      ["skill-mira-3", "driver-mira-horvat", "Customer handover documentation", "Logistics", "Expert"],
      ["skill-erik-1", "driver-erik-weiss", "Load securing & lashing", "Vehicle & equipment", "Expert"],
      ["skill-erik-2", "driver-erik-weiss", "Winter-route planning", "Logistics", "Proficient"],
      ["skill-erik-3", "driver-erik-weiss", "Curtainsider operation", "Vehicle & equipment", "Expert"],
      ["skill-amina-1", "driver-amina-haddad", "Reefer temperature logging", "Vehicle & equipment", "Expert"],
      ["skill-amina-2", "driver-amina-haddad", "Port pickup scheduling", "Logistics", "Proficient"],
      ["skill-amina-3", "driver-amina-haddad", "Multilingual receiver communication", "Soft skills", "Expert"],
      ["skill-amina-4", "driver-amina-haddad", "Cold-chain handover documentation", "Compliance & safety", "Proficient"],
      ["skill-petra-1", "driver-petra-kovacova", "Automotive just-in-time operations", "Logistics", "Expert"],
      ["skill-petra-2", "driver-petra-kovacova", "Tachograph & EU driving-time compliance", "Compliance & safety", "Expert"],
      ["skill-petra-3", "driver-petra-kovacova", "ADR dangerous-goods handling", "Compliance & safety", "Proficient"],
      ["skill-petra-4", "driver-petra-kovacova", "Plant gate check-in procedures", "Soft skills", "Proficient"],
      ["skill-sofia-1", "driver-sofia-rossi", "Container twist-lock safety", "Vehicle & equipment", "Proficient"],
      ["skill-sofia-2", "driver-sofia-rossi", "Intermodal terminal check-ins", "Logistics", "Proficient"],
      ["skill-sofia-3", "driver-sofia-rossi", "Load-seal inspection", "Compliance & safety", "Familiar"],
      ["skill-sofia-4", "driver-sofia-rossi", "Urban delivery route planning", "Logistics", "Familiar"],
      ["skill-david-1", "driver-david-oconnor", "Ro-Ro ferry procedures", "Logistics", "Expert"],
      ["skill-david-2", "driver-david-oconnor", "ADR dangerous-goods handling", "Compliance & safety", "Proficient"],
      ["skill-david-3", "driver-david-oconnor", "Refrigerated trailer operation", "Vehicle & equipment", "Expert"],
      ["skill-david-4", "driver-david-oconnor", "UK-Ireland customs paperwork", "Logistics", "Proficient"],
      ["skill-kateryna-1", "driver-kateryna-shevchenko", "Cross-border documentation", "Logistics", "Expert"],
      ["skill-kateryna-2", "driver-kateryna-shevchenko", "ADR dangerous-goods handling", "Compliance & safety", "Proficient"],
      ["skill-kateryna-3", "driver-kateryna-shevchenko", "Winter-route planning", "Logistics", "Proficient"],
      ["skill-kateryna-4", "driver-kateryna-shevchenko", "Mixed-cargo load checks", "Vehicle & equipment", "Proficient"],
      ["skill-luka-1", "driver-luka-kralj", "Flatbed load securing", "Vehicle & equipment", "Expert"],
      ["skill-luka-2", "driver-luka-kralj", "Timber and steel transport", "Vehicle & equipment", "Expert"],
      ["skill-luka-3", "driver-luka-kralj", "Permit & route-risk checks", "Compliance & safety", "Proficient"],
      ["skill-luka-4", "driver-luka-kralj", "Roadside mechanical troubleshooting", "Mechanical", "Proficient"],
      ["skill-lea-1", "driver-lea-schneider", "Vehicle transporter loading", "Vehicle & equipment", "Expert"],
      ["skill-lea-2", "driver-lea-schneider", "Damage inspection photography", "Compliance & safety", "Proficient"],
      ["skill-lea-3", "driver-lea-schneider", "Low-clearance route planning", "Logistics", "Proficient"],
      ["skill-lea-4", "driver-lea-schneider", "Dealer handover communication", "Soft skills", "Proficient"],
      ["skill-ioannis-1", "driver-ioannis-papadopoulos", "Ferry booking coordination", "Logistics", "Expert"],
      ["skill-ioannis-2", "driver-ioannis-papadopoulos", "Refrigerated trailer operation", "Vehicle & equipment", "Proficient"],
      ["skill-ioannis-3", "driver-ioannis-papadopoulos", "Turkish border paperwork", "Logistics", "Proficient"],
      ["skill-ioannis-4", "driver-ioannis-papadopoulos", "Mountain-route planning", "Compliance & safety", "Proficient"]
    ].forEach((skill) => insertSkill.run(...skill));

    const insertPeriod = db.prepare(`INSERT OR IGNORE INTO availability_periods (id, driver_id, start_date, end_date, status, note) VALUES (?, ?, ?, ?, ?, ?)`);
    [
      ["per-mira-1", "driver-mira-horvat", "2026-06-18", "2026-07-05", "Hired", "Finishing electronics lane"],
      ["per-mira-2", "driver-mira-horvat", "2026-07-06", null, "Available", "Available for DACH and Italy work"],
      ["per-erik-1", "driver-erik-weiss", "2026-06-18", "2026-08-10", "Available", "Open for Baltics / Nordics rotations"],
      ["per-erik-2", "driver-erik-weiss", "2026-08-11", "2026-09-15", "Tentative", "Tentative Sweden contract hold"],
      ["per-amina-1", "driver-amina-haddad", "2026-06-18", "2026-08-31", "Available", "Open for France, Iberia, and Benelux reefer lanes"],
      ["per-amina-2", "driver-amina-haddad", "2026-09-01", "2026-09-18", "Tentative", "Tentative Lyon-Madrid lane"],
      ["per-petra-1", "driver-petra-kovacova", "2026-06-18", "2026-07-12", "Hired", "Finishing automotive plant rotation"],
      ["per-petra-2", "driver-petra-kovacova", "2026-07-13", null, "Available", "Available for Central Europe JIT freight"],
      ["per-sofia-1", "driver-sofia-rossi", "2026-06-18", null, "Available", "Available for intermodal and regional container work"],
      ["per-david-1", "driver-david-oconnor", "2026-06-18", "2026-10-31", "Hired", "Contracted on Ireland-UK ferry lane"],
      ["per-david-2", "driver-david-oconnor", "2026-11-01", null, "Available", "Open from November for ferry-linked contracts"],
      ["per-kateryna-1", "driver-kateryna-shevchenko", "2026-06-18", "2026-07-05", "Hired", "Completing Poland-Ukraine rotation"],
      ["per-kateryna-2", "driver-kateryna-shevchenko", "2026-07-06", null, "Available", "Open for Central Europe cross-border work"],
      ["per-luka-1", "driver-luka-kralj", "2026-06-18", "2026-08-31", "Available", "Open for flatbed and timber routes"],
      ["per-luka-2", "driver-luka-kralj", "2026-09-01", "2026-09-20", "Hired", "Reserved for steel transport project"],
      ["per-lea-1", "driver-lea-schneider", "2026-06-18", "2026-07-15", "Available", "Available for dealer network routes"],
      ["per-lea-2", "driver-lea-schneider", "2026-07-16", "2026-08-05", "Tentative", "Tentative vehicle handover contract"],
      ["per-ioannis-1", "driver-ioannis-papadopoulos", "2026-06-18", "2026-10-15", "Available", "Open for Aegean and Balkan reefer work"]
    ].forEach((period) => insertPeriod.run(...period));

    const insertExperience = db.prepare(`INSERT OR IGNORE INTO experience VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    [
      [
        "exp-mira-1",
        "driver-mira-horvat",
        "Alpine Freight Labs AG",
        "High-value Freight Driver",
        "2021-04",
        null,
        json(["Austria", "Germany", "Italy", "Slovenia"]),
        json(["Sealed trailer", "Box trailer"]),
        "Night routes and sealed electronics freight with documented handovers.",
        1
      ],
      [
        "exp-erik-1",
        "driver-erik-weiss",
        "BalticRoute Carriers",
        "Curtainsider Driver",
        "2020-08",
        null,
        json(["Poland", "Lithuania", "Denmark", "Sweden"]),
        json(["Curtainsider", "Box trailer"]),
        "Industrial lanes with winter routing and careful load securing.",
        1
      ],
      [
        "exp-amina-1",
        "driver-amina-haddad",
        "MedLogica Transport SAS",
        "Cold-chain Driver",
        "2020-02",
        null,
        json(["France", "Spain", "Belgium", "Netherlands"]),
        json(["Refrigerated trailer", "Dual-temp trailer"]),
        "Chilled food and audited handover lanes with strict temperature records.",
        1
      ],
      [
        "exp-petra-1",
        "driver-petra-kovacova",
        "Visegrad Automotive Logistics Sp. z o.o.",
        "Automotive JIT Driver",
        "2017-05",
        null,
        json(["Czechia", "Slovakia", "Germany", "Austria"]),
        json(["Curtainsider", "Box trailer"]),
        "Just-in-time plant deliveries with narrow loading windows and German-speaking dispatch.",
        1
      ],
      [
        "exp-sofia-1",
        "driver-sofia-rossi",
        "Liguria Intermodal",
        "Container Driver",
        "2022-01",
        null,
        json(["Italy", "France", "Switzerland", "Austria"]),
        json(["Container chassis", "Curtainsider"]),
        "Port and rail terminal movements with seal checks and delivery documentation.",
        1
      ],
      [
        "exp-david-1",
        "driver-david-oconnor",
        "Emerald Channel Haulage",
        "Ro-Ro Ferry Driver",
        "2014-06",
        null,
        json(["Ireland", "United Kingdom", "France", "Belgium"]),
        json(["Refrigerated trailer", "ADR trailer"]),
        "Ferry-linked chilled and ADR lanes with reliable port cutoff planning.",
        1
      ],
      [
        "exp-kateryna-1",
        "driver-kateryna-shevchenko",
        "Carpathian Crossline",
        "Cross-border CE Driver",
        "2019-09",
        null,
        json(["Poland", "Ukraine", "Slovakia", "Czechia"]),
        json(["Curtainsider", "Box trailer"]),
        "Mixed cargo and documentation-heavy cross-border rotations.",
        1
      ],
      [
        "exp-luka-1",
        "driver-luka-kralj",
        "AdriaTrans Group",
        "Flatbed Driver",
        "2018-03",
        null,
        json(["Slovenia", "Austria", "Italy", "Croatia"]),
        json(["Flatbed", "Timber trailer", "Low-loader"]),
        "Timber and industrial freight with careful lashing and mountain-route checks.",
        1
      ],
      [
        "exp-lea-1",
        "driver-lea-schneider",
        "RhineBridge Freight BV",
        "Vehicle Transport Driver",
        "2021-07",
        null,
        json(["Germany", "Netherlands", "Belgium", "France"]),
        json(["Vehicle transporter"]),
        "Dealer stock movements with inspection photos and clean handover records.",
        1
      ],
      [
        "exp-ioannis-1",
        "driver-ioannis-papadopoulos",
        "Aegean Link Logistics SA",
        "Reefer Driver",
        "2018-11",
        null,
        json(["Greece", "Bulgaria", "Romania", "Turkey", "Italy"]),
        json(["Refrigerated trailer", "Box trailer"]),
        "Ferry-linked refrigerated routes with receiver updates and border paperwork.",
        1
      ]
    ].forEach((experience) => insertExperience.run(...experience));

    const insertReview = db.prepare(`INSERT OR IGNORE INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    [
      [
        "review-mira-supp-1",
        "driver",
        "driver-mira-horvat",
        "company",
        "company-alpinefreight",
        "Alpine Freight Labs AG",
        5,
        "Clean high-value handovers",
        demoReviewComments["review-mira-supp-1"],
        "High-value",
        "2026-05-31",
        1
      ],
      [
        "review-erik-supp-1",
        "driver",
        "driver-erik-weiss",
        "company",
        "company-balticroute",
        "BalticRoute Carriers",
        4,
        "Reliable winter-route planning",
        demoReviewComments["review-erik-supp-1"],
        "Curtainsider",
        "2026-05-17",
        1
      ],
      [
        "review-amina-1",
        "driver",
        "driver-amina-haddad",
        "company",
        "company-medlogica",
        "MedLogica Transport SAS",
        5,
        "Excellent cold-chain discipline",
        "Temperature records were complete, and receiver updates were clear in French and Spanish.",
        "Refrigerated",
        "2026-05-28",
        1
      ],
      [
        "review-petra-1",
        "driver",
        "driver-petra-kovacova",
        "company",
        "company-visegrad-auto",
        "Visegrad Automotive Logistics Sp. z o.o.",
        5,
        "Strong just-in-time reliability",
        demoReviewComments["review-petra-1"],
        "Automotive",
        "2026-05-19",
        1
      ],
      [
        "review-sofia-1",
        "driver",
        "driver-sofia-rossi",
        "company",
        "company-rhinebridge",
        "RhineBridge Freight BV",
        4,
        "Good terminal process",
        demoReviewComments["review-sofia-1"],
        "Container",
        "2026-04-26",
        1
      ],
      [
        "review-david-1",
        "driver",
        "driver-david-oconnor",
        "company",
        "company-rhinebridge",
        "RhineBridge Freight BV",
        5,
        "Ferry schedule handled well",
        demoReviewComments["review-david-1"],
        "Ro-Ro",
        "2026-03-14",
        1
      ],
      [
        "review-kateryna-1",
        "driver",
        "driver-kateryna-shevchenko",
        "company",
        "company-visegrad-auto",
        "Visegrad Automotive Logistics Sp. z o.o.",
        5,
        "Careful cross-border paperwork",
        demoReviewComments["review-kateryna-1"],
        "Cross-border",
        "2026-04-11",
        1
      ],
      [
        "review-luka-1",
        "driver",
        "driver-luka-kralj",
        "company",
        "company-adriatrans",
        "AdriaTrans Group",
        4,
        "Solid flatbed work",
        "Load securing was excellent, and route-risk notes were practical for dispatch.",
        "Flatbed",
        "2026-05-09",
        1
      ],
      [
        "review-lea-1",
        "driver",
        "driver-lea-schneider",
        "company",
        "company-rhinebridge",
        "RhineBridge Freight BV",
        4,
        "Detailed vehicle handovers",
        "Inspection photos and delivery notes made the dealer handover straightforward.",
        "Vehicle transporter",
        "2026-05-02",
        1
      ],
      [
        "review-ioannis-1",
        "driver",
        "driver-ioannis-papadopoulos",
        "company",
        "company-aegeanlink",
        "Aegean Link Logistics SA",
        4,
        "Dependable ferry coordination",
        demoReviewComments["review-ioannis-1"],
        "Ferry",
        "2026-05-21",
        1
      ],
      [
        "review-company-rhinebridge-1",
        "company",
        "company-rhinebridge",
        "driver",
        "driver-lea-schneider",
        demoDriverNames["driver-lea-schneider"],
        5,
        "Professional port dispatch",
        "Instructions were specific, port contacts answered quickly, and payment was on time.",
        "Vehicle transporter",
        "2026-05-04",
        1
      ],
      [
        "review-company-medlogica-1",
        "company",
        "company-medlogica",
        "driver",
        "driver-amina-haddad",
        demoDriverNames["driver-amina-haddad"],
        5,
        "Clear cold-chain standards",
        "Loading requirements were clear, and the team respected planned rest windows.",
        "Refrigerated",
        "2026-05-30",
        1
      ],
      [
        "review-company-visegrad-1",
        "company",
        "company-visegrad-auto",
        "driver",
        "driver-petra-kovacova",
        demoDriverNames["driver-petra-kovacova"],
        4,
        "Demanding but fair planning",
        "Tight plant windows, but dispatch was prepared and paid within terms.",
        "Automotive",
        "2026-05-20",
        1
      ],
      [
        "review-company-aegeanlink-1",
        "company",
        "company-aegeanlink",
        "driver",
        "driver-ioannis-papadopoulos",
        demoDriverNames["driver-ioannis-papadopoulos"],
        4,
        "Good Balkan route support",
        "The team shared ferry contacts early and stayed reachable during border checks.",
        "Ferry",
        "2026-05-22",
        1
      ]
    ].forEach((review) => insertReview.run(...review));

    const insertCheck = db.prepare(`INSERT OR IGNORE INTO verification_checks VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const checkStatus: Record<string, VerificationCheck["status"][]> = {
      "driver-mira-horvat": ["verified", "verified", "verified", "verified", "pending"],
      "driver-erik-weiss": ["verified", "verified", "pending", "verified", "verified"],
      "driver-amina-haddad": ["verified", "verified", "pending", "verified", "verified"],
      "driver-petra-kovacova": ["verified", "verified", "verified", "verified", "verified"],
      "driver-sofia-rossi": ["verified", "verified", "unverified", "verified", "pending"],
      "driver-david-oconnor": ["verified", "verified", "verified", "verified", "verified"],
      "driver-kateryna-shevchenko": ["verified", "verified", "verified", "verified", "pending"],
      "driver-luka-kralj": ["verified", "verified", "verified", "verified", "verified"],
      "driver-lea-schneider": ["verified", "verified", "verified", "verified", "unverified"],
      "driver-ioannis-papadopoulos": ["verified", "verified", "pending", "verified", "pending"]
    };
    Object.entries(checkStatus).forEach(([driverId, statuses]) => {
      DRIVER_VERIFICATION_CHECKS.forEach(([label, description], index) => {
        const status = statuses[index] ?? "unverified";
        insertCheck.run(
          `vc-${driverId}-${index}`,
          "driver",
          driverId,
          label,
          description,
          status,
          status === "verified" ? "2026-06-10" : null
        );
      });
    });
    const companyCheckStatus: Record<string, VerificationCheck["status"][]> = {
      "company-alpinefreight": ["verified", "verified", "verified", "verified"],
      "company-balticroute": ["verified", "verified", "verified", "pending"],
      "company-rhinebridge": ["verified", "verified", "verified", "verified"],
      "company-medlogica": ["verified", "verified", "verified", "verified"],
      "company-visegrad-auto": ["verified", "verified", "verified", "pending"],
      "company-aegeanlink": ["verified", "verified", "verified", "pending"]
    };
    Object.entries(companyCheckStatus).forEach(([companyId, statuses]) => {
      COMPANY_VERIFICATION_CHECKS.forEach(([label, description], index) => {
        const status = statuses[index] ?? "unverified";
        insertCheck.run(
          `vc-${companyId}-${index}`,
          "company",
          companyId,
          label,
          description,
          status,
          status === "verified" ? "2026-06-09" : null
        );
      });
    });

    const insertJob = db.prepare(`
      INSERT OR IGNORE INTO jobs (
        id, company_id, title, origin, destination, countries, truck_type,
        required_license, languages, start_window, contract_type, pay_band,
        status, created_at, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [
        "job-alpine-1",
        "company-alpinefreight",
        "Sealed-trailer driver for Munich-Milan high-value lane",
        "Munich",
        "Milan",
        json(["Germany", "Austria", "Italy"]),
        "Box / sealed trailer",
        "CE",
        json(["English", "German", "Italian"]),
        "2026-07-10 to 2026-07-24",
        "8-week assignment",
        "EUR 3,600-4,400 / month",
        "Open",
        "2026-06-18",
        "2026-07-10",
        "2026-07-24"
      ],
      [
        "job-baltic-1",
        "company-balticroute",
        "Curtainsider driver for Gdansk-Copenhagen rotations",
        "Gdansk",
        "Copenhagen",
        json(["Poland", "Denmark", "Germany"]),
        "Curtainsider",
        "CE",
        json(["English", "Polish"]),
        "2026-06-28 to 2026-07-12",
        "Seasonal contract",
        "EUR 3,100-3,700 / month",
        "Interviewing",
        "2026-06-18",
        "2026-06-28",
        "2026-07-12"
      ],
      [
        "job-rhinebridge-container",
        "company-rhinebridge",
        "Container driver for Rotterdam-Ruhr daily rotations",
        "Rotterdam",
        "Duisburg",
        json(["Netherlands", "Germany"]),
        "Container chassis",
        "CE",
        json(["English", "Dutch", "German"]),
        "2026-07-01 to 2026-09-30",
        "3-month contract",
        "EUR 3,500-4,200 / month",
        "Open",
        "2026-06-18",
        "2026-07-01",
        "2026-09-30"
      ],
      [
        "job-rhinebridge-roro",
        "company-rhinebridge",
        "Ro-Ro experienced driver for Zeebrugge-Dublin ferry lane",
        "Zeebrugge",
        "Dublin",
        json(["Belgium", "Ireland", "United Kingdom"]),
        "Refrigerated trailer",
        "CE",
        json(["English", "French"]),
        "2026-08-05 to 2026-10-05",
        "Seasonal contract",
        "EUR 240-300 / day",
        "Interviewing",
        "2026-06-18",
        "2026-08-05",
        "2026-10-05"
      ],
      [
        "job-medlogica-reefer",
        "company-medlogica",
        "Cold-chain CE driver for Lyon-Barcelona audited lane",
        "Lyon",
        "Barcelona",
        json(["France", "Spain"]),
        "Dual-temp refrigerated trailer",
        "CE",
        json(["French", "Spanish", "English"]),
        "2026-07-08 to 2026-09-12",
        "10-week assignment",
        "EUR 3,700-4,500 / month",
        "Open",
        "2026-06-18",
        "2026-07-08",
        "2026-09-12"
      ],
      [
        "job-medlogica-benelux",
        "company-medlogica",
        "Reefer driver for Lyon-Brussels pharma-adjacent route",
        "Lyon",
        "Brussels",
        json(["France", "Belgium"]),
        "Refrigerated trailer",
        "CE",
        json(["French", "English"]),
        "2026-07-20 to 2026-08-31",
        "6-week assignment",
        "EUR 250-310 / day",
        "Open",
        "2026-06-18",
        "2026-07-20",
        "2026-08-31"
      ],
      [
        "job-visegrad-auto-jit",
        "company-visegrad-auto",
        "Automotive JIT driver for Wroclaw-Brno-Zilina loop",
        "Wroclaw",
        "Zilina",
        json(["Poland", "Czechia", "Slovakia"]),
        "Curtainsider",
        "CE",
        json(["Polish", "Czech", "English"]),
        "2026-07-15 to 2026-10-15",
        "3-month renewable contract",
        "EUR 3,300-4,000 / month",
        "Open",
        "2026-06-18",
        "2026-07-15",
        "2026-10-15"
      ],
      [
        "job-visegrad-auto-adr",
        "company-visegrad-auto",
        "ADR-capable CE driver for supplier route to Leipzig",
        "Katowice",
        "Leipzig",
        json(["Poland", "Germany"]),
        "Box trailer",
        "ADR",
        json(["German", "English", "Polish"]),
        "2026-08-01 to 2026-09-15",
        "Project contract",
        "EUR 260-320 / day",
        "Interviewing",
        "2026-06-18",
        "2026-08-01",
        "2026-09-15"
      ],
      [
        "job-aegeanlink-reefer",
        "company-aegeanlink",
        "Reefer driver for Thessaloniki-Sofia-Bucharest lane",
        "Thessaloniki",
        "Bucharest",
        json(["Greece", "Bulgaria", "Romania"]),
        "Refrigerated trailer",
        "CE",
        json(["Greek", "English"]),
        "2026-07-05 to 2026-09-05",
        "Seasonal contract",
        "EUR 3,000-3,700 / month",
        "Open",
        "2026-06-18",
        "2026-07-05",
        "2026-09-05"
      ]
    ].forEach((job) => insertJob.run(...job));

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

type SeedAccount = Pick<DemoAccount, "role" | "id" | "name" | "email">;

const legacyDemoAccounts: SeedAccount[] = [
  { id: "company-nordtrail", email: "dispatch@nordtrail.eu", role: "company", name: "NordTrail Logistics GmbH" },
  { id: "company-adriatrans", email: "ops@adriatrans.eu", role: "company", name: "AdriaTrans Group" },
  { id: "company-iberiafreight", email: "hello@iberiafreight.eu", role: "company", name: "Iberia Freight Network" },
  ...([
    ["driver-mateo-kovac", "demo-driver-01"],
    ["driver-anna-nowak", "demo-driver-02"],
    ["driver-luis-martin", "demo-driver-03"],
    ["driver-jelena-petrovic", "demo-driver-04"],
    ["driver-ovidiu-ionescu", "demo-driver-05"],
    ["driver-tomas-eriksen", "demo-driver-06"],
    ["driver-nikola-jovanovic", "demo-driver-07"]
  ] as const).map(([id, handle]) => ({
    id,
    email: `${handle}@roadcred.demo`,
    role: "driver" as const,
    name: demoDriverNames[id]
  }))
];

function demoAccountId(email: string): string {
  return `acc-demo-${email.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function migrateDemoContent(): void {
  const { user_version: version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  if (version < 4 || version >= 7) return;

  db.exec("BEGIN IMMEDIATE;");
  try {
    const renameDriver = db.prepare("UPDATE drivers SET name = ? WHERE id = ?");
    const renameReviewer = db.prepare("UPDATE reviews SET author_name = ? WHERE author_type = 'driver' AND author_id = ?");
    const renameBookingDriver = db.prepare("UPDATE bookings SET driver_name = ? WHERE driver_id = ?");
    for (const [id, name] of Object.entries(demoDriverNames)) {
      renameDriver.run(name, id);
      renameReviewer.run(name, id);
      renameBookingDriver.run(name, id);
    }

    const updateReview = db.prepare("UPDATE reviews SET comment = ? WHERE id = ?");
    for (const [id, comment] of Object.entries(demoReviewComments)) {
      updateReview.run(comment, id);
    }
    db.prepare("UPDATE messages SET body = ? WHERE id = 'msg-seed-1'").run(demoIntroMessage);

    const updateInvite = db.prepare("UPDATE invites SET driver_email = ?, driver_name = ? WHERE id = ?");
    for (const [id, [email, name]] of Object.entries(demoInvitees)) {
      updateInvite.run(email, name, id);
    }

    const updateFleetType = db.prepare("UPDATE companies SET fleet_type = ? WHERE id = ? AND fleet_type = ?");
    updateFleetType.run(demoFleetTypes["company-iberiafreight"], "company-iberiafreight", "Refrigerated, high-value, ADR partner network");
    updateFleetType.run(demoFleetTypes["company-rhinebridge"], "company-rhinebridge", "Container, Ro-Ro, curtainsider, and refrigerated partner fleet");
    updateFleetType.run(demoFleetTypes["company-visegrad-auto"], "company-visegrad-auto", "Automotive JIT, box, curtainsider, and ADR-capable partner network");

    // Update demo accounts in place so existing sessions still resolve.
    const renameLogin = db.prepare(`
      UPDATE accounts
      SET name = ?, email = CASE WHEN EXISTS (SELECT 1 FROM accounts WHERE email = ?) THEN email ELSE ? END
      WHERE role = 'driver' AND subject_id = ? AND id GLOB 'acc-demo-*' AND email GLOB ?
    `);
    for (const [accounts, emailPattern] of [[demoAccounts, "*@roadcred.demo"], [legacyDemoAccounts, "*@email.com"]] as const) {
      for (const account of accounts) {
        if (account.role === "driver") {
          renameLogin.run(account.name, account.email, account.email, account.id, emailPattern);
        }
      }
    }

    db.exec("PRAGMA user_version = 7; COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function ensureDemoAccounts(): void {
  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, email, password_hash, role, subject_id, name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateAccount = db.prepare(`
    UPDATE accounts
    SET password_hash = ?, role = ?, subject_id = ?, name = ?
    WHERE email = ?
  `);
  const seededAt = "2026-06-18T08:00:00.000Z";
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const accounts: SeedAccount[] = [...legacyDemoAccounts, ...demoAccounts];

  accounts.forEach((account) => {
    const email = account.email.toLowerCase();
    const subjectTable = account.role === "company" ? "companies" : "drivers";
    if (!db.prepare(`SELECT 1 FROM ${subjectTable} WHERE id = ?`).get(account.id)) {
      return;
    }

    const existing = db.prepare("SELECT id, password_hash, role, subject_id, name FROM accounts WHERE email = ?").get(email) as
      | Pick<AccountRow, "id" | "password_hash" | "role" | "subject_id" | "name">
      | undefined;
    if (existing) {
      if (!existing.id.startsWith("acc-demo-")) return;
      const matchesAccount =
        existing.role === account.role &&
        existing.subject_id === account.id &&
        existing.name === account.name &&
        verifyPassword(DEMO_PASSWORD, existing.password_hash);
      if (matchesAccount) {
        return;
      }
      updateAccount.run(passwordHash, account.role, account.id, account.name, email);
      return;
    }

    insertAccount.run(
      demoAccountId(email),
      email,
      passwordHash,
      account.role,
      account.id,
      account.name,
      seededAt
    );
  });
}

function listSkills(driverId: string): DriverSkill[] {
  const rows = db
    .prepare("SELECT * FROM driver_skills WHERE driver_id = ? ORDER BY category, name")
    .all(driverId) as SkillRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    level: row.level
  }));
}

function listPeriods(driverId: string): AvailabilityPeriod[] {
  const rows = db
    .prepare("SELECT * FROM availability_periods WHERE driver_id = ? ORDER BY start_date ASC")
    .all(driverId) as PeriodRow[];
  return rows.map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    note: row.note,
    origin: row.origin === "booking" ? "booking" : "driver"
  }));
}

function buildVerification(subjectType: "driver" | "company", subjectId: string): VerificationState {
  const rows = db
    .prepare(
      "SELECT * FROM verification_checks WHERE subject_type = ? AND subject_id = ? ORDER BY id ASC"
    )
    .all(subjectType, subjectId) as VerificationRow[];

  const checks: VerificationCheck[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    status: row.status,
    verifiedAt: row.verified_at
  }));

  const verifiedCount = checks.filter((check) => check.status === "verified").length;
  const totalCount = checks.length;
  const status: VerificationState["status"] =
    totalCount > 0 && verifiedCount === totalCount
      ? "verified"
      : verifiedCount === 0
        ? "unverified"
        : "pending";

  return { status, verifiedCount, totalCount, checks };
}

function mapDriverSummary(row: DriverRow): DriverSummary {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    headline: row.headline,
    yearsExperience: row.years_experience,
    availability: row.availability,
    licenses: parseList(row.licenses),
    languages: parseList(row.languages),
    countries: parseList(row.countries),
    preferredRegions: parseList(row.preferred_regions),
    routeTypes: parseList(row.route_types),
    skills: listSkills(row.id),
    availabilityPeriods: listPeriods(row.id),
    rating: rating(row),
    completedTransports: row.completed_transports,
    responseRate: row.response_rate,
    profileVerified: row.profile_verified === 1,
    verification: buildVerification("driver", row.id),
    visualIdentity: visualIdentity(row),
    lastActive: row.last_active
  };
}

function mapReliability(row: DriverRow): ReliabilityMetrics {
  return {
    onTimeRate: row.on_time_rate,
    incidentFreeRate: row.incident_free_rate,
    documentsVerified: row.documents_verified === 1
  };
}

function mapExperience(row: ExperienceRow): ExperienceItem {
  return {
    id: row.id,
    companyName: row.company_name,
    role: row.role,
    startDate: row.start_date,
    endDate: row.end_date,
    countries: parseList(row.countries),
    truckTypes: parseList(row.truck_types),
    description: row.description,
    verified: row.verified === 1
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    authorType: row.author_type,
    authorId: row.author_id,
    authorName: row.author_name,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    routeType: row.route_type,
    occurredAt: row.occurred_at,
    verified: row.verified === 1
  };
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    title: row.title,
    origin: row.origin,
    destination: row.destination,
    countries: parseList(row.countries),
    truckType: row.truck_type,
    requiredLicense: row.required_license,
    languages: parseList(row.languages),
    startWindow: row.start_window,
    startDate: row.start_date,
    endDate: row.end_date,
    contractType: row.contract_type,
    payBand: row.pay_band,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapCompanySummary(row: CompanyRow): CompanySummary {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    description: row.description,
    fleetType: row.fleet_type,
    operatingRegions: parseList(row.operating_regions),
    rating: rating(row),
    activeJobs: row.active_jobs,
    verified: row.verified === 1,
    verification: buildVerification("company", row.id),
    visualIdentity: visualIdentity(row),
    responseTime: row.response_time
  };
}

function listReviews(subjectType: "driver" | "company", subjectId: string): Review[] {
  const rows = db
    .prepare(
      "SELECT * FROM reviews WHERE subject_type = ? AND subject_id = ? ORDER BY occurred_at DESC"
    )
    .all(subjectType, subjectId) as ReviewRow[];
  return rows.map(mapReview);
}

function listExperience(driverId: string): ExperienceItem[] {
  const rows = db
    .prepare("SELECT * FROM experience WHERE driver_id = ? ORDER BY start_date DESC")
    .all(driverId) as ExperienceRow[];
  return rows.map(mapExperience);
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    companyId: row.company_id,
    companyName: row.company_name,
    startDate: row.start_date,
    endDate: row.end_date,
    routeType: row.route_type,
    origin: row.origin,
    destination: row.destination,
    originCountry: row.origin_country,
    destinationCountry: row.destination_country,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    availabilityPeriodId: row.availability_period_id
  };
}

function listBookingsForDriver(driverId: string): Booking[] {
  return (
    db.prepare("SELECT * FROM bookings WHERE driver_id = ? ORDER BY start_date DESC").all(driverId) as BookingRow[]
  ).map(mapBooking);
}

function listBookingsForCompany(companyId: string): Booking[] {
  return (
    db.prepare("SELECT * FROM bookings WHERE company_id = ? ORDER BY start_date DESC").all(companyId) as BookingRow[]
  ).map(mapBooking);
}

function listAllBookings(): Booking[] {
  return (db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all() as BookingRow[]).map(mapBooking);
}

function writeBookingPeriod(
  driverId: string,
  periodId: string,
  startDate: string,
  endDate: string,
  companyName: string,
  note: string
): void {
  db.prepare(
    "INSERT INTO availability_periods (id, driver_id, start_date, end_date, status, note, origin) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(periodId, driverId, startDate, endDate, "Hired", note || `Booked by ${companyName}`, "booking");
}

function createBooking(input: CreateBookingInput): Booking | null {
  if (!subjectExists("driver", input.driverId) || !subjectExists("company", input.companyId)) {
    return null;
  }
  if (!input.startDate || !input.endDate || input.startDate > input.endDate) {
    return null;
  }
  const driver = db.prepare("SELECT name FROM drivers WHERE id = ?").get(input.driverId) as { name: string } | undefined;
  const id = `booking-${input.driverId}-${randomUUID().slice(0, 8)}`;
  // A company booking is a REQUEST: it is created "pending" and shows on the
  // company's own calendar as a blue "Reserved" block. No availability period is
  // carved until the driver accepts it (respondToBooking writes the "Hired" block),
  // so a pending request never removes the driver from availability search.
  db.prepare(
    `INSERT INTO bookings (
      id, driver_id, driver_name, company_id, company_name, start_date, end_date,
      route_type, origin, destination, origin_country, destination_country,
      note, status, created_at, availability_period_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.driverId,
    driver?.name ?? "Driver",
    input.companyId,
    input.companyName,
    input.startDate,
    input.endDate,
    input.routeType || "",
    input.origin || "",
    input.destination || "",
    input.originCountry || "",
    input.destinationCountry || "",
    input.note || "",
    "pending",
    nowIso(),
    null
  );
  return mapBooking(db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow);
}

function respondToBooking(
  bookingId: string,
  driverId: string,
  status: "accepted" | "declined"
): Booking | null {
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as BookingRow | undefined;
  if (!row || row.driver_id !== driverId) {
    return null;
  }
  db.exec("BEGIN;");
  try {
    if (status === "accepted") {
      if (!row.availability_period_id) {
        const periodId = `per-${row.driver_id}-booking-${randomUUID().slice(0, 8)}`;
        writeBookingPeriod(row.driver_id, periodId, row.start_date, row.end_date, row.company_name, row.note);
        db.prepare("UPDATE bookings SET status = 'accepted', availability_period_id = ? WHERE id = ?").run(periodId, bookingId);
      } else {
        db.prepare("UPDATE bookings SET status = 'accepted' WHERE id = ?").run(bookingId);
      }
    } else {
      db.prepare("UPDATE bookings SET status = 'declined' WHERE id = ?").run(bookingId);
      if (row.availability_period_id) {
        db.prepare("DELETE FROM availability_periods WHERE id = ?").run(row.availability_period_id);
      }
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  return mapBooking(db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as BookingRow);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasOverlap(left: string[], right: string[]): boolean {
  const rightSet = new Set(right.map(normalize));
  return left.some((item) => rightSet.has(normalize(item)));
}

function isAvailableInWindow(periods: AvailabilityPeriod[], from: string, to: string): boolean {
  const overlaps = (period: AvailabilityPeriod) =>
    period.startDate <= to && (period.endDate === null || period.endDate >= from);
  // Available only if an "Available" period overlaps AND no "Hired" (e.g. booked) block does —
  // so a booking carved into open-ended availability still removes the driver from search.
  const hasAvailable = periods.some((period) => period.status === "Available" && overlaps(period));
  const blocked = periods.some((period) => period.status === "Hired" && overlaps(period));
  return hasAvailable && !blocked;
}

function filterDrivers(drivers: DriverSummary[], filters: DriverFilters): DriverSummary[] {
  return drivers.filter((driver) => {
    if (filters.q) {
      const haystack = [
        driver.name,
        driver.city,
        driver.country,
        driver.headline,
        ...driver.licenses,
        ...driver.languages,
        ...driver.countries,
        ...driver.preferredRegions,
        ...driver.routeTypes,
        ...driver.skills.map((skill) => skill.name)
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(filters.q.toLowerCase())) {
        return false;
      }
    }

    if (filters.country && driver.country !== filters.country && !driver.countries.includes(filters.country)) {
      return false;
    }

    if (filters.license && !driver.licenses.includes(filters.license)) {
      return false;
    }

    if (filters.language && !driver.languages.includes(filters.language)) {
      return false;
    }

    if (filters.skill && !driver.skills.some((skill) => skill.name === filters.skill)) {
      return false;
    }

    if (filters.availability && driver.availability !== filters.availability) {
      return false;
    }

    if (filters.availableFrom || filters.availableTo) {
      const from = filters.availableFrom ?? "0000-01-01";
      const to = filters.availableTo ?? "9999-12-31";
      if (!isAvailableInWindow(driver.availabilityPeriods, from, to)) {
        return false;
      }
    }

    if (typeof filters.minRating === "number" && driver.rating.average < filters.minRating) {
      return false;
    }

    if (filters.verified && !driver.profileVerified) {
      return false;
    }

    return true;
  });
}

function listDrivers(filters: DriverFilters = {}): DriverSummary[] {
  const rows = db
    .prepare("SELECT * FROM drivers ORDER BY rating_average DESC, completed_transports DESC")
    .all() as DriverRow[];
  return filterDrivers(rows.map(mapDriverSummary), filters);
}

function getDriver(id: string): DriverProfile | null {
  const row = db.prepare("SELECT * FROM drivers WHERE id = ?").get(id) as DriverRow | undefined;
  if (!row) {
    return null;
  }

  return {
    ...mapDriverSummary(row),
    bio: row.bio,
    reliability: mapReliability(row),
    experience: listExperience(id),
    reviews: listReviews("driver", id),
    bookings: listBookingsForDriver(id)
  };
}

function listJobs(companyId?: string): Job[] {
  const baseQuery = `
    SELECT jobs.*, companies.name AS company_name
    FROM jobs
    JOIN companies ON companies.id = jobs.company_id
  `;

  const rows = companyId
    ? (db
        .prepare(`${baseQuery} WHERE company_id = ? ORDER BY created_at DESC`)
        .all(companyId) as JobRow[])
    : (db.prepare(`${baseQuery} ORDER BY created_at DESC`).all() as JobRow[]);

  return rows.map(mapJob);
}

function createJob(input: CreateJobInput): Job | null {
  if (!subjectExists("company", input.companyId)) {
    return null;
  }
  if (!input.title.trim() || !input.origin.trim() || !input.destination.trim()) {
    return null;
  }
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    return null;
  }
  const id = `job-${input.companyId}-${randomUUID().slice(0, 8)}`;
  const startWindow = input.startDate && input.endDate ? `${input.startDate} to ${input.endDate}` : "Flexible start";
  db.prepare(`
    INSERT INTO jobs (
      id, company_id, title, origin, destination, countries, truck_type,
      required_license, languages, start_window, contract_type, pay_band,
      status, created_at, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.companyId,
    input.title.trim(),
    input.origin.trim(),
    input.destination.trim(),
    json(input.countries),
    input.truckType || "",
    input.requiredLicense || "",
    json(input.languages),
    startWindow,
    input.contractType || "",
    input.payBand || "",
    "Open",
    today(),
    input.startDate || "",
    input.endDate || ""
  );
  const row = db
    .prepare(
      "SELECT jobs.*, companies.name AS company_name FROM jobs JOIN companies ON companies.id = jobs.company_id WHERE jobs.id = ?"
    )
    .get(id) as JobRow;
  return mapJob(row);
}

function mapInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    driverEmail: row.driver_email,
    driverName: row.driver_name,
    note: row.note,
    status: row.status,
    sentAt: row.sent_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

function createInvite(companyId: string, companyName: string, input: CreateInviteInput): Invite | null {
  if (!subjectExists("company", companyId)) {
    return null;
  }
  if (!input.driverEmail.includes("@") || !input.driverName.trim()) {
    return null;
  }
  const id = `invite-${randomUUID().slice(0, 8)}`;
  const sentAt = nowIso();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO invites (
      id, company_id, company_name, driver_email, driver_name, note,
      status, sent_at, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    companyId,
    companyName,
    input.driverEmail.trim(),
    input.driverName.trim(),
    input.note || "",
    "pending",
    sentAt,
    expiresAt,
    sentAt
  );
  return mapInvite(db.prepare("SELECT * FROM invites WHERE id = ?").get(id) as InviteRow);
}

function listInvites(companyId: string): Invite[] {
  return (
    db.prepare("SELECT * FROM invites WHERE company_id = ? ORDER BY created_at DESC").all(companyId) as InviteRow[]
  ).map(mapInvite);
}

function listInvitesForEmail(email: string): Invite[] {
  return (
    db
      .prepare("SELECT * FROM invites WHERE LOWER(driver_email) = LOWER(?) ORDER BY created_at DESC")
      .all(email) as InviteRow[]
  ).map(mapInvite);
}

function listCompanies(): CompanySummary[] {
  const rows = db
    .prepare("SELECT * FROM companies ORDER BY rating_average DESC")
    .all() as CompanyRow[];
  return rows.map(mapCompanySummary);
}

function getCompany(id: string): CompanyProfile | null {
  const row = db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as CompanyRow | undefined;
  if (!row) {
    return null;
  }

  return {
    ...mapCompanySummary(row),
    reviews: listReviews("company", id),
    openJobs: listJobs(id)
  };
}

function subjectExists(subjectType: "driver" | "company", subjectId: string): boolean {
  const table = subjectType === "driver" ? "drivers" : "companies";
  const row = db.prepare(`SELECT 1 AS ok FROM ${table} WHERE id = ?`).get(subjectId);
  return Boolean(row);
}

// Headline rating counts are aggregates (only a few sample reviews are stored),
// so blend each new review into the existing average instead of recomputing from rows.
function applyNewReview(subjectType: "driver" | "company", subjectId: string, newRating: number): void {
  const table = subjectType === "driver" ? "drivers" : "companies";
  const current = db
    .prepare(`SELECT rating_average, review_count, verified_review_count FROM ${table} WHERE id = ?`)
    .get(subjectId) as { rating_average: number; review_count: number; verified_review_count: number };

  const nextCount = current.review_count + 1;
  const nextVerified = current.verified_review_count + 1;
  const blended = (current.rating_average * current.review_count + newRating) / nextCount;
  const nextAverage = Math.round(blended * 10) / 10;

  db.prepare(
    `UPDATE ${table} SET rating_average = ?, review_count = ?, verified_review_count = ? WHERE id = ?`
  ).run(nextAverage, nextCount, nextVerified, subjectId);
}

function createReview(input: CreateReviewInput): Review | null {
  if (!subjectExists(input.subjectType, input.subjectId)) {
    return null;
  }

  const id = `review-${input.subjectId}-${Date.now()}`;
  const occurredAt = today();
  db.prepare(`INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    input.subjectType,
    input.subjectId,
    input.authorType,
    input.authorId,
    input.authorName,
    input.rating,
    input.title,
    input.comment,
    input.routeType,
    occurredAt,
    1
  );

  applyNewReview(input.subjectType, input.subjectId, input.rating);

  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id) as ReviewRow;
  return mapReview(row);
}

function submitVerification(
  subjectType: "driver" | "company",
  subjectId: string,
  checkIds?: string[]
): VerificationState | null {
  if (!subjectExists(subjectType, subjectId)) {
    return null;
  }

  const verifiedAt = today();
  if (checkIds && checkIds.length > 0) {
    const update = db.prepare(
      "UPDATE verification_checks SET status = 'verified', verified_at = ? WHERE id = ? AND subject_type = ? AND subject_id = ?"
    );
    checkIds.forEach((checkId) => update.run(verifiedAt, checkId, subjectType, subjectId));
  } else {
    db.prepare(
      "UPDATE verification_checks SET status = 'verified', verified_at = ? WHERE subject_type = ? AND subject_id = ? AND status != 'verified'"
    ).run(verifiedAt, subjectType, subjectId);
  }

  const state = buildVerification(subjectType, subjectId);

  if (state.status === "verified") {
    if (subjectType === "driver") {
      db.prepare("UPDATE drivers SET profile_verified = 1 WHERE id = ?").run(subjectId);
    } else {
      db.prepare("UPDATE companies SET verified = 1 WHERE id = ?").run(subjectId);
    }
  }

  return state;
}

function recommendDriversForCompany(companyId: string): MatchRecommendation[] | null {
  const company = getCompany(companyId);
  if (!company) {
    return null;
  }

  const jobs = company.openJobs.filter((job) => job.status !== "Paused");
  const targetCountries = Array.from(new Set(jobs.flatMap((job) => job.countries)));
  const targetLicenses = Array.from(new Set(jobs.map((job) => job.requiredLicense)));
  const targetLanguages = Array.from(new Set(jobs.flatMap((job) => job.languages)));

  return listDrivers()
    .map((driver) => {
      const reasons: string[] = [];
      const riskSignals: string[] = [];
      let score = driver.rating.average * 12 + Math.min(driver.yearsExperience, 12) * 1.5;

      if (driver.profileVerified) {
        score += 8;
        reasons.push("Verified public profile and transport documents");
      } else {
        riskSignals.push("Profile not yet fully verified");
      }

      if (targetLicenses.some((license) => driver.licenses.includes(license))) {
        score += 14;
        reasons.push(`License fit: ${targetLicenses.filter((license) => driver.licenses.includes(license)).join(", ")}`);
      }

      if (hasOverlap(driver.countries, targetCountries)) {
        score += 10;
        reasons.push(`Route history overlaps ${targetCountries.filter((country) => driver.countries.includes(country)).join(", ")}`);
      }

      if (hasOverlap(driver.languages, targetLanguages)) {
        score += 6;
        reasons.push(`Dispatch languages: ${targetLanguages.filter((language) => driver.languages.includes(language)).join(", ")}`);
      }

      if (driver.availability === "Available now") {
        score += 8;
        reasons.push("Available for immediate starts");
      } else if (driver.availability === "Open to offers") {
        score += 5;
        reasons.push("Open to company outreach");
      } else if (driver.availability === "Available in 2 weeks") {
        score += 3;
      } else {
        riskSignals.push("Currently contracted");
      }

      if (driver.rating.verifiedCount >= 15) {
        score += 6;
        reasons.push(`${driver.rating.verifiedCount} verified reputation signals`);
      } else if (driver.rating.verifiedCount < 10) {
        riskSignals.push("Smaller verified review history");
      }

      score += Math.min(driver.completedTransports / 35, 10);

      if (driver.responseRate < 90) {
        riskSignals.push("Response rate below 90%");
      }

      return {
        ...driver,
        matchScore: Math.min(98, Math.round(score)),
        matchReasons: reasons.slice(0, 4),
        riskSignals
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 5);
}

/* ---------- accounts & sessions ---------- */

type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "driver" | "company";
  subject_id: string;
  name: string;
  created_at: string;
};

function accountToUser(row: AccountRow): AuthUser {
  return { role: row.role, id: row.subject_id, name: row.name, email: row.email };
}

function createSession(accountId: string): string {
  const token = randomUUID();
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(token, accountId, nowIso());
  return token;
}

function getUserByToken(token: string): AuthUser | null {
  const row = db
    .prepare(
      "SELECT accounts.* FROM sessions JOIN accounts ON accounts.id = sessions.account_id WHERE sessions.token = ?"
    )
    .get(token) as AccountRow | undefined;
  return row ? accountToUser(row) : null;
}

function login(input: LoginInput): AuthResult | null {
  const email = input.email.trim().toLowerCase();
  const row = db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
  if (!row || !verifyPassword(input.password, row.password_hash)) {
    return null;
  }
  return { token: createSession(row.id), user: accountToUser(row) };
}

function logout(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function createDriverSubject(id: string, name: string, city: string, country: string): void {
  db.prepare(
    `INSERT INTO drivers (
      id,
      name,
      city,
      country,
      headline,
      bio,
      years_experience,
      availability,
      licenses,
      languages,
      countries,
      preferred_regions,
      route_types,
      rating_average,
      review_count,
      verified_review_count,
      completed_transports,
      response_rate,
      profile_verified,
      last_active,
      on_time_rate,
      incident_free_rate,
      documents_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    city,
    country,
    "New driver on RoadCred",
    "Just joined RoadCred — building my profile and reputation.",
    0,
    "Available now",
    json([]),
    json(["English"]),
    json(country === "—" ? [] : [country]),
    json([]),
    json([]),
    0,
    0,
    0,
    0,
    100,
    0,
    today(),
    100,
    100,
    0
  );
  db.prepare(
    "INSERT INTO availability_periods (id, driver_id, start_date, end_date, status, note) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(`per-${id}-1`, id, today(), null, "Available", "Available for work");
  DRIVER_VERIFICATION_CHECKS.forEach(([label, description], index) => {
    db.prepare("INSERT INTO verification_checks VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      `vc-${id}-${index}`,
      "driver",
      id,
      label,
      description,
      "unverified",
      null
    );
  });
}

function createCompanySubject(id: string, name: string, city: string, country: string): void {
  db.prepare(
    `INSERT INTO companies (
      id,
      name,
      city,
      country,
      description,
      fleet_type,
      operating_regions,
      rating_average,
      review_count,
      verified_review_count,
      active_jobs,
      verified,
      response_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    city,
    country,
    "New company on RoadCred.",
    "General freight",
    json(country === "—" ? [] : [country]),
    0,
    0,
    0,
    0,
    0,
    "New on RoadCred"
  );
  COMPANY_VERIFICATION_CHECKS.forEach(([label, description], index) => {
    db.prepare("INSERT INTO verification_checks VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      `vc-${id}-${index}`,
      "company",
      id,
      label,
      description,
      "unverified",
      null
    );
  });
}

function signup(input: SignupInput): AuthResult | { error: string } {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { error: "A valid email is required" };
  }
  if (!input.password || input.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (db.prepare("SELECT 1 FROM accounts WHERE email = ?").get(email)) {
    return { error: "An account with this email already exists" };
  }

  const name = input.name.trim() || (input.role === "company" ? "New Company" : "New Driver");
  const city = input.city?.trim() || "—";
  const country = input.country?.trim() || "—";
  const subjectId = `${input.role}-${randomUUID().slice(0, 8)}`;

  db.exec("BEGIN;");
  try {
    if (input.role === "driver") {
      createDriverSubject(subjectId, name, city, country);
    } else {
      createCompanySubject(subjectId, name, city, country);
    }
    const accountId = `acc-${randomUUID().slice(0, 8)}`;
    db.prepare("INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      accountId,
      email,
      hashPassword(input.password),
      input.role,
      subjectId,
      name,
      nowIso()
    );
    db.exec("COMMIT;");
    return { token: createSession(accountId), user: { role: input.role, id: subjectId, name, email } };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

/* ---------- profile editing ---------- */

type SqlValue = string | number | null;

function applyVisualIdentityUpdate(
  update: { visualIdentity?: DriverProfileUpdate["visualIdentity"] },
  set: (column: string, value: SqlValue) => void
): void {
  const visual = update.visualIdentity;
  if (!visual) {
    return;
  }
  if (visual.profileImageUrl !== undefined) set("profile_image_url", visual.profileImageUrl);
  if (visual.coverImageUrl !== undefined) set("cover_image_url", visual.coverImageUrl);
  if (visual.galleryImageUrls !== undefined) set("gallery_image_urls", json(visual.galleryImageUrls));
  if (visual.accentColor !== undefined) set("accent_color", visual.accentColor);
  if (visual.tagline !== undefined) set("profile_tagline", visual.tagline);
}

function updateDriver(id: string, update: DriverProfileUpdate): DriverProfile | null {
  if (!db.prepare("SELECT 1 FROM drivers WHERE id = ?").get(id)) {
    return null;
  }

  const columns: string[] = [];
  const values: SqlValue[] = [];
  const set = (column: string, value: SqlValue) => {
    columns.push(`${column} = ?`);
    values.push(value);
  };

  if (update.headline !== undefined) set("headline", update.headline);
  if (update.bio !== undefined) set("bio", update.bio);
  if (update.city !== undefined) set("city", update.city);
  if (update.country !== undefined) set("country", update.country);
  if (update.availability !== undefined) set("availability", update.availability);
  if (update.licenses) set("licenses", json(update.licenses));
  if (update.languages) set("languages", json(update.languages));
  if (update.countries) set("countries", json(update.countries));
  if (update.preferredRegions) set("preferred_regions", json(update.preferredRegions));
  if (update.routeTypes) set("route_types", json(update.routeTypes));
  applyVisualIdentityUpdate(update, set);

  if (columns.length > 0) {
    db.prepare(`UPDATE drivers SET ${columns.join(", ")} WHERE id = ?`).run(...values, id);
  }

  if (update.skills) {
    db.prepare("DELETE FROM driver_skills WHERE driver_id = ?").run(id);
    const insert = db.prepare("INSERT INTO driver_skills VALUES (?, ?, ?, ?, ?)");
    update.skills.forEach((skill, index) =>
      insert.run(`skill-${id}-${index}-${Date.now()}`, id, skill.name, skill.category, skill.level)
    );
  }

  if (update.availabilityPeriods) {
    // Only replace the driver's own periods — booking-origin blocks are authoritative
    // and must survive a self-edit so a booked window can't be wiped or un-blocked.
    db.prepare("DELETE FROM availability_periods WHERE driver_id = ? AND origin = 'driver'").run(id);
    const insert = db.prepare(
      "INSERT INTO availability_periods (id, driver_id, start_date, end_date, status, note, origin) VALUES (?, ?, ?, ?, ?, ?, 'driver')"
    );
    update.availabilityPeriods.forEach((period, index) =>
      insert.run(`per-${id}-${index}-${Date.now()}`, id, period.startDate, period.endDate, period.status, period.note)
    );
  }

  return getDriver(id);
}

function updateCompany(id: string, update: CompanyProfileUpdate): CompanyProfile | null {
  if (!db.prepare("SELECT 1 FROM companies WHERE id = ?").get(id)) {
    return null;
  }

  const columns: string[] = [];
  const values: SqlValue[] = [];
  const set = (column: string, value: SqlValue) => {
    columns.push(`${column} = ?`);
    values.push(value);
  };

  if (update.description !== undefined) set("description", update.description);
  if (update.fleetType !== undefined) set("fleet_type", update.fleetType);
  if (update.responseTime !== undefined) set("response_time", update.responseTime);
  if (update.city !== undefined) set("city", update.city);
  if (update.country !== undefined) set("country", update.country);
  if (update.operatingRegions) set("operating_regions", json(update.operatingRegions));
  applyVisualIdentityUpdate(update, set);

  if (columns.length > 0) {
    db.prepare(`UPDATE companies SET ${columns.join(", ")} WHERE id = ?`).run(...values, id);
  }

  return getCompany(id);
}

/* ---------- messaging ---------- */

type ConversationRow = {
  id: string;
  company_id: string;
  driver_id: string;
  created_at: string;
  last_message_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_role: "driver" | "company";
  sender_id: string;
  body: string;
  created_at: string;
};

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at
  };
}

function counterpartFor(
  row: ConversationRow,
  viewer: AuthUser
): { id: string; name: string; role: "driver" | "company" } {
  if (viewer.role === "company") {
    const driver = db.prepare("SELECT name FROM drivers WHERE id = ?").get(row.driver_id) as
      | { name: string }
      | undefined;
    return { id: row.driver_id, name: driver?.name ?? "Driver", role: "driver" };
  }
  const company = db.prepare("SELECT name FROM companies WHERE id = ?").get(row.company_id) as
    | { name: string }
    | undefined;
  return { id: row.company_id, name: company?.name ?? "Company", role: "company" };
}

function isMember(row: ConversationRow, viewer: AuthUser): boolean {
  return viewer.role === "company" ? row.company_id === viewer.id : row.driver_id === viewer.id;
}

function summarizeConversation(row: ConversationRow, viewer: AuthUser): ConversationSummary {
  const counterpart = counterpartFor(row, viewer);
  const last = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(row.id) as MessageRow | undefined;
  const count = db
    .prepare("SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?")
    .get(row.id) as { count: number };
  return {
    id: row.id,
    counterpartId: counterpart.id,
    counterpartName: counterpart.name,
    counterpartRole: counterpart.role,
    lastMessage: last?.body ?? "",
    lastMessageAt: row.last_message_at,
    messageCount: Number(count.count)
  };
}

function listConversations(viewer: AuthUser): ConversationSummary[] {
  const column = viewer.role === "company" ? "company_id" : "driver_id";
  const rows = db
    .prepare(`SELECT * FROM conversations WHERE ${column} = ? ORDER BY last_message_at DESC`)
    .all(viewer.id) as ConversationRow[];
  return rows.map((row) => summarizeConversation(row, viewer));
}

function getOrCreateConversation(viewer: AuthUser, counterpartId: string): ConversationSummary | null {
  let companyId: string;
  let driverId: string;
  if (viewer.role === "company") {
    companyId = viewer.id;
    driverId = counterpartId;
    if (!db.prepare("SELECT 1 FROM drivers WHERE id = ?").get(driverId)) {
      return null;
    }
  } else {
    driverId = viewer.id;
    companyId = counterpartId;
    if (!db.prepare("SELECT 1 FROM companies WHERE id = ?").get(companyId)) {
      return null;
    }
  }

  let row = db
    .prepare("SELECT * FROM conversations WHERE company_id = ? AND driver_id = ?")
    .get(companyId, driverId) as ConversationRow | undefined;

  if (!row) {
    const id = `conv-${randomUUID().slice(0, 8)}`;
    const now = nowIso();
    db.prepare("INSERT INTO conversations VALUES (?, ?, ?, ?, ?)").run(id, companyId, driverId, now, now);
    row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow;
  }

  return summarizeConversation(row, viewer);
}

function getConversationThread(viewer: AuthUser, conversationId: string): ConversationThread | null {
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as
    | ConversationRow
    | undefined;
  if (!row || !isMember(row, viewer)) {
    return null;
  }
  const counterpart = counterpartFor(row, viewer);
  const messages = (
    db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId) as MessageRow[]
  ).map(mapMessage);
  return {
    id: row.id,
    counterpartId: counterpart.id,
    counterpartName: counterpart.name,
    counterpartRole: counterpart.role,
    messages
  };
}

function addMessage(viewer: AuthUser, conversationId: string, body: string): Message | null {
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as
    | ConversationRow
    | undefined;
  if (!row || !isMember(row, viewer)) {
    return null;
  }
  const id = `msg-${randomUUID().slice(0, 8)}`;
  const now = nowIso();
  db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)").run(id, conversationId, viewer.role, viewer.id, body, now);
  db.prepare("UPDATE conversations SET last_message_at = ? WHERE id = ?").run(now, conversationId);
  return mapMessage(db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as MessageRow);
}

resetIfNeeded();
setupSchema();
migrateProfileVisuals();
migrateRoutesAndInvites();
seedDatabase();
ensureSupplementalExamples();
migrateDemoContent();
ensureDemoAccounts();
db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);

export const repository = {
  getCompany,
  listCompanies,
  getDriver,
  listDrivers,
  listJobs,
  createJob,
  createInvite,
  listInvites,
  listInvitesForEmail,
  recommendDriversForCompany,
  createReview,
  submitVerification,
  login,
  signup,
  logout,
  getUserByToken,
  updateDriver,
  updateCompany,
  listConversations,
  getOrCreateConversation,
  getConversationThread,
  addMessage,
  createBooking,
  respondToBooking,
  listBookingsForDriver,
  listBookingsForCompany,
  listAllBookings
};
