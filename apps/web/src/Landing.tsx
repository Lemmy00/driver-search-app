import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Gauge,
  Globe2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Truck
} from "lucide-react";
import { LocaleSelector } from "./LocaleSelector";
import { Avatar, RatingPill, ScoreRing, TagList, VerifiedBadge } from "./ui";
import { BRAND_NAME } from "./branding";
import { useI18n } from "./i18n";

export function BrandLockup() {
  const { t } = useI18n();

  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        <img src="/roadcred-mark.svg" alt="" />
      </div>
      <div className="brand-text">
        <strong>{BRAND_NAME}</strong>
        <span>{t("brand.tagline")}</span>
      </div>
    </div>
  );
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const { t, translateValue } = useI18n();
  const previewName = t("landing.preview.name");

  return (
    <div className="landing">
      <header className="landing-nav">
        <BrandLockup />
        <nav className="nav-links" aria-label={t("landing.nav.sections")}>
          <a href="#how">{t("landing.nav.how")}</a>
          <a href="#features">{t("landing.nav.platform")}</a>
          <a href="#sides">{t("landing.nav.sides")}</a>
        </nav>
        <div className="nav-actions">
          <LocaleSelector variant="compact" />
          <button type="button" className="ghost-button nav-hide" onClick={onEnter}>
            {t("common.signIn")}
          </button>
          <button type="button" className="primary-button" onClick={onEnter}>
            {t("landing.enterWorkspace")}
            <ArrowRight size={17} />
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={14} /> {t("landing.hero.eyebrow")}
            </span>
            <h1>
              {t("landing.hero.titleStart")} <span className="grad">{t("landing.hero.titleEmphasis")}</span>.
            </h1>
            <p className="lede">{t("landing.hero.lede")}</p>
            <div className="hero-cta">
              <button type="button" className="primary-button" onClick={onEnter}>
                {t("landing.hero.explore")}
                <ArrowRight size={17} />
              </button>
              <a className="secondary-button" href="#how">
                {t("landing.hero.seeHow")}
              </a>
            </div>

            <div className="hero-stats">
              <div className="stat">
                <strong>40+</strong>
                <span>{t("landing.stats.countries")}</span>
              </div>
              <div className="stat">
                <strong>4.8★</strong>
                <span>{t("landing.stats.rating")}</span>
              </div>
              <div className="stat">
                <strong>100%</strong>
                <span>{t("landing.stats.profiles")}</span>
              </div>
              <div className="stat">
                <strong>&lt;6h</strong>
                <span>{t("landing.stats.response")}</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="float-badge fb-top">
              <ShieldCheck size={15} /> {t("landing.preview.verifiedProfile")}
            </div>
            <div className="float-badge fb-bottom">
              <Gauge size={15} /> {t("landing.preview.matchFit", { score: 96 })}
            </div>

            <div className="preview-card">
              <div className="preview-head">
                <Avatar name={previewName} />
                <div>
                  <div className="name-line">
                    <h3>{previewName}</h3>
                    <VerifiedBadge size={17} />
                  </div>
                  <p>{t("landing.preview.specialty")}</p>
                </div>
                <div className="preview-score">
                  <ScoreRing value={96} size={64} />
                </div>
              </div>

              <div className="preview-row">
                <RatingPill average={4.9} count={36} />
                <span className="availability">{translateValue("availability", "Available now")}</span>
              </div>

              <div className="preview-metrics">
                <div className="pm">
                  <strong>{t("common.yearsShort", { count: 11 })}</strong>
                  <span>{t("common.experience")}</span>
                </div>
                <div className="pm">
                  <strong>98%</strong>
                  <span>{t("landing.preview.onTime")}</span>
                </div>
                <div className="pm">
                  <strong>31</strong>
                  <span>{t("common.verifiedReviews")}</span>
                </div>
              </div>

              <div className="preview-row">
                <TagList items={["CE", "ADR", t("landing.preview.refrigeratedTag")]} tone="strong" />
              </div>
            </div>
          </div>
        </section>

        <div className="trust-band">
          <span>{t("landing.trust.builtFor")}</span>
          <span className="pill">DACH</span>
          <span className="pill">Benelux</span>
          <span className="pill">Nordics</span>
          <span className="pill">Balkans</span>
          <span className="pill">Iberia</span>
        </div>

        <section className="section" id="how">
          <div className="section-head">
            <span className="eyebrow">{t("landing.how.eyebrow")}</span>
            <h2>{t("landing.how.title")}</h2>
            <p>{t("landing.how.body")}</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>{t("landing.step1.title")}</h3>
              <p>{t("landing.step1.body")}</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>{t("landing.step2.title")}</h3>
              <p>{t("landing.step2.body")}</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>{t("landing.step3.title")}</h3>
              <p>{t("landing.step3.body")}</p>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="section-head">
            <span className="eyebrow">{t("landing.platform.eyebrow")}</span>
            <h2>{t("landing.platform.title")}</h2>
          </div>
          <div className="feature-grid">
            <div className="feature">
              <div className="feature-icon">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3>{t("landing.feature.reputation.title")}</h3>
                <p>{t("landing.feature.reputation.body")}</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <Gauge size={24} />
              </div>
              <div>
                <h3>{t("landing.feature.matching.title")}</h3>
                <p>{t("landing.feature.matching.body")}</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <Globe2 size={24} />
              </div>
              <div>
                <h3>{t("landing.feature.availability.title")}</h3>
                <p>{t("landing.feature.availability.body")}</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <MessageSquareText size={24} />
              </div>
              <div>
                <h3>{t("landing.feature.contact.title")}</h3>
                <p>{t("landing.feature.contact.body")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="sides">
          <div className="section-head">
            <span className="eyebrow">{t("landing.sides.eyebrow")}</span>
            <h2>{t("landing.sides.title")}</h2>
          </div>
          <div className="split">
            <div className="split-card">
              <div className="badge-icon">
                <Building2 size={22} />
              </div>
              <h3>{t("landing.side.company.title")}</h3>
              <p>{t("landing.side.company.body")}</p>
              <ul className="check-list">
                <li>
                  <CheckCircle2 size={17} /> {t("landing.side.company.bullet1")}
                </li>
                <li>
                  <CheckCircle2 size={17} /> {t("landing.side.company.bullet2")}
                </li>
                <li>
                  <CheckCircle2 size={17} /> {t("landing.side.company.bullet3")}
                </li>
              </ul>
            </div>
            <div className="split-card teal">
              <div className="badge-icon">
                <Truck size={22} />
              </div>
              <h3>{t("landing.side.driver.title")}</h3>
              <p>{t("landing.side.driver.body")}</p>
              <ul className="check-list">
                <li>
                  <CheckCircle2 size={17} /> {t("landing.side.driver.bullet1")}
                </li>
                <li>
                  <CheckCircle2 size={17} /> {t("landing.side.driver.bullet2")}
                </li>
                <li>
                  <CheckCircle2 size={17} /> {t("landing.side.driver.bullet3")}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="cta-band">
          <h2>{t("landing.cta.title")}</h2>
          <p>{t("landing.cta.body")}</p>
          <div className="hero-cta">
            <button type="button" className="primary-button" onClick={onEnter}>
              {t("landing.cta.button")}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-inner">
          <BrandLockup />
          <span>{t("landing.footer")}</span>
        </div>
      </footer>
    </div>
  );
}
