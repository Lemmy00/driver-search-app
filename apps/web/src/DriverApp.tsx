import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Clock3,
  LogOut,
  MapPinned,
  MessageSquareText,
  MessagesSquare,
  Route,
  ShieldCheck,
  Star,
  Truck,
  UserRound
} from "lucide-react";
import type {
  Booking,
  CompanyProfile,
  CompanySummary,
  DriverProfile,
  Invite,
  Job,
  Review,
  VerificationState
} from "@roadcred/shared";
import { api, type Session } from "./api";
import {
  AvailabilityCalendar,
  Metric,
  ProfileHero,
  ProfileLocation,
  ProfileMark,
  ProfileMediaGallery,
  RatingPill,
  ReviewModal,
  SkillGroups,
  TagList,
  VerificationPanel,
  VerificationPill,
  VerifiedBadge,
  routeLabel
} from "./ui";
import { BrandLockup } from "./Landing";
import { LocaleSelector } from "./LocaleSelector";
import { MessagingView } from "./Messaging";
import { AvailabilityModal, EditDriverModal } from "./editors";
import { type TranslationKey, useI18n } from "./i18n";

type ViewKey = "profile" | "work" | "companies" | "messages";

const navItems: { key: ViewKey; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { key: "profile", labelKey: "driver.nav.profile", icon: <UserRound size={18} /> },
  { key: "messages", labelKey: "driver.nav.messages", icon: <MessagesSquare size={18} /> },
  { key: "work", labelKey: "driver.nav.work", icon: <BriefcaseBusiness size={18} /> },
  { key: "companies", labelKey: "driver.nav.companies", icon: <Building2 size={18} /> }
];

const viewTitles: Record<ViewKey, { eyebrowKey: TranslationKey; titleKey: TranslationKey }> = {
  profile: { eyebrowKey: "driver.view.profile.eyebrow", titleKey: "driver.view.profile.title" },
  messages: { eyebrowKey: "driver.view.messages.eyebrow", titleKey: "driver.view.messages.title" },
  work: { eyebrowKey: "driver.view.work.eyebrow", titleKey: "driver.view.work.title" },
  companies: { eyebrowKey: "driver.view.companies.eyebrow", titleKey: "driver.view.companies.title" }
};

function ReviewCard({
  review,
  showAuthor = true,
  onAuthorClick
}: {
  review: Review;
  showAuthor?: boolean;
  onAuthorClick?: (review: Review) => void;
}) {
  return (
    <article className="review-row">
      <div className="row">
        <strong className="title">{review.title}</strong>
        <RatingPill average={review.rating} />
      </div>
      {showAuthor && onAuthorClick ? (
        <button type="button" className="sub author-link" onClick={() => onAuthorClick(review)}>
          {review.authorName}
        </button>
      ) : (
        <span className="sub">{showAuthor ? review.authorName : review.routeType}</span>
      )}
      <p>{review.comment}</p>
    </article>
  );
}

