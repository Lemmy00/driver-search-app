import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const fixtureDir = path.join(rootDir, "functions/api");
const fixturePath = path.join(fixtureDir, "demo-fixture.json");
const databasePath = path.join(rootDir, ".roadcred-pages-demo.sqlite");

rmSync(databasePath, { force: true });
process.env.ROADCRED_DB_PATH = databasePath;

const [{ repository }, { demoAccounts }] = await Promise.all([
  import(path.join(rootDir, "apps/api/dist/db.js")),
  import(path.join(rootDir, "packages/shared/dist/index.js"))
]);

const accounts = demoAccounts.map(({ role, id, name, email }) => ({ role, id, name, email }));
const drivers = repository.listDrivers().map((driver) => repository.getDriver(driver.id));
const companies = repository.listCompanies().map((company) => repository.getCompany(company.id));
const jobs = repository.listJobs();
const bookings = repository.listAllBookings();
const invites = companies.flatMap((company) => repository.listInvites(company.id));
const matchesByCompanyId = Object.fromEntries(
  companies.map((company) => [company.id, repository.recommendDriversForCompany(company.id) ?? []])
);
const conversationsByUserId = Object.fromEntries(
  accounts.map((user) => {
    const summaries = repository.listConversations(user);
    const threadsById = Object.fromEntries(
      summaries.map((summary) => [summary.id, repository.getConversationThread(user, summary.id)])
    );
    return [user.id, { summaries, threadsById }];
  })
);

mkdirSync(fixtureDir, { recursive: true });
writeFileSync(
  fixturePath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      demoPassword: "demo1234",
      accounts,
      drivers,
      companies,
      jobs,
      bookings,
      invites,
      matchesByCompanyId,
      conversationsByUserId
    },
    null,
    2
  )}\n`
);
rmSync(databasePath, { force: true });

console.log(`Wrote ${path.relative(rootDir, fixturePath)}`);
