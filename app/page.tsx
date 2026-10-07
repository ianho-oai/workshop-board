"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  MessageSquare,
  Layers3,
  CircleUserRound,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ThumbsUp,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ThemeDiscovery } from "@/components/theme-discovery";
import { boardConfig } from "@/lib/board-config";
import { Toaster, toast } from "sonner";

type Profile = { name: string; ministry: string };
type Question = {
  id: string;
  body: string;
  name: string | null;
  ministry: string | null;
  anonymous: number;
  created_at: number;
  votes: number;
  comments: number;
  voted: number;
  own: number;
  agent_status?: string;
};
type Comment = {
  is_agent?: number;
  sources?: string;
  id: string;
  body: string;
  name: string | null;
  ministry: string | null;
  anonymous: number;
  created_at: number;
};
type Theme = { label: string; question_ids: string[] };
type Board = {
  questions: Question[];
  clustering: {
    attempts?: number;
    lock_until?: number;
    snapshot: Theme[];
    duration_ms: number | null;
    status: string;
    updated_at: number | null;
    next_run: number;
    error: string | null;
  };
};
const PROFILE_KEY = "dialogue-board.profile.v1";
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const r = await fetch(path, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const value = (await r.json()) as T & { error?: string };
  if (!r.ok)
    throw new Error(value.error || "Unable to connect. Please try again.");
  return value;
}
function ago(time: number) {
  const mins = Math.max(0, Math.floor((Date.now() - time) / 60000));
  return mins === 0
    ? "Just now"
    : mins < 60
      ? `${mins}m ago`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ago`
        : new Date(time).toLocaleDateString(boardConfig.locale, {
            day: "numeric",
            month: "short",
          });
}
function Author({ item }: { item: Question | Comment }) {
  return (
    <span className="author">
      {"is_agent" in item && item.is_agent ? (
        <>
          <Sparkles size={14} />
          <strong>{boardConfig.assistant.name}</strong>
          <span className="agent-badge">AI-generated</span>
        </>
      ) : item.anonymous ? (
        <>
          <EyeOff size={13} />
          Anonymous
        </>
      ) : (
        <>
          <span className="avatar">{item.name?.slice(0, 1).toUpperCase()}</span>
          {item.name}
          <span className="ministry">{item.ministry}</span>
        </>
      )}
    </span>
  );
}
function ReplyBody({ comment }: { comment: Comment }) {
  if (!comment.is_agent) return <p>{comment.body}</p>;
  let sources: Array<{ url: string; title: string }> = [];
  try {
    sources = JSON.parse(comment.sources || "[]");
  } catch {}
  const inline = (text: string) =>
    text.split(/(\[\d+\])/g).map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/),
        source = match ? sources[Number(match[1]) - 1] : null;
      if (!source) return part;
      try {
        const url = new URL(source.url);
        if (url.protocol !== "https:") return part;
      } catch {
        return part;
      }
      return (
        <a
          className="inline-citation"
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {source.title}
        </a>
      );
    });
  const lines = /^\s*[-*•]\s/m.test(comment.body)
    ? comment.body.split(/\n+/)
    : comment.body.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/);
  const points = lines
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  return (
    <ul className="agent-points">
      {points.map((point, i) => (
        <li key={i}>{inline(point)}</li>
      ))}
    </ul>
  );
}

function QuestionCard({
  q,
  onOpen,
  onVote,
  busy,
  expanded,
  children,
}: {
  q: Question;
  onOpen: (id: string) => void;
  onVote: (q: Question) => void;
  busy: boolean;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible
      open={expanded}
      onOpenChange={() => onOpen(q.id)}
      className={`question-item ${expanded ? "expanded" : ""}`}
    >
      <article className="question-card">
        <button
          className={`vote-button ${q.voted ? "is-voted" : ""}`}
          onClick={() => onVote(q)}
          disabled={busy || !!q.own}
          aria-label={`Add an upvote to question ${q.id.slice(0, 6)}`}
          title={
            q.own
              ? "You can upvote other participants’ questions"
              : q.voted
                ? `Add another upvote (${q.voted} from you)`
                : "Upvote this question"
          }
        >
          <ThumbsUp size={19} />
          <strong>{q.votes}</strong>
          <span className="vote-label">
            {q.own ? "Your post" : q.voted ? "Vote again" : "Upvote"}
          </span>
        </button>
        <div className="question-main">
          <CollapsibleTrigger asChild>
            <button className="question-text">{q.body}</button>
          </CollapsibleTrigger>
          <div className="question-meta">
            <Author item={q} />
            <time dateTime={new Date(q.created_at).toISOString()}>
              {ago(q.created_at)}
            </time>
          </div>
          <CollapsibleTrigger asChild>
            <button className="reply-link">
              <MessageSquare size={14} />
              <span>
                {q.comments} {q.comments === 1 ? "reply" : "replies"}
              </span>
              <span className="discussion-toggle">
                {expanded ? "Collapse discussion" : "Expand discussion"}
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </span>
            </button>
          </CollapsibleTrigger>
        </div>
      </article>
      <CollapsibleContent className="inline-discussion">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ThemeCard({
  label,
  tone,
  items,
  children,
  busy,
}: {
  label: string;
  tone: string;
  items: Question[];
  children: ReactNode;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className={`theme-tile tone-${tone}`}
    >
      <h2>
        <CollapsibleTrigger
          className="theme-heading-toggle"
          disabled={busy}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
        >
          <span>{label}</span>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </CollapsibleTrigger>
      </h2>
      {!expanded ? (
        <ul className="theme-summary">
          {items.map((q) => (
            <li key={q.id}>{q.body}</li>
          ))}
        </ul>
      ) : null}
      <CollapsibleContent className="theme-questions">
        {children}
        <CollapsibleTrigger className="collapse-bottom" disabled={busy}>
          <ChevronUp size={15} />
          Collapse theme
        </CollapsibleTrigger>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Home() {
  const [tab, setTab] = useState("questions"),
    [sort, setSort] = useState("newest"),
    [onlyMine, setOnlyMine] = useState(false),
    [canCluster, setCanCluster] = useState(false),
    [clusterBusy, setClusterBusy] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null),
    [profileOpen, setProfileOpen] = useState(false),
    [profileName, setProfileName] = useState(""),
    [profileMinistry, setProfileMinistry] = useState(""),
    [profileBusy, setProfileBusy] = useState(false),
    [profileError, setProfileError] = useState("");
  const [board, setBoard] = useState<Board | null>(null),
    [loadError, setLoadError] = useState("");
  const [question, setQuestion] = useState(""),
    [anonymous, setAnonymous] = useState(false),
    [posting, setPosting] = useState(false),
    [postError, setPostError] = useState("");
  const [selected, setSelected] = useState<string | null>(null),
    [comments, setComments] = useState<Comment[]>([]),
    [commentsLoading, setCommentsLoading] = useState(false),
    [commentsError, setCommentsError] = useState("");
  const [reply, setReply] = useState(""),
    [replyAnonymous, setReplyAnonymous] = useState(false),
    [replyBusy, setReplyBusy] = useState(false),
    [replyError, setReplyError] = useState("");
  const [voting, setVoting] = useState<string[]>([]);
  const [hasViewedThemes, setHasViewedThemes] = useState(false);
  const changeTab = (value: string) => {
    setTab(value);
    if (value === "themes") setHasViewedThemes(true);
  };
  const postId = useRef<string | null>(null),
    replyId = useRef<string | null>(null),
    replyFor = useRef<string | null>(null),
    selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const refresh = useCallback(async () => {
    try {
      setBoard(await api<Board>("/api/questions"));
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  async function regenerateThemes() {
    setClusterBusy(true);
    try {
      const result = await api<{ status: string }>("/api/cluster", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
      });
      toast.success(
        result.status === "empty"
          ? "There are no posts to group yet."
          : result.status === "running"
            ? "Themes are already being regenerated."
            : "Theme generation started. You can keep using the board.",
      );
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
      await refresh();
    } finally {
      setClusterBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    try {
      const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (
        p &&
        typeof p.name === "string" &&
        typeof p.ministry === "string" &&
        p.name.trim() &&
        p.ministry.trim()
      ) {
        setProfile(p);
        setProfileName(p.name);
        setProfileMinistry(p.ministry);
        void api<{ canCluster: boolean }>("/api/session", {
          method: "POST",
          body: JSON.stringify(p),
        })
          .then((v) => {
            if (alive) setCanCluster(v.canCluster);
          })
          .catch(() => {
            if (alive) setProfileOpen(true);
          });
      } else setProfileOpen(true);
    } catch {
      setProfileOpen(true);
    }
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 12000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const openQuestion = useCallback((id: string) => {
    if (replyFor.current !== id) {
      setReply("");
      setReplyError("");
      replyId.current = null;
      replyFor.current = id;
    }
    setSelected(id);
  }, []);
  const refreshComments = useCallback(async (id: string, initial = false) => {
    if (initial) {
      setCommentsLoading(true);
      setComments([]);
    }
    try {
      const d = await api<{ comments: Comment[] }>(
        `/api/questions/${id}/comments`,
      );
      if (selectedRef.current === id) {
        setComments(d.comments);
        setCommentsError("");
      }
    } catch (e) {
      if (selectedRef.current === id) setCommentsError((e as Error).message);
    } finally {
      if (selectedRef.current === id) setCommentsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!selected) return;
    void refreshComments(selected, true);
    const timer = setInterval(() => void refreshComments(selected), 12000);
    return () => clearInterval(timer);
  }, [selected, refreshComments]);
  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    try {
      const p = { name: profileName.trim(), ministry: profileMinistry.trim() };
      if (!p.name || !p.ministry)
        throw new Error("Please enter your name and organisation or team.");
      const session = await api<{ canCluster: boolean }>("/api/session", {
        method: "POST",
        body: JSON.stringify({
          ...p,
          ...(adminPassword ? { adminPassword } : {}),
        }),
      });
      setAdminPassword("");
      setCanCluster(session.canCluster);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      setProfile(p);
      setProfileOpen(false);
      toast.success("You’re ready to join the conversation.");
    } catch (e) {
      setProfileError((e as Error).message);
    } finally {
      setProfileBusy(false);
    }
  }
  async function postQuestion(e: FormEvent) {
    e.preventDefault();
    if (!profile) {
      setProfileOpen(true);
      return;
    }
    setPosting(true);
    setPostError("");
    postId.current ??= crypto.randomUUID();
    try {
      await api("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          id: postId.current,
          body: question,
          anonymous,
          ...(!anonymous ? profile : {}),
        }),
      });
      setQuestion("");
      postId.current = null;
      setTab("questions");
      toast.success("Question posted.");
      await refresh();
    } catch (e) {
      setPostError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }
  async function postReply(e: FormEvent) {
    e.preventDefault();
    if (!profile) {
      setProfileOpen(true);
      return;
    }
    if (!selected) return;
    const id = selected;
    setReplyBusy(true);
    setReplyError("");
    replyId.current ??= crypto.randomUUID();
    try {
      await api(`/api/questions/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          id: replyId.current,
          body: reply,
          anonymous: replyAnonymous,
          ...(!replyAnonymous ? profile : {}),
        }),
      });
      setReply("");
      replyId.current = null;
      toast.success("Reply posted.");
      await Promise.all([refreshComments(id), refresh()]);
    } catch (e) {
      setReplyError((e as Error).message);
    } finally {
      setReplyBusy(false);
    }
  }
  async function vote(q: Question) {
    if (!profile) {
      setProfileOpen(true);
      return;
    }
    if (voting.includes(q.id)) return;
    setVoting((v) => [...v, q.id]);
    try {
      await api(`/api/questions/${q.id}/vote`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVoting((v) => v.filter((id) => id !== q.id));
    }
  }
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "list_questions",
        description:
          "Read questions, votes, reply counts, and current themes on this board.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => api<Board>("/api/questions"),
      },
      {
        name: "open_question",
        description:
          "Open an existing question and its discussion without posting anything.",
        inputSchema: {
          type: "object",
          properties: { question_id: { type: "string" } },
          required: ["question_id"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input: unknown) => {
          const id = (input as { question_id?: unknown })?.question_id;
          if (typeof id !== "string")
            throw new Error("question_id is required");
          const b = await api<Board>("/api/questions");
          if (!b.questions.some((q) => q.id === id))
            throw new Error("Question not found");
          openQuestion(id);
          return { opened: id };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, [openQuestion]);
  const questions = board?.questions ?? [],
    ordered =
      sort === "newest"
        ? [...questions].sort((a, b) => b.created_at - a.created_at)
        : questions;
  const visibleQuestions = onlyMine ? ordered.filter((q) => q.own) : ordered;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const themes = board?.clustering.snapshot ?? [];
  const grouped = new Set(themes.flatMap((t) => t.question_ids));
  const pending = ordered.filter((q) => !grouped.has(q.id));
  const toggleQuestion = (id: string) => {
    if (replyBusy) return;
    if (selected === id) setSelected(null);
    else openQuestion(id);
  };
  const discussion = (
    <>
      <div className="replies-area">
        <h3>Discussion</h3>
        {["queued", "searching"].includes(
          questions.find((q) => q.id === selected)?.agent_status || "",
        ) ? (
          <p className="agent-working">
            <Sparkles size={14} />
            {boardConfig.assistant.name} is looking for public resources…
          </p>
        ) : null}
        {commentsError ? (
          <p className="form-error" role="alert">
            {commentsError}
          </p>
        ) : commentsLoading ? (
          <Skeleton className="h-20" />
        ) : comments.length ? (
          comments.map((c) => (
            <article key={c.id} className="comment">
              <div className="comment-meta">
                <Author item={c} />
                <time>{ago(c.created_at)}</time>
              </div>
              <ReplyBody comment={c} />
            </article>
          ))
        ) : (
          <p className="no-replies">
            Add a follow-up, a perspective, or a little more context.
          </p>
        )}
      </div>
      <form className="reply-composer" onSubmit={postReply}>
        <label className="field-label" htmlFor="reply">
          Add to the discussion
        </label>
        <textarea
          id="reply"
          placeholder="Share your follow-up…"
          maxLength={2000}
          minLength={3}
          required
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            replyId.current = null;
          }}
          disabled={replyBusy}
        />
        <div className="reply-controls">
          <label className="check-label">
            <Checkbox
              checked={replyAnonymous}
              onCheckedChange={(v) => setReplyAnonymous(v === true)}
              disabled={replyBusy}
            />
            Reply anonymously
          </label>
          <button
            className="primary"
            disabled={replyBusy || reply.trim().length < 3}
          >
            {replyBusy ? "Posting…" : "Post reply"}
          </button>
        </div>
        {replyError ? (
          <p className="form-error" role="alert">
            {replyError}
          </p>
        ) : null}
      </form>
      <button
        className="collapse-bottom"
        onClick={() => setSelected(null)}
        disabled={replyBusy}
      >
        <ChevronUp size={15} />
        Collapse discussion
      </button>
    </>
  );
  const cards = (items: Question[]) =>
    items.map((q) => (
      <QuestionCard
        key={q.id}
        q={q}
        onOpen={toggleQuestion}
        onVote={vote}
        busy={voting.includes(q.id)}
        expanded={selected === q.id}
      >
        {selected === q.id ? discussion : null}
      </QuestionCard>
    ));
  return (
    <div className="site-shell">
      <Toaster position="bottom-center" />
      <header className="masthead">
        <a className="wordmark" href="/">
          {boardConfig.title}
        </a>
        <button className="profile-button" onClick={() => setProfileOpen(true)}>
          <CircleUserRound size={20} />
          <span>{profile?.name || "Your profile"}</span>
        </button>
      </header>
      <main className="workspace">
        <h1 className="sr-only">{boardConfig.title}</h1>
        <div className="composer-bar">
          <form className="composer" onSubmit={postQuestion}>
            <div className="composer-title">
              <h2>Start a discussion</h2>
            </div>
            <div className="composer-entry">
              <label htmlFor="question" className="sr-only">
                Your question, request, or issue
              </label>
              <textarea
                id="question"
                placeholder="What would you like to share?"
                rows={1}
                maxLength={2000}
                minLength={3}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  postId.current = null;
                }}
                required
                disabled={posting}
              />
              <button
                className="primary"
                disabled={posting || (!!profile && question.trim().length < 3)}
              >
                {posting ? "Posting…" : profile ? "Post" : "Join"}
              </button>
            </div>
            <div className="composer-options">
              <label className="check-label">
                <Checkbox
                  checked={anonymous}
                  onCheckedChange={(v) => setAnonymous(v === true)}
                  disabled={posting}
                />
                Post anonymously
              </label>
              <span>{question.length}/2000</span>
            </div>
            {postError ? (
              <p className="form-error" role="alert">
                {postError}
              </p>
            ) : null}
          </form>
        </div>
        <PullToRefresh
          onRefresh={async () => {
            await Promise.all([
              refresh(),
              ...(selectedRef.current
                ? [refreshComments(selectedRef.current)]
                : []),
            ]);
          }}
        >
          <div className="board-layout">
            <section>
              <Tabs value={tab} onValueChange={changeTab}>
                <div className="tab-row">
                  <TabsList variant="line" className="board-tabs">
                    <TabsTrigger value="questions">
                      <MessageSquare />
                      All questions{" "}
                      <span className="count">{questions.length}</span>
                    </TabsTrigger>
                    <ThemeDiscovery
                      visited={hasViewedThemes}
                      blocked={profileOpen || !board || posting || replyBusy}
                      onView={() => changeTab("themes")}
                    />
                  </TabsList>
                </div>
                {loadError ? (
                  <div role="alert" className="error-box">
                    {loadError}
                    <button onClick={() => void refresh()}>
                      <RefreshCw size={14} />
                      Retry
                    </button>
                  </div>
                ) : null}
                <TabsContent value="questions">
                  <div className="list-toolbar">
                    <span className="list-label">THE DISCUSSION</span>
                    <div className="list-controls">
                      <button
                        className={`my-questions-filter ${onlyMine ? "active" : ""}`}
                        aria-pressed={onlyMine}
                        onClick={() => setOnlyMine((v) => !v)}
                      >
                        <CircleUserRound size={15} />
                        My questions
                      </button>
                      <ToggleGroup
                        type="single"
                        value={sort}
                        onValueChange={(value) => {
                          if (value) setSort(value);
                        }}
                        className="sort-toggle"
                        aria-label="Sort questions"
                      >
                        <ToggleGroupItem value="popular">
                          Most upvoted
                        </ToggleGroupItem>
                        <ToggleGroupItem value="newest">
                          Recent first
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                  {!board && !loadError ? (
                    <>
                      <Skeleton className="h-28 mb-4 rounded-xl" />
                      <Skeleton className="h-28 rounded-xl" />
                    </>
                  ) : visibleQuestions.length ? (
                    cards(visibleQuestions)
                  ) : onlyMine && board ? (
                    <div className="empty-state">
                      <MessageSquare size={30} strokeWidth={1.3} />
                      <h2>No questions from you yet</h2>
                      <p>
                        Your posts from this browser will appear here, including
                        anonymous posts.
                      </p>
                      <button
                        className="show-all-questions"
                        onClick={() => setOnlyMine(false)}
                      >
                        Show all questions
                      </button>
                    </div>
                  ) : !loadError ? (
                    <div className="empty-state">
                      <MessageSquare size={30} strokeWidth={1.3} />
                      <h2>What’s on your mind?</h2>
                      <p>
                        Be the first to ask a question.
                        <br />
                        Big ideas and practical questions are equally welcome.
                      </p>
                    </div>
                  ) : null}
                </TabsContent>
                <TabsContent value="themes">
                  <div className="theme-note">
                    <Sparkles size={18} />
                    <div>
                      <p>
                        {board?.clustering.status === "running"
                          ? "Generating and clustering with AI…"
                          : themes.length
                            ? `Generated and clustered by AI${board?.clustering.duration_ms != null ? ` in ${(board.clustering.duration_ms / 1000).toFixed(1)} seconds` : ""}`
                            : "Themes will be generated and clustered by AI."}
                      </p>
                      <small>
                        {board?.clustering.status === "running"
                          ? `Attempt ${Math.max(1, board.clustering.attempts ?? 1)} of 3 · Temporary failures retry automatically`
                          : themes.length &&
                              board?.clustering.duration_ms == null
                            ? "Timing will appear after the next regeneration."
                            : board?.clustering.updated_at
                              ? `Updated ${ago(board.clustering.updated_at)}`
                              : "Themes are refreshed by the organiser."}
                      </small>
                    </div>
                    {canCluster ? (
                      <button
                        className="regenerate-button"
                        onClick={() => void regenerateThemes()}
                        disabled={
                          clusterBusy || board?.clustering.status === "running"
                        }
                      >
                        <RefreshCw
                          size={15}
                          className={clusterBusy ? "spin" : ""}
                        />
                        {clusterBusy || board?.clustering.status === "running"
                          ? "Regenerating…"
                          : "Regenerate themes"}
                      </button>
                    ) : null}
                  </div>
                  {board?.clustering.error ? (
                    <p role="status" className="error-box">
                      {board.clustering.error}
                    </p>
                  ) : null}
                  <div className="theme-grid">
                    {[
                      ...themes,
                      ...(pending.length
                        ? [
                            {
                              label: "Awaiting a theme",
                              question_ids: pending.map((q) => q.id),
                            },
                          ]
                        : []),
                    ].map((theme, i) => {
                      const items = theme.question_ids
                        .map((id) => byId.get(id))
                        .filter((q): q is Question => !!q);
                      const waiting = theme.label === "Awaiting a theme";
                      return items.length ? (
                        <ThemeCard
                          key={theme.label}
                          label={theme.label}
                          tone={waiting ? "pending" : String(i % 5)}
                          items={items}
                          busy={replyBusy}
                        >
                          {cards(items)}
                        </ThemeCard>
                      ) : null;
                    })}
                  </div>
                  {!questions.length ? (
                    <div className="empty-state">
                      <Layers3 size={30} />
                      <h2>Themes will emerge here</h2>
                      <p>
                        As questions arrive, related ideas will come together.
                      </p>
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </section>
          </div>
          <footer>
            <span>{boardConfig.title}</span>
          </footer>
        </PullToRefresh>
      </main>
      <Dialog
        open={profileOpen}
        onOpenChange={(open) => {
          if (profile) setProfileOpen(open);
        }}
      >
        <DialogContent
          className="identity-dialog"
          showCloseButton={!!profile}
          onInteractOutside={(e) => {
            if (!profile) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (!profile) e.preventDefault();
          }}
        >
          <p className="eyebrow">{boardConfig.title}</p>
          <DialogTitle className="identity-title">
            {profile ? "Your profile" : "Join the conversation"}
          </DialogTitle>
          <DialogDescription className="identity-description">
            Add your name and organisation once. We’ll remember them in this
            browser for your next visit.
          </DialogDescription>
          <form onSubmit={saveProfile}>
            <label className="field-label" htmlFor="participant-name">
              Your name
            </label>
            <input
              id="participant-name"
              autoComplete="name"
              maxLength={100}
              placeholder="e.g. Alex"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
            />
            <label className="field-label" htmlFor="participant-ministry">
              {boardConfig.organisationLabel}
            </label>
            <input
              id="participant-ministry"
              autoComplete="organization"
              maxLength={120}
              placeholder={boardConfig.organisationPlaceholder}
              value={profileMinistry}
              onChange={(e) => setProfileMinistry(e.target.value)}
              required
            />
            <details>
              <summary>Organiser access</summary>
              <label className="field-label" htmlFor="admin-password">
                Organiser code
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Only needed to regenerate themes"
              />
            </details>
            {profileError ? (
              <p className="form-error" role="alert">
                {profileError}
              </p>
            ) : null}
            <button className="primary wide" disabled={profileBusy}>
              {profileBusy
                ? "Saving…"
                : profile
                  ? "Save profile"
                  : "Enter the discussion"}
            </button>
          </form>
          <p className="identity-foot">
            <EyeOff size={15} />
            You can ask and reply anonymously at any time.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