function IncomingBookingsPanel({
  bookings,
  onRespond
}: {
  bookings: Booking[];
  onRespond: (id: string, status: "accepted" | "declined") => void;
}) {
  const { t } = useI18n();
  if (bookings.length === 0) {
    return <p className="empty-hint">{t("booking.noneIncoming")}</p>;
  }
  const sorted = [...bookings].sort(
    (a, b) => Number(b.status === "pending") - Number(a.status === "pending")
  );
  return (
    <div className="booking-list">
      {sorted.map((booking) => (
        <article key={booking.id} className="booking-row">
          <div className="row">
            <strong>{t("booking.from", { company: booking.companyName })}</strong>
            <span className={`status-chip status-${booking.status}`}>{t(`booking.status.${booking.status}` as TranslationKey)}</span>
          </div>
          <span className="sub">
            {routeLabel(booking) || booking.routeType} · {booking.startDate} – {booking.endDate}
          </span>
          {booking.note ? <p>{booking.note}</p> : null}
          {booking.status === "pending" ? (
            <div className="profile-actions">
              <button type="button" className="primary-button" onClick={() => onRespond(booking.id, "accepted")}>
                {t("booking.accept")}
              </button>
              <button type="button" className="secondary-button" onClick={() => onRespond(booking.id, "declined")}>
                {t("booking.decline")}
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function MyProfile({
  me,
  pendingInvites,
  onVerificationUpdated,
  onRespondBooking,
  onOpenCompany
}: {
  me: DriverProfile;
  pendingInvites: Invite[];
  onVerificationUpdated: (state: VerificationState) => void;
  onRespondBooking: (id: string, status: "accepted" | "declined") => void;
  onOpenCompany: (companyId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="discover-layout single">
      <section className="surface profile-panel">
        <ProfileHero type="driver" name={me.name} visualIdentity={me.visualIdentity}>
          <div className="name-line profile-name">
            <h2>{me.name}</h2>
            {me.profileVerified ? <VerifiedBadge size={20} /> : null}
            <VerificationPill status={me.verification.status} />
          </div>
          <p>{me.visualIdentity.tagline || me.headline}</p>
          {me.visualIdentity.tagline ? <span className="profile-subtitle">{me.headline}</span> : null}
          <ProfileLocation city={me.city} country={me.country} />
        </ProfileHero>
        <ProfileMediaGallery visualIdentity={me.visualIdentity} />

        <div className="metric-grid">
          <Metric label={t("common.rating")} value={me.rating.average.toFixed(1)} icon={<Star size={18} />} />
          <Metric label={t("common.verifiedReviews")} value={me.rating.verifiedCount} icon={<ShieldCheck size={18} />} />
          <Metric label={t("common.experience")} value={t("common.yearsShort", { count: me.yearsExperience })} icon={<Truck size={18} />} />
          <Metric label={t("common.onTimeRate")} value={`${me.reliability.onTimeRate}%`} icon={<Clock3 size={18} />} />
        </div>

        <div className="profile-section">
          <h3>{t("driver.profile.myAvailability")}</h3>
          <AvailabilityCalendar periods={me.availabilityPeriods} bookings={me.bookings ?? []} readOnly />
        </div>

        <div className="profile-section">
          <h3>{t("booking.incoming")}</h3>
          <IncomingBookingsPanel bookings={me.bookings ?? []} onRespond={onRespondBooking} />
        </div>

        <div className="profile-section">
          <h3>{t("pending.invites.title")}</h3>
          {pendingInvites.length === 0 ? (
            <p className="empty-hint">{t("pending.invites.empty")}</p>
          ) : (
            <div className="invite-list">
              {pendingInvites.map((invite) => (
                <article key={invite.id} className="invite-row">
                  <div className="row">
                    <strong>{t("pending.invites.from", { company: invite.companyName })}</strong>
                    <span className="status-chip status-pending">{t("invite.status.pending")}</span>
                  </div>
                  {invite.note ? <p>{invite.note}</p> : null}
                  <span className="invite-meta">
                    <Clock3 size={13} /> {t("pending.invites.sentOn", { date: invite.sentAt.slice(0, 10) })}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>{t("driver.profile.fitTitle")}</h3>
          <div className="fit-grid">
            <div>
              <span>{t("common.licenses")}</span>
              <TagList items={me.licenses} tone="strong" />
            </div>
            <div>
              <span>{t("common.languages")}</span>
              <TagList items={me.languages} valueNamespace="language" />
            </div>
            <div>
              <span>{t("common.countries")}</span>
              <TagList items={me.countries} valueNamespace="country" />
            </div>
            <div>
              <span>{t("common.routeTypes")}</span>
              <TagList items={me.routeTypes} tone="warm" />
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>{t("common.skillsSpecialties")}</h3>
          <SkillGroups skills={me.skills} />
        </div>

        <div className="profile-section">
          <h3>{t("driver.profile.aboutMe")}</h3>
          <p className="bio">{me.bio}</p>
        </div>

        <div className="profile-section">
          <h3>{t("common.experienceHistory")}</h3>
          <div className="timeline">
            {me.experience.map((item) => (
              <article key={item.id} className="timeline-item">
                <div className="row">
                  <div>
                    <strong className="role">{item.role}</strong>
                  <span className="company">{item.companyName}</span>
                </div>
                <span className="period">
                    {item.startDate} – {item.endDate ?? t("common.present")}
                  </span>
              </div>
                <p>{item.description}</p>
                <TagList items={[...item.countries.slice(0, 4), ...item.truckTypes.slice(0, 2)]} valueNamespace="country" />
              </article>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h3>{t("driver.profile.reviewsFromCompanies")}</h3>
          <div className="review-list">
            {me.reviews.length === 0 ? (
              <p className="empty-hint">{t("driver.profile.noReviews")}</p>
            ) : (
              me.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} onAuthorClick={(entry) => onOpenCompany(entry.authorId)} />
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="profile-side">
        <section className="surface compact-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("driver.trust.eyebrow")}</span>
              <h2>{t("common.verification")}</h2>
            </div>
            <span className="head-icon">
              <ShieldCheck size={18} />
            </span>
          </div>
          <VerificationPanel
            role="driver"
            id={me.id}
            verification={me.verification}
            canManage
            onUpdated={onVerificationUpdated}
          />
        </section>
      </aside>
    </div>
  );
}

function JobsBrowser({
  jobs,
  onExpressInterest,
  onOpenCompany
}: {
  jobs: Job[];
  onExpressInterest: (companyId: string) => void;
  onOpenCompany: (companyId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="surface compact-panel wide">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("driver.jobs.eyebrow")}</span>
          <h2>{t("driver.jobs.count", { count: jobs.length })}</h2>
        </div>
        <span className="head-icon">
          <BriefcaseBusiness size={18} />
        </span>
      </div>
      <div className="job-grid">
        {jobs.map((job) => (
          <article className="job-card" key={job.id}>
            <div className="job-card-top">
              <strong>{job.title}</strong>
              <span className={`status-chip status-${job.status.toLowerCase()}`}>{job.status}</span>
            </div>
            <button type="button" className="job-company job-company-link" onClick={() => onOpenCompany(job.companyId)}>
              <Building2 size={14} /> {job.companyName}
            </button>
            <div className="job-lane">
              <MapPinned size={14} /> {job.origin} → {job.destination}
            </div>
            <TagList items={[job.requiredLicense, job.truckType]} tone="strong" />
            <p className="job-meta">
              {job.startDate && job.endDate ? `${job.startDate} – ${job.endDate}` : job.startWindow} · {job.contractType} · {job.payBand}
            </p>
            <button type="button" className="secondary-button" onClick={() => onExpressInterest(job.companyId)}>
              <MessageSquareText size={16} /> {t("driver.jobs.expressInterest")}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompanyDetail({
  company,
  onReview,
  onContact
}: {
  company: CompanyProfile;
  onReview: () => void;
  onContact: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="surface company-panel">
      <ProfileHero type="company" name={company.name} visualIdentity={company.visualIdentity}>
        <div className="name-line profile-name">
          <h2>{company.name}</h2>
          {company.verified ? <VerifiedBadge size={20} /> : null}
          <VerificationPill status={company.verification.status} />
        </div>
        <p className="company-desc">{company.visualIdentity.tagline || company.description}</p>
        {company.visualIdentity.tagline ? <span className="profile-subtitle">{company.description}</span> : null}
        <ProfileLocation city={company.city} country={company.country} />
      </ProfileHero>
      <ProfileMediaGallery visualIdentity={company.visualIdentity} />

      <div className="profile-actions">
        <button type="button" className="primary-button" onClick={onContact}>
          <MessageSquareText size={17} /> {t("driver.company.contact")}
        </button>
        <button type="button" className="secondary-button" onClick={onReview}>
          <Star size={17} /> {t("driver.company.review")}
        </button>
      </div>

      <div className="metric-grid">
        <Metric label={t("company.profile.rating")} value={company.rating.average.toFixed(1)} icon={<Star size={18} />} />
        <Metric label={t("common.reviews")} value={company.rating.count} icon={<MessageSquareText size={18} />} />
        <Metric label={t("common.response")} value={company.responseTime} icon={<Clock3 size={18} />} variant="text" />
        <Metric label={t("common.fleet")} value={company.fleetType} icon={<Truck size={18} />} variant="text" />
      </div>

      <div className="profile-section">
        <h3>{t("common.operatingRegions")}</h3>
        <TagList items={company.operatingRegions} tone="strong" />
      </div>

      <div className="profile-section">
        <h3>{t("driver.company.whatDriversSay")}</h3>
        <div className="review-list">
          {company.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CompaniesBrowser({
  companies,
  selectedId,
  detail,
  open,
  onOpen,
  onBack,
  onReview,
  onContact
}: {
  companies: CompanySummary[];
  selectedId: string;
  detail: CompanyProfile | null;
  open: boolean;
  onOpen: (id: string) => void;
  onBack: () => void;
  onReview: () => void;
  onContact: (companyId: string) => void;
}) {
  const { t, translateValue } = useI18n();

  if (open && detail) {
    return (
      <div className="profile-view">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <CompanyDetail company={detail} onReview={onReview} onContact={() => onContact(detail.id)} />
      </div>
    );
  }

  return (
    <div className="browse-layout">
      <section className="surface driver-results">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("common.directory")}</span>
            <h2>{t("driver.company.count", { count: companies.length })}</h2>
          </div>
        </div>
        <div className="driver-grid">
          {companies.map((company) => (
            <button
              type="button"
              key={company.id}
              className={`driver-card ${company.id === selectedId ? "is-active" : ""}`}
              onClick={() => onOpen(company.id)}
            >
              <div className="driver-card-header">
                <ProfileMark type="company" name={company.name} visualIdentity={company.visualIdentity} compact />
                <div>
                  <div className="name-line">
                    <strong>{company.name}</strong>
                    {company.verified ? <VerifiedBadge /> : null}
                  </div>
                  <span>
                    {company.city}, {translateValue("country", company.country)}
                  </span>
                </div>
              </div>
              <p>{company.description}</p>
              <div className="driver-card-meta">
                <RatingPill average={company.rating.average} count={company.rating.count} />
                <span className="availability">{t("driver.company.openJobs", { count: company.activeJobs })}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function DriverApp({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<ViewKey>("profile");
  const [me, setMe] = useState<DriverProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [settingAvailability, setSettingAvailability] = useState(false);
  const [openCompanyProfile, setOpenCompanyProfile] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

  const contactCompany = useCallback(async (companyId: string) => {
    try {
      const conversation = await api.startConversation(companyId);
      setActiveConversationId(conversation.id);
      setActiveView("messages");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.conversation.start"));
    }
  }, [t]);

  const loadMe = useCallback(async () => {
    try {
      setMe(await api.getDriver(session.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.myProfile.load"));
    }
  }, [session.id, t]);

  const respondBooking = useCallback(
    async (id: string, status: "accepted" | "declined") => {
      try {
        await api.respondToBooking(id, { status });
        await loadMe();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t("error.booking.update"));
      }
    },
    [loadMe, t]
  );

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobsPayload, companiesPayload, invitesPayload] = await Promise.all([
          api.listJobs(),
          api.listCompanies(),
          api.listPendingInvites(session.email)
        ]);
        setJobs(jobsPayload);
        setCompanies(companiesPayload);
        setPendingInvites(invitesPayload);
        if (companiesPayload[0]) {
          setSelectedCompanyId(companiesPayload[0].id);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t("error.data.load"));
      }
    };
    void load();
  }, [session.email, t]);

  const loadCompany = useCallback(async (id: string) => {
    if (!id) {
      return;
    }
    try {
      setSelectedCompany(await api.getCompany(id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.company.load"));
    }
  }, [t]);

  useEffect(() => {
    void loadCompany(selectedCompanyId);
  }, [selectedCompanyId, loadCompany]);

  const heading = viewTitles[activeView];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandLockup />

        <nav className="side-nav" aria-label={t("common.mainNavigation")}>
          <span className="side-label">{t("driver.workspace")}</span>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={activeView === item.key ? "active" : ""}
              onClick={() => setActiveView(item.key)}
              type="button"
            >
              {item.icon}
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <div className="account-panel">
          <div className="account-id">
            <div className="account-avatar driver">
              <Truck size={18} />
            </div>
            <div>
              <span>{t("common.signedInAs")}</span>
              <strong>{session.name}</strong>
            </div>
          </div>
          <LocaleSelector />
          <button type="button" className="signout-button" onClick={onSignOut}>
            <LogOut size={15} /> {t("common.signOut")}
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              <Route size={13} /> {t(heading.eyebrowKey)}
            </span>
            <h1>{t(heading.titleKey)}</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="secondary-button" onClick={() => setEditingProfile(true)} disabled={!me}>
              <UserRound size={17} />
              {t("driver.action.editProfile")}
            </button>
            <button type="button" className="primary-button" onClick={() => setSettingAvailability(true)} disabled={!me}>
              <BriefcaseBusiness size={17} />
              {t("driver.action.setAvailability")}
            </button>
          </div>
        </header>

        {error ? (
          <div className="error-banner">
            <ShieldCheck size={17} />
            {error}
          </div>
        ) : null}

        {activeView === "profile" && me ? (
          <MyProfile
            me={me}
            pendingInvites={pendingInvites}
            onVerificationUpdated={(state) =>
              setMe({ ...me, verification: state, profileVerified: state.status === "verified" ? true : me.profileVerified })
            }
            onRespondBooking={respondBooking}
            onOpenCompany={(companyId) => {
              setSelectedCompanyId(companyId);
              setOpenCompanyProfile(true);
              setActiveView("companies");
            }}
          />
        ) : null}

        {activeView === "messages" ? (
          <MessagingView session={session} openConversationId={activeConversationId} />
        ) : null}

        {activeView === "work" ? (
          <JobsBrowser
            jobs={jobs}
            onExpressInterest={contactCompany}
            onOpenCompany={(companyId) => {
              setSelectedCompanyId(companyId);
              setOpenCompanyProfile(true);
              setActiveView("companies");
            }}
          />
        ) : null}

        {activeView === "companies" ? (
          <CompaniesBrowser
            companies={companies}
            selectedId={selectedCompanyId}
            detail={selectedCompany}
            open={openCompanyProfile}
            onOpen={(id) => {
              setSelectedCompanyId(id);
              setOpenCompanyProfile(true);
            }}
            onBack={() => setOpenCompanyProfile(false)}
            onReview={() => setShowReview(true)}
            onContact={contactCompany}
          />
        ) : null}
      </main>

      {showReview && selectedCompany ? (
        <ReviewModal
          subjectType="company"
          subjectId={selectedCompany.id}
          subjectName={selectedCompany.name}
          author={session}
          defaultRouteType="General"
          onClose={() => setShowReview(false)}
          onSubmitted={() => void loadCompany(selectedCompany.id)}
        />
      ) : null}

      {editingProfile && me ? (
        <EditDriverModal driver={me} onClose={() => setEditingProfile(false)} onSaved={setMe} />
      ) : null}

      {settingAvailability && me ? (
        <AvailabilityModal driver={me} onClose={() => setSettingAvailability(false)} onSaved={setMe} />
      ) : null}
    </div>
  );
}
