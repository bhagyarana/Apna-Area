/**
 * Feature: POST /api/kit Route & Commute Pre-Warmer (server/src/routes/kit.ts)
 * Purpose: Serves real Monday 09:00 & 18:30 IST commute matrices, Flash-Lite area summaries, spoken/starter phrases, and budget checklists.
 * Inputs: Validated KitRequest JSON body, verified world places, and server API keys.
 * Outputs: Typed ApiResult<KitPayload> envelope + background pre-warm hooks.
 * Deliberately excludes: Unverified place IDs or model-invented commute minutes.
 */
import type { FastifyInstance } from "fastify";
import {
  buildFirstWeekChecklist,
  createApiError,
  createApiSuccess,
  createLogger,
  KitPayloadSchema,
  KitRequestSchema,
  SAFETY_LIMITS,
  type RecommendedNeighbourhood,
  type SurvivalPhrase,
} from "@apna-area/shared";
import type { LoadedWorldData } from "./places.js";
import { registerTtsRoute } from "./tts.js";
import { loadSurvivalPhrases } from "../live/phrases.js";
import {
  computeOfficeCommutes,
  createCommuteCache,
  createGoogleRouteMatrixFetcher,
  type CommuteCache,
  type RouteMatrixFetcher,
} from "../kit/commute.js";
import {
  createGenAiKitSummaryRunner,
  createSummaryCache,
  populateNeighbourhoodSummaries,
  type KitSummaryRunner,
  type SummaryCache,
} from "../kit/summary.js";
import type { PhraseTtsCache, TtsModelRunner } from "../kit/tts.js";

const DEFAULT_STARTER_SITUATIONS = [
  "greeting",
  "auto_meter",
  "darshini_order",
  "directions",
] as const;

function selectKitPhrases(
  allPhrases: readonly SurvivalPhrase[],
  learnedIds: readonly string[],
): { phrases: SurvivalPhrase[]; starterPhraseIds: string[] } {
  const byId = new Map(allPhrases.map((p) => [p.id, p]));
  const spoken: SurvivalPhrase[] = [];
  for (const id of learnedIds) {
    const match = byId.get(id);
    if (match && !spoken.some((p) => p.id === match.id)) spoken.push(match);
  }

  const starterPhraseIds: string[] = [];
  if (spoken.length < 4) {
    for (const sit of DEFAULT_STARTER_SITUATIONS) {
      if (spoken.length + starterPhraseIds.length >= 4) break;
      const candidate = allPhrases.find(
        (p) =>
          p.situation === sit &&
          p.honorificGender === "neutral" &&
          !spoken.some((s) => s.id === p.id) &&
          !starterPhraseIds.includes(p.id),
      );
      if (candidate) starterPhraseIds.push(candidate.id);
    }
  }

  const starters = starterPhraseIds
    .map((id) => byId.get(id))
    .filter((p): p is SurvivalPhrase => Boolean(p));

  return { phrases: [...spoken, ...starters], starterPhraseIds };
}

export interface RegisterKitRouteOptions {
  worldData: LoadedWorldData;
  geminiApiKey?: string;
  mapsServerKey?: string;
  mapsBrowserKey?: string;
  routeMatrixFetcher?: RouteMatrixFetcher;
  summaryRunner?: KitSummaryRunner;
  ttsRunner?: TtsModelRunner;
  commuteCache?: CommuteCache;
  summaryCache?: SummaryCache;
  ttsCache?: PhraseTtsCache;
  log?: ReturnType<typeof createLogger>;
}

export interface KitPrewarmHooks {
  prewarmOfficeCommutes: (
    officePlaceId: string,
    recommended?: readonly RecommendedNeighbourhood[],
    requestId?: string,
  ) => void;
  prewarmPhraseAudio: (phraseId: string, requestId?: string) => void;
}

/**
 * Registers POST /api/kit (and delegates POST /api/tts) on Fastify, returning non-blocking pre-warm hooks.
 *
 * @param app - Fastify server instance.
 * @param opts - World dataset, server keys, optional test runners/caches, and logger.
 * @returns KitPrewarmHooks for asynchronous background warming.
 */
