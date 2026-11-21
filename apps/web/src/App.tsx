import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LandingPage } from "./Landing";
import { AuthPage } from "./Auth";
import { CompanyApp } from "./CompanyApp";
import { DriverApp } from "./DriverApp";
import { api, getToken, setToken, type Session } from "./api";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const restore = async () => {
      if (!getToken()) {
        setRestoring(false);
        return;
      }
      try {
        setSession(await api.me());
      } catch {
        setToken(null);
      } finally {
        setRestoring(false);
      }
    };
    void restore();
  }, []);

  const signOut = () => {
    void api.logout().catch(() => undefined);
    setToken(null);
    setSession(null);
    setShowAuth(false);
  };

  if (restoring) {
    return (
      <div className="app-loading">
        <Loader2 size={28} className="spin" />
      </div>
    );
  }

  if (session?.role === "company") {
    return <CompanyApp session={session} onSignOut={signOut} />;
  }

  if (session?.role === "driver") {
    return <DriverApp session={session} onSignOut={signOut} />;
  }

  if (showAuth) {
    return (
      <AuthPage
        onAuthenticated={(next) => {
          setSession(next);
          setShowAuth(false);
        }}
        onBack={() => setShowAuth(false)}
      />
    );
  }

  return <LandingPage onEnter={() => setShowAuth(true)} />;
}

export default App;
