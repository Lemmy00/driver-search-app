import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, MessagesSquare, Plus, SendHorizontal, Truck, X } from "lucide-react";
import type { ConversationSummary, ConversationThread } from "@roadcred/shared";
import { api, defaultDriverFilters, type Session } from "./api";
import { useI18n } from "./i18n";

interface Counterpart {
  id: string;
  name: string;
  subtitle: string;
}

function timeLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function MessagingView({
  session,
  openConversationId
}: {
  session: Session;
  openConversationId?: string | null;
}) {
  const { locale, t, translateValue } = useI18n();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(openConversationId ?? null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
  const [loadingCounterparts, setLoadingCounterparts] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      setActiveId((current) => current ?? openConversationId ?? list[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.conversations.load"));
    }
  }, [openConversationId, t]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (openConversationId) {
      setActiveId(openConversationId);
    }
  }, [openConversationId]);

  const loadThread = useCallback(async (id: string) => {
    try {
      setThread(await api.getConversation(id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.conversation.load"));
    }
  }, [t]);

  useEffect(() => {
    if (activeId) {
      void loadThread(activeId);
    } else {
      setThread(null);
    }
  }, [activeId, loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread]);

  const beginCompose = useCallback(async () => {
    setComposing(true);
    setPickQuery("");
    setLoadingCounterparts(true);
    try {
      if (session.role === "company") {
        const drivers = await api.listDrivers(defaultDriverFilters);
        setCounterparts(
          drivers.map((driver) => ({
            id: driver.id,
            name: driver.name,
            subtitle: [driver.city, translateValue("country", driver.country)].filter(Boolean).join(", ")
          }))
        );
      } else {
        const companies = await api.listCompanies();
        setCounterparts(
          companies.map((company) => ({
            id: company.id,
            name: company.name,
            subtitle: [company.city, translateValue("country", company.country)].filter(Boolean).join(", ")
          }))
        );
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.contacts.load"));
    } finally {
      setLoadingCounterparts(false);
    }
  }, [session.role, t, translateValue]);

  const startWith = useCallback(
    async (counterpartId: string) => {
      try {
        const conversation = await api.startConversation(counterpartId);
        setComposing(false);
        setActiveId(conversation.id);
        await loadConversations();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t("error.conversation.start"));
      }
    },
    [loadConversations, t]
  );

  const filteredCounterparts = useMemo(() => {
    const needle = pickQuery.trim().toLowerCase();
    if (!needle) {
      return counterparts;
    }
    return counterparts.filter(
      (counterpart) =>
        counterpart.name.toLowerCase().includes(needle) || counterpart.subtitle.toLowerCase().includes(needle)
    );
  }, [counterparts, pickQuery]);

  const send = async () => {
    if (!activeId || !draft.trim()) {
      return;
    }
    setSending(true);
    try {
      await api.sendMessage(activeId, draft.trim());
      setDraft("");
      await loadThread(activeId);
      await loadConversations();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.message.send"));
    } finally {
      setSending(false);
    }
  };

  const CounterIcon = session.role === "company" ? Truck : Building2;

  return (
    <div className="messaging">
      <section className="surface conversation-list">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("common.inbox")}</span>
            <h2>{t("common.messages")}</h2>
          </div>
          <button type="button" className="ghost-button compose-button" onClick={() => void beginCompose()}>
            <Plus size={16} />
            {t("messages.new")}
          </button>
        </div>

        {conversations.length === 0 ? (
          <p className="empty-hint">{t("messages.emptyList")}</p>
        ) : (
          <div className="conversation-items">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={`conversation-item ${conversation.id === activeId ? "is-active" : ""}`}
                onClick={() => setActiveId(conversation.id)}
              >
                <div className="conversation-avatar">
                  <CounterIcon size={18} />
                </div>
                <div className="conversation-meta">
                  <div className="conversation-top">
                    <strong>{conversation.counterpartName}</strong>
                    <span>{timeLabel(conversation.lastMessageAt, locale)}</span>
                  </div>
                  <p>{conversation.lastMessage || t("common.noMessagesYet")}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="surface conversation-thread">
        {composing ? (
          <div className="compose-panel">
            <div className="thread-head">
              <div>
                <strong>{t("messages.newTitle")}</strong>
                <span>{t("messages.pickHint")}</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setComposing(false)} aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>
            <div className="compose-search">
              <input
                value={pickQuery}
                onChange={(event) => setPickQuery(event.target.value)}
                placeholder={session.role === "company" ? t("common.driver") : t("common.transportCompany")}
                autoFocus
              />
            </div>
            <div className="compose-list">
              {loadingCounterparts ? (
                <>
                  <div className="skeleton" />
                  <div className="skeleton" />
                  <div className="skeleton" />
                </>
              ) : filteredCounterparts.length === 0 ? (
                <p className="empty-hint">{t("messages.noCounterparts")}</p>
              ) : (
                filteredCounterparts.map((counterpart) => (
                  <button
                    type="button"
                    key={counterpart.id}
                    className="compose-item"
                    onClick={() => void startWith(counterpart.id)}
                  >
                    <div className="conversation-avatar">
                      <CounterIcon size={18} />
                    </div>
                    <div className="conversation-meta">
                      <strong>{counterpart.name}</strong>
                      {counterpart.subtitle ? <p>{counterpart.subtitle}</p> : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : thread ? (
          <>
            <div className="thread-head">
              <div className="conversation-avatar">
                <CounterIcon size={18} />
              </div>
              <div>
                <strong>{thread.counterpartName}</strong>
                <span>{thread.counterpartRole === "company" ? t("common.transportCompany") : t("common.driver")}</span>
              </div>
            </div>

            <div className="thread-body">
              {thread.messages.length === 0 ? (
                <p className="empty-hint">{t("messages.emptyThread")}</p>
              ) : (
                thread.messages.map((message) => {
                  const mine = message.senderRole === session.role;
                  return (
                    <div key={message.id} className={`bubble-row ${mine ? "mine" : "theirs"}`}>
                      <div className="bubble">
                        <p>{message.body}</p>
                        <time>{timeLabel(message.createdAt, locale)}</time>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="composer">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={t("messages.placeholder", { name: thread.counterpartName })}
              />
              <button type="button" className="primary-button" onClick={() => void send()} disabled={sending || !draft.trim()}>
                <SendHorizontal size={16} />
                {t("messages.send")}
              </button>
            </div>
          </>
        ) : (
          <div className="profile-empty">
            <div className="empty-icon">
              <MessagesSquare size={28} />
            </div>
            <h2>{t("messages.selectTitle")}</h2>
            <p>{t("messages.selectBody")}</p>
          </div>
        )}

        {error ? <div className="form-error thread-error">{error}</div> : null}
      </section>
    </div>
  );
}