export async function registerKitRoutes(
  app: FastifyInstance,
  opts: RegisterKitRouteOptions,
): Promise<KitPrewarmHooks> {
  const phrasesDataset = loadSurvivalPhrases();
  const commuteCache = opts.commuteCache ?? createCommuteCache();
  const summaryCache = opts.summaryCache ?? createSummaryCache();
  const mapsKey = opts.mapsServerKey || opts.mapsBrowserKey || "";
  const routeFetcher: RouteMatrixFetcher | null =
    opts.routeMatrixFetcher ?? (mapsKey.length > 0 ? createGoogleRouteMatrixFetcher(mapsKey) : null);

  const summaryRunner: KitSummaryRunner | null =
    opts.summaryRunner ??
    (opts.geminiApiKey && opts.geminiApiKey.length > 0
      ? createGenAiKitSummaryRunner(opts.geminiApiKey)
      : null);

  const prewarmPhraseAudio = await registerTtsRoute(app, {
    phrases: phrasesDataset.phrases,
    geminiApiKey: opts.geminiApiKey,
    ttsRunner: opts.ttsRunner,
    ttsCache: opts.ttsCache,
    log: opts.log,
  });

  app.post(
    "/api/kit",
    {
      config: {
        rateLimit: {
          max: SAFETY_LIMITS.kitRequestsPerMinutePerIp,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const parsed = KitRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(
            createApiError(
              "INVALID_KIT_REQUEST",
              "Choose a valid Outer Ring Road office before opening your Survival Kit.",
              false,
              request.id,
            ),
          );
      }

      const office = opts.worldData.dataset.places.find(
        (p) => p.id === parsed.data.officePlaceId && p.category === "tech_park",
      );
      if (!office) {
        return reply
          .status(400)
          .send(
            createApiError(
              "UNVERIFIED_KIT_OFFICE",
              "Selected office is not in the verified Outer Ring Road dataset.",
              false,
              request.id,
            ),
          );
      }

      const { mondayWindow, items: rawCommutes } = await computeOfficeCommutes(
        office,
        opts.worldData.dataset.places,
        {
          recommended: parsed.data.recommendedNeighbourhoods,
          fetcher: routeFetcher,
          cache: commuteCache,
          requestId: request.id,
          log: opts.log,
        },
      );

      const { neighbourhoods, summaryFallbackUsed } = await populateNeighbourhoodSummaries(
        rawCommutes,
        office.name,
        { runner: summaryRunner, cache: summaryCache, requestId: request.id, log: opts.log },
      );

      const { phrases, starterPhraseIds } = selectKitPhrases(
        phrasesDataset.phrases,
        parsed.data.learnedPhraseIds,
      );

      const payload = KitPayloadSchema.parse({
        office,
        mondayMorningIso: mondayWindow.morningIso,
        mondayEveningIso: mondayWindow.eveningIso,
        neighbourhoods,
        phrases,
        starterPhraseIds,
        checklist: buildFirstWeekChecklist(parsed.data.budgetBand),
        summaryFallbackUsed,
      });

      return createApiSuccess(payload, request.id);
    },
  );

  return {
    prewarmOfficeCommutes(officePlaceId, recommended, requestId) {
      if (!routeFetcher) return;
      const office = opts.worldData.dataset.places.find(
        (p) => p.id === officePlaceId && p.category === "tech_park",
      );
      if (!office) return;
      void computeOfficeCommutes(office, opts.worldData.dataset.places, {
        recommended,
        fetcher: routeFetcher,
        cache: commuteCache,
        requestId,
        log: opts.log,
      }).catch((err: unknown) => {
        opts.log?.warn("kit.prewarm_commute_failed", {
          requestId,
          meta: { error: err instanceof Error ? err.message : String(err) },
        });
      });
    },
    prewarmPhraseAudio,
  };
}
