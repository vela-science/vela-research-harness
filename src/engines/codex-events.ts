import { objectAt } from "../contracts/validation.js";
import type { EngineUsage } from "./engine.js";

const EVENT_TYPES = new Set([
  "thread.started",
  "turn.started",
  "item.started",
  "item.updated",
  "item.completed",
  "turn.completed",
]);
const PASSIVE_ITEMS = new Set(["agent_message", "reasoning", "todo_list"]);
const ACTION_ITEMS = new Set(["command_execution", "file_change"]);
const FORBIDDEN_COMMAND = /(?:^|[\s;&|])(?:vela\s+sign|git\s+push|gh\s+|curl\s+|wget\s+|ssh\s+)/iu;

export interface CodexEventSummary {
  usage: EngineUsage;
  eventTypes: string[];
  actionTypes: string[];
}

function usageInteger(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${at} must be a nonnegative integer`);
  }
  return value;
}

export function parseCodexEvents(value: string): CodexEventSummary {
  const eventTypes = new Set<string>();
  const actionTypes = new Set<string>();
  const itemKinds = new Map<string, string>();
  let usage: EngineUsage | undefined;

  const lines = value.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) throw new Error("Codex returned no JSONL events");
  for (const [index, line] of lines.entries()) {
    if (Buffer.byteLength(line) > 1_048_576) throw new Error(`Codex event ${index} is oversized`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      throw new Error(`Codex event ${index} is invalid JSON`);
    }
    const event = objectAt(parsed, `codex_event[${index}]`);
    const type = event.type;
    if (typeof type !== "string" || !EVENT_TYPES.has(type)) {
      throw new Error(`Codex event ${index} has unknown type ${String(type)}`);
    }
    eventTypes.add(type);
    if (type === "thread.started" && (typeof event.thread_id !== "string" || event.thread_id === "")) {
      throw new Error("Codex thread.started event has no thread_id");
    }
    if (type === "turn.completed") {
      const rawUsage = objectAt(event.usage, "codex turn.completed.usage");
      usage = {
        input_tokens: usageInteger(rawUsage.input_tokens, "usage.input_tokens"),
        cached_input_tokens: usageInteger(
          rawUsage.cached_input_tokens,
          "usage.cached_input_tokens",
        ),
        output_tokens: usageInteger(rawUsage.output_tokens, "usage.output_tokens"),
        reasoning_output_tokens: usageInteger(
          rawUsage.reasoning_output_tokens,
          "usage.reasoning_output_tokens",
        ),
      };
    }
    if (type === "item.started" || type === "item.updated" || type === "item.completed") {
      const item = objectAt(event.item, `codex ${type}.item`);
      if (typeof item.id !== "string" || item.id === "" || typeof item.type !== "string") {
        throw new Error(`Codex ${type} has a malformed item`);
      }
      const previous = itemKinds.get(item.id);
      if (previous !== undefined && previous !== item.type) {
        throw new Error(`Codex item ${item.id} changed type`);
      }
      itemKinds.set(item.id, item.type);
      if (!PASSIVE_ITEMS.has(item.type) && !ACTION_ITEMS.has(item.type)) {
        throw new Error(`Codex emitted unsupported action type ${item.type}`);
      }
      if (ACTION_ITEMS.has(item.type)) actionTypes.add(item.type);
      if (type === "item.completed" && item.type === "command_execution") {
        if (typeof item.command !== "string" || item.command === "") {
          throw new Error("Codex completed command has no command text");
        }
        if (FORBIDDEN_COMMAND.test(item.command)) {
          throw new Error(`Codex attempted a forbidden external or custody action: ${item.command}`);
        }
      }
    }
  }
  for (const required of ["thread.started", "turn.started", "turn.completed"]) {
    if (!eventTypes.has(required)) throw new Error(`Codex event stream is missing ${required}`);
  }
  if (usage === undefined) throw new Error("Codex event stream has no usage record");
  return {
    usage,
    eventTypes: [...eventTypes].sort(),
    actionTypes: [...actionTypes].sort(),
  };
}

