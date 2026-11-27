/**
 * Feature: Gemini Live Non-Blocking Tool Mapper (server/src/live/tools.ts)
 * Purpose: Converts shared Live tool declarations into @google/genai FunctionDeclaration objects for ephemeral token constraints.
 * Inputs: Boolean flag indicating whether mark_phrase_attempt should be included.
 * Outputs: Typed @google/genai Tool array with Behavior.NON_BLOCKING.
 * Deliberately excludes: Synchronous blocking tools (unsupported/discouraged on Gemini 3.8 Live).
 */
import { Behavior, type FunctionDeclaration, type Schema, type Tool } from "@google/genai";
import { buildSharedLiveTools } from "@apna-area/shared";

/**
 * Builds the @google/genai Tool array locked inside liveConnectConstraints.
 *
 * @param includePhraseTool - Whether to include mark_phrase_attempt (enabled in Phase 3c).
 * @returns Array containing one Tool with NON_BLOCKING functionDeclarations.
 */
export function buildServerLiveTools(includePhraseTool: boolean): Tool[] {
  const shared = buildSharedLiveTools(includePhraseTool);
  const functionDeclarations: FunctionDeclaration[] = shared.map((decl) => ({
    name: decl.name,
    description: decl.description,
    behavior: Behavior.NON_BLOCKING,
    parameters: decl.parameters as unknown as Schema,
  }));
  return [{ functionDeclarations }];
}
