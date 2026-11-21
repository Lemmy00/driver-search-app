import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2, LogIn, Truck } from "lucide-react";
import {
  api,
  companyDemoAccounts,
  DEMO_PASSWORD,
  driverDemoAccounts,
  setToken,
  type Role,
  type Session
} from "./api";
import { BrandLockup } from "./Landing";
import { LocaleSelector } from "./LocaleSelector";
import { useI18n } from "./i18n";

function defaultEmailForRole(role: Role): string {
  const [account] = role === "company" ? companyDemoAccounts : driverDemoAccounts;
  return account?.email ?? "";
}

export function AuthPage({
  onAuthenticated,
  onBack
}: {
  onAuthenticated: (session: Session) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState<Role>("company");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(defaultEmailForRole("company"));
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = role === "company" ? companyDemoAccounts : driverDemoAccounts;

  const switchRole = (next: Role) => {
    setRole(next);
    setEmail(defaultEmailForRole(next));
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const finish = (result: { token: string; user: Session }) => {
    setToken(result.token);
    onAuthenticated(result.user);
  };

  const run = async (action: () => Promise<{ token: string; user: Session }>) => {
    setBusy(true);
    setError(null);
    try {
      finish(await action());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.generic"));
      setBusy(false);
    }
  };

  const submit = () => {
    if (mode === "login") {
      void run(() => api.login(email, password));
    } else {
      void run(() => api.signup({ role, name, email, password }));
    }
  };

  const enterDemo = (demoEmail: string) => {
    void run(() => api.login(demoEmail, DEMO_PASSWORD));
  };

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <BrandLockup />
          <h2>
            {t("auth.aside.titleLine1")}
            <br />
            {t("auth.aside.titleLine2")}
          </h2>
          <p>{t("auth.aside.body")}</p>
          <ul className="check-list">
            <li>
              <CheckCircle2 size={17} /> {t("auth.aside.bullet1")}
            </li>
            <li>
              <CheckCircle2 size={17} /> {t("auth.aside.bullet2")}
            </li>
            <li>
              <CheckCircle2 size={17} /> {t("auth.aside.bullet3")}
            </li>
          </ul>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-toolbar">
          <button type="button" className="auth-back" onClick={onBack}>
            <ArrowLeft size={16} /> {t("auth.backHome")}
          </button>
          <LocaleSelector variant="compact" />
        </div>

        <div className="auth-card">
          <h1>{mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}</h1>
          <p className="auth-sub">{t("auth.sub")}</p>

          <div className="role-toggle" role="tablist" aria-label={t("auth.accountType")}>
            <button type="button" className={role === "company" ? "active" : ""} onClick={() => switchRole("company")}>
              <Building2 size={17} /> {t("common.transportCompany")}
            </button>
            <button type="button" className={role === "driver" ? "active" : ""} onClick={() => switchRole("driver")}>
              <Truck size={17} /> {t("common.driver")}
            </button>
          </div>

          <div className="auth-form">
            {mode === "signup" ? (
              <label className="field">
                {role === "company" ? t("auth.companyName") : t("auth.fullName")}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            ) : null}
            <label className="field">
              {t("common.email")}
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="field">
              {t("common.password")}
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>
            {error ? <div className="form-error">{error}</div> : null}
            <button type="button" className="primary-button auth-submit" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={17} className="spin" /> : <LogIn size={17} />}
              {mode === "login" ? t("auth.signInAs", { role: t(role === "company" ? "auth.role.company" : "auth.role.driver") }) : t("auth.createAccount")}
            </button>
          </div>

          <div className="auth-divider">
            <span>{t("auth.demoDivider")}</span>
          </div>

          <div className="demo-accounts">
            {demoAccounts.map((account) => (
              <button
                type="button"
                className="demo-account"
                key={account.email}
                onClick={() => enterDemo(account.email)}
                disabled={busy}
              >
                <div className="demo-avatar">{role === "company" ? <Building2 size={18} /> : <Truck size={18} />}</div>
                <div>
                  <div className="demo-title-row">
                    <strong>{account.name}</strong>
                    <span className="demo-access">{account.accessLabel}</span>
                  </div>
                  <span>{account.note}</span>
                  <span className="demo-credential">
                    {account.email} / {DEMO_PASSWORD}
                  </span>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>

          <p className="auth-foot">
            {mode === "login" ? t("auth.newTo") : t("auth.alreadyHave")}{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? t("auth.createAccount") : t("common.signIn")}
            </button>
          </p>
          <p className="auth-note">{t("auth.prototypeNote")}</p>
        </div>
      </main>
    </div>
  );
}
