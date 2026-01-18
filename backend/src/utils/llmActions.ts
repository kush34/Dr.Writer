/**
 * EditOperation (DOCUMENTATION ONLY)
 *
 * LLM must return:
 *
 * {
 *   operations: [
 *     { type: "replace", from: number, to: number, text: string },
 *     { type: "insert", at: number, text: string },
 *     { type: "delete", from: number, to: number }
 *   ]
 * }
 *
 * No markdown. No backticks. No prose.
 */

import { NumberLiteralType } from "typescript";

/**
 * Validate a single edit operation
 */

type tReplace = {
  type: "replace"
  from: number;
  to: number;
  text: string
}
type tInsert = {
  type: "insert"
  at: number;
  text: string
}
type tDelete = {
  type: "delete"
  from: number
  to: number
}
export type tOps = tReplace | tInsert | tDelete
export function isValidOp(op: tOps) {
  if (!op || typeof op !== "object") return false;

  switch (op.type) {
    case "replace":
      return (
        Number.isInteger(op.from) &&
        Number.isInteger(op.to) &&
        op.from >= 0 &&
        op.to >= op.from &&
        typeof op.text === "string"
      );

    case "insert":
      return (
        Number.isInteger(op.at) &&
        op.at >= 0 &&
        typeof op.text === "string"
      );

    case "delete":
      return (
        Number.isInteger(op.from) &&
        Number.isInteger(op.to) &&
        op.from >= 0 &&
        op.to >= op.from
      );

    default:
      return false;
  }
}

/**
 * Validate + sanitize LLM response
 * Drops invalid ops instead of crashing your app
 */
export function sanitizeOperations(ops:tOps[]) {
  if (!Array.isArray(ops)) return [];

  return ops.filter(isValidOp);
}
