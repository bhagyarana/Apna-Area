/**
 * Feature: Survival Kit "Phrases You Spoke" Replay & Copy Card (web/src/kit/PhrasebookCard.tsx)
 * Purpose: Groups spoken and starter Kannada phrases into hairline-divided lists with 40x40px cached WAV replay and inline 2s "Copied" feedback.
 * Inputs: SurvivalPhrase list, starterPhraseIds, player LanguageComfort, and mobile visibility flag.
 * Outputs: Clean, un-boxed phrasebook column with section dividers and on-demand WAV audio replay.
 * Deliberately excludes: Blocking modals for clipboard copy or repetitive per-card eyebrows.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, PlayIcon, StopIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import {
  fetchWithRetry,
  logger,
  TIMEOUTS_MS,
  TtsPayloadSchema,
  type ApiResult,
  type LanguageComfort,
  type SurvivalPhrase,
  type TtsPayload,
} from "@apna-area/shared";

export interface PhrasebookCardProps {
  phrases: readonly SurvivalPhrase[];
  starterPhraseIds: readonly string[];
  languageComfort: LanguageComfort;
  mobileHidden?: boolean;
}

const clientWavCache = new Map<string, string>();

/**
 * Renders the "Phrases you spoke" card with grouped hairline rows, 24 kHz WAV replay, and inline Copy confirmation.
 *
 * @param props - Phrases list, starter IDs, comfort language, and mobile tab visibility.
 * @returns Accessible Phrasebook column card.
 */
export function PhrasebookCard({
  phrases,
  starterPhraseIds,
  languageComfort,
  mobileHidden = false,
}: PhrasebookCardProps): JSX.Element {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [ttsHint, setTtsHint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const stopCurrentAudio = useCallback(() => {
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, [stopCurrentAudio]);

  const handlePlayPhrase = useCallback(
    async (phrase: SurvivalPhrase) => {
      setTtsHint(null);
      if (playingId === phrase.id) {
        stopCurrentAudio();
        return;
      }
      stopCurrentAudio();

      let wavBase64 = clientWavCache.get(phrase.id);
      if (!wavBase64) {
        const controller = new AbortController();
        fetchAbortRef.current = controller;
        setLoadingId(phrase.id);
        try {
          const res = await fetchWithRetry("/api/tts", {
            method: "POST",
            timeoutMs: TIMEOUTS_MS.ttsClip + 2_000,
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phraseId: phrase.id }),
          });
          if (controller.signal.aborted) return;
          const body = (await res.json()) as ApiResult<TtsPayload>;
          if (!res.ok || !body.ok) {
            setTtsHint(
              !body.ok
                ? body.error.message
                : "Audio replay is unavailable right now, so use the Roman pronunciation line.",
            );
            setLoadingId(null);
            return;
          }
          const parsed = TtsPayloadSchema.parse(body.data);
          wavBase64 = parsed.audioWavBase64;
          clientWavCache.set(phrase.id, wavBase64);
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          logger.warn("kit.tts_fetch_failed", {
            meta: { phraseId: phrase.id, error: err instanceof Error ? err.message : String(err) },
          });
          setTtsHint("Could not reach the audio service right now, so check your connection and retry.");
          setLoadingId(null);
          return;
        }
        if (controller.signal.aborted) return;
        setLoadingId(null);
      }

      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      audioRef.current = audio;
      setPlayingId(phrase.id);
      audio.onended = () => setPlayingId((curr) => (curr === phrase.id ? null : curr));
      audio.onerror = () => setPlayingId((curr) => (curr === phrase.id ? null : curr));
      try {
        await audio.play();
      } catch (err: unknown) {
        logger.warn("kit.tts_playback_failed", {
          meta: { phraseId: phrase.id, error: err instanceof Error ? err.message : String(err) },
        });
        setPlayingId(null);
      }
    },
    [playingId, stopCurrentAudio],
  );

  const handleCopyPhrases = useCallback(async () => {
    const formatted = phrases
      .map((p) => `${p.kannada} · ${p.transliteration} · ${p.english}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      const area = document.createElement("textarea");
      area.value = formatted;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [phrases]);

  const spokenList = phrases.filter((p) => !starterPhraseIds.includes(p.id));
  const starterList = phrases.filter((p) => starterPhraseIds.includes(p.id));

  const renderPhraseRow = (phrase: SurvivalPhrase): JSX.Element => {
    const isPlaying = playingId === phrase.id;
    const isLoading = loadingId === phrase.id;
    const meaning =
      languageComfort === "hi" ? `${phrase.hindi} · ${phrase.english}` : phrase.english;

    return (
      <div key={phrase.id} className="kit-phrase-row" data-testid={`kit-phrase-${phrase.id}`}>
        <div className="kit-phrase-copy">
          <p className="kit-phrase-kn">{phrase.kannada}</p>
          <p className="kit-phrase-rom">{phrase.transliteration}</p>
          <p className="kit-phrase-meaning">{meaning}</p>
        </div>
        <button
          type="button"
          className={isPlaying ? "kit-tts-btn kit-tts-btn-active" : "kit-tts-btn"}
          disabled={isLoading}
          onClick={() => void handlePlayPhrase(phrase)}
          aria-label={
            isPlaying
              ? `Stop pronunciation for ${phrase.transliteration}`
              : `Play pronunciation for ${phrase.transliteration}`
          }
          data-testid={`play-phrase-btn-${phrase.id}`}
        >
          {isLoading ? (
            <span className="kit-tts-spinner" aria-hidden="true" />
          ) : (
            <HugeiconsIcon icon={isPlaying ? StopIcon : PlayIcon} size={15} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  };

  return (
    <section
      className={mobileHidden ? "kit-card kit-col-mobile-hidden" : "kit-card"}
      aria-labelledby="kit-phrasebook-heading"
      data-testid="kit-phrasebook-card"
    >
      <div className="kit-card-header">
        <div>
          <h2 id="kit-phrasebook-heading" className="kit-card-title">
            Phrases you spoke
          </h2>
          <p className="kit-card-sub">Tap play for polite Kannada pronunciation</p>
        </div>
        <span className="kit-card-meta">
          {spokenList.length > 0 ? `${spokenList.length} spoken` : "Starter set"}
        </span>
      </div>

      {ttsHint && (
        <p className="kit-inline-notice" role="status" data-testid="kit-tts-notice">
          {ttsHint}
        </p>
      )}

      <div className="kit-divider-list">
        {spokenList.length > 0 && (
          <div className="kit-group-block">
            <span className="kit-group-label kit-group-label-teal">
              Practised out loud · {spokenList.length}
            </span>
            {spokenList.map(renderPhraseRow)}
          </div>
        )}
        {starterList.length > 0 && (
          <div className="kit-group-block">
            <span className="kit-group-label">Starter phrases · {starterList.length}</span>
            {starterList.map(renderPhraseRow)}
          </div>
        )}
      </div>

      <button
        type="button"
        className={copied ? "kit-copy-btn kit-copy-btn-copied" : "kit-copy-btn"}
        onClick={() => void handleCopyPhrases()}
        data-testid="copy-phrases-btn"
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={15} aria-hidden="true" />
        <span>{copied ? "Copied" : "Copy phrases"}</span>
      </button>
    </section>
  );
}
