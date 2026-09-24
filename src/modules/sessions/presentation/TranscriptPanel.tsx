import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownView } from "markdown-render/react";

import {
  EmptyState,
  StatusBadge,
  AITrackerButton,
} from "../../../components/aitracker.tsx";
import { BrandIcon } from "../../../components/BrandIcon.tsx";
import { useI18n } from "../../../lib/i18n/context.tsx";
import { sourceLabel } from "../../../lib/local-usage/presentation.ts";
import { useTheme } from "../../../lib/theme.tsx";
import type { SessionSummary, SessionTranscriptMessage } from "../contracts.ts";
import { getSessionTranscript } from "../query.ts";
import { ResumeSessionButton } from "./ResumeSessionButton.tsx";
import { SessionIdCopyButton } from "./SessionIdCopyButton.tsx";

/**
 * Session detail panel (Story S-300): sticky header, CLI/client resume card,
 * and the full local conversation.
 *
 * PRIVACY BOUNDARY — in-memory only, never persisted or uploaded: the
 * transcript is fetched through the server fn, which reads the user's own
 * local logs into memory for this page render. Nothing here writes to any
 * store and nothing leaves the machine.
 */
export function TranscriptPanel({ session }: { session: SessionSummary }) {
  const { t, format } = useI18n();

  const [transcript, setTranscript] = useState<SessionTranscriptMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const load = useCallback(() => {
    setStatus("loading");
    void getSessionTranscript({
      data: { source: session.source, sessionId: session.sessionId },
    })
      .then((result) => {
        setTranscript([...result.messages]);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [session.source, session.sessionId]);

  useEffect(load, [load]);

  const total = transcript.length;

  const messageCount = status === "ready" ? total : session.turns;

  return (
    <div className="min-w-0 flex-1">
      <div className="sticky top-14 z-30 border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Link
            to="/chats"
            aria-label={t("sessions.detail.back")}
            className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="aitracker-text-page-title truncate font-semibold tracking-tight">
              {session.title || t("sessions.row.untitled")}
            </h1>
            <div className="aitracker-num mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <StatusBadge tone="primary">
                {sourceLabel(session.source)}
              </StatusBadge>
              <span>{format.formatDateTime(session.startedAt, false)}</span>
              <span aria-hidden="true">·</span>
              <span>{session.projectKey}</span>
              <span aria-hidden="true">·</span>
              <span>
                {t("sessions.transcript.messageCount", {
                  count: format.formatNumber(messageCount),
                })}
              </span>
              {session.model ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{session.model}</span>
                </>
              ) : null}
            </div>
          </div>
          {session.resumeAvailable ? (
            <ResumeSessionButton session={session} />
          ) : null}
        </div>
      </div>

      {session.resumeAvailable ? (
        <div className="mx-auto mt-4 mb-4 max-w-3xl rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <BrandIcon
              name={sourceLabel(session.source)}
              className="size-3.5 shrink-0 text-primary"
            />
            <span className="text-foreground">
              {t("sessions.transcript.cliResumable")}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t("sessions.transcript.cliHint")}</span>
          </div>
          <dl className="aitracker-num grid gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="shrink-0">{t("sessions.transcript.sessionId")}</dt>
              <dd className="truncate text-foreground">{session.sessionId}</dd>
              <SessionIdCopyButton sessionId={session.sessionId} />
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("sessions.row.resumeDirHint")}
          </p>
        </div>
      ) : (
        <div className="mx-auto mt-4 mb-4 max-w-3xl rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <BrandIcon
              name={sourceLabel(session.source)}
              className="size-3.5 shrink-0"
            />
            <span className="text-foreground">
              {t("sessions.transcript.clientSession")}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t("sessions.transcript.clientHint", {
                source: sourceLabel(session.source),
              })}
            </span>
          </div>
          <dl className="aitracker-num grid gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="shrink-0">{t("sessions.transcript.sessionId")}</dt>
              <dd className="truncate text-foreground">{session.sessionId}</dd>
              <SessionIdCopyButton sessionId={session.sessionId} />
            </div>
          </dl>
        </div>
      )}

      <div className="mx-auto max-w-3xl pb-24">
        {status === "loading" ? (
          <EmptyState
            icon={<Loader2 className="size-6 animate-spin" />}
            title={t("sessions.transcript.loading")}
          />
        ) : null}
        {status === "error" ? (
          <EmptyState
            title={t("sessions.transcript.error")}
            actions={
              <AITrackerButton onClick={load}>
                {t("sessions.transcript.retry")}
              </AITrackerButton>
            }
          />
        ) : null}
        {status === "ready" && total === 0 ? (
          <EmptyState title={t("sessions.transcript.empty")} />
        ) : null}
        {status === "ready" && total > 0 ? (
          <>
            <div className="space-y-5">
              {transcript.map((message) => (
                <Bubble
                  key={`${message.role}-${message.ts ?? ""}-${message.text.slice(0, 24)}-${message.tools?.length ?? 0}`}
                  message={message}
                  source={session.source}
                />
              ))}
            </div>
            <p className="mt-6 text-center text-[10px] tracking-wide text-muted-foreground">
              {t("sessions.transcript.localOnly")}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Bubble({
  message,
  source,
}: {
  message: SessionTranscriptMessage;
  source: SessionSummary["source"];
}) {
  const { t, format } = useI18n();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const time = message.ts;

  if (message.role === "user") {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-primary/35 bg-primary/12 px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
          {message.text}
        </div>
        <div className="aitracker-num flex items-center gap-1.5 pr-1 text-[10px] text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
          {time ? <span>{format.formatTime(time)}</span> : null}
        </div>
      </div>
    );
  }

  const hasBody = message.text.trim() !== "";
  return (
    <div className="group flex flex-col items-start gap-1">
      <div className="flex w-full items-start gap-2.5">
        <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
          <BrandIcon name={source} className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0 max-w-[calc(100%-2.5rem)] flex-1 space-y-2">
          {message.tools && message.tools.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
              <button
                type="button"
                onClick={() => setToolsOpen((current) => !current)}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <ChevronRight
                  className={`size-3 transition-transform ${toolsOpen ? "rotate-90" : ""}`}
                />
                <Wrench className="size-3" />
                {t("sessions.transcript.toolCalls", {
                  count: message.tools.length,
                })}
                {message.tools.some((tool) => tool.status === "error") ? (
                  <span className="rounded bg-destructive/15 px-1 text-[10px] text-destructive">
                    error
                  </span>
                ) : null}
              </button>
              {toolsOpen ? (
                <ul className="border-t border-border">
                  {message.tools.map((tool, toolIndex) => (
                    <li
                      key={toolIndex}
                      className="border-b border-border/60 px-3 py-1.5 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-2 text-[11px]">
                        <span className="shrink-0 font-mono text-foreground">
                          {tool.name}
                        </span>
                        {tool.status != null && tool.status !== "completed" ? (
                          <span
                            className={`shrink-0 rounded px-1 text-[10px] ${
                              tool.status === "error"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {tool.status}
                          </span>
                        ) : null}
                        {tool.summary ? (
                          <span className="truncate text-muted-foreground">
                            {tool.summary}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {hasBody ? (
            <div className="rounded-2xl rounded-tl-md border border-border bg-surface-2 px-4 py-3 shadow-sm">
              {message.thinking ? (
                <div className="mb-2 border-b border-border pb-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen((current) => !current);
                    }}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronRight
                      className={`size-3 transition-transform ${open ? "rotate-90" : ""}`}
                    />
                    {t("sessions.transcript.thinking")}
                  </button>
                  {open ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground italic whitespace-pre-wrap">
                      {message.thinking}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <MarkdownTranscriptBody text={message.text} />
            </div>
          ) : null}
        </div>
      </div>
      {time ? (
        <div className="aitracker-num pl-9 text-[10px] text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
          {format.formatTime(time)}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Render assistant Markdown through the `markdown-render` chat pipeline
 * (GFM, soft breaks, math, highlighting; raw HTML stays disabled for
 * conversation content). Colors are bridged to the app theme via CSS
 * variables; Mermaid follows the resolved light/dark theme.
 */
export function MarkdownTranscriptBody({ text }: { text: string }) {
  const { theme } = useTheme();
  const [prefersLight, setPrefersLight] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    setPrefersLight(query.matches);
    const onChange = (event: MediaQueryListEvent): void =>
      setPrefersLight(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  const mermaidTheme = useMemo(
    () =>
      theme === "light" || (theme === "system" && prefersLight)
        ? "default"
        : "dark",
    [theme, prefersLight],
  );
  return (
    <div className="aitracker-md text-foreground [&>div>:first-child]:mt-0 [&>div>:last-child]:mb-0">
      <MarkdownView
        content={text}
        preset="chat"
        mermaidTheme={mermaidTheme}
        className="aitracker-md-vars"
      />
    </div>
  );
}
