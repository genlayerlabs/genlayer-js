#!/usr/bin/env node
/**
 * Generate Markdown API reference pages from JSDoc + TypeScript source.
 *
 * Outputs:
 *   docs/api-references/index.md        - README (install, quickstart, examples)
 *   docs/api-references/contracts.md    - Contract methods with full params
 *   docs/api-references/transactions.md - Transaction methods with full params
 *   docs/api-references/staking.md      - Staking methods with full params
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "docs", "api-references");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(relPath) {
  return readFileSync(join(root, relPath), "utf-8");
}

/**
 * Extract methods defined as object properties inside a returned object literal.
 * Pattern: /** JSDoc * / name: async ...
 * This targets methods inside `return { ... }` blocks (contractActions, stakingActions, etc.)
 * and inside `receiptActions(...) => ({ ... })` / `transactionActions(...) => ({ ... })`.
 *
 * Also handles top-level exported functions for cases like the standalone fn pattern.
 */
function extractMethods(src) {
  const methods = [];
  const lines = src.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Look for /** ... */ JSDoc comment blocks
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith("/**")) continue;

    // Collect the full JSDoc block
    let jsdocEnd = i;
    if (trimmed.includes("*/")) {
      jsdocEnd = i;
    } else {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].includes("*/")) {
          jsdocEnd = j;
          break;
        }
      }
    }

    const jsdocLines = lines.slice(i, jsdocEnd + 1).join("\n");
    const doc = jsdocLines
      .replace(/\/\*\*\s*/, "")
      .replace(/\s*\*\//, "")
      .replace(/^\s*\*\s?/gm, "")
      .trim();

    // The line after the JSDoc should be the method definition
    const nextLineIdx = jsdocEnd + 1;
    if (nextLineIdx >= lines.length) continue;

    const nextLine = lines[nextLineIdx].trim();

    // Match: methodName: async (...) or methodName: async <T>(...)
    const methodMatch = nextLine.match(
      /^(\w+):\s*async\s*/
    );
    if (!methodMatch) continue;

    const name = methodMatch[1];

    // Skip private/internal functions
    if (name.startsWith("_")) continue;

    // Collect the full signature until we find => or the opening {
    let sigLines = "";
    for (let k = nextLineIdx; k < lines.length; k++) {
      sigLines += lines[k] + "\n";
      if (lines[k].includes("=>") || (lines[k].trim().endsWith("{") && sigLines.includes(")"))) {
        break;
      }
    }

    const params = extractParamsFromSignature(sigLines);
    const returnType = extractReturnType(sigLines);

    methods.push({ name, doc, params, returnType });
  }

  return methods;
}

/**
 * Extract params from a full method signature string.
 */
function extractParamsFromSignature(sig) {
  // Remove the method name prefix: "name: async <T>(" -> find first (
  const firstParen = sig.indexOf("(");
  if (firstParen === -1) return [];

  // Find matching closing paren
  let depth = 0;
  let end = -1;
  for (let i = firstParen; i < sig.length; i++) {
    if (sig[i] === "(") depth++;
    if (sig[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [];

  const inner = sig.slice(firstParen + 1, end).trim();
  if (!inner) return [];

  // Case 1: single param with inline object type: (args: { ... }) or ({destructured}: { ... })
  // Look for `: {` pattern indicating inline object type
  const colonBrace = findColonBrace(inner);
  if (colonBrace !== -1) {
    const objBody = extractBraceContent(inner, colonBrace + 1);
    if (objBody) {
      return parseObjectFields(objBody);
    }
  }

  // Case 2: single param with named type: (options: ValidatorJoinOptions) or (options?: Type)
  const namedTypeMatch = inner.match(/^\w+\??\s*:\s*([A-Z]\w+)$/);
  if (namedTypeMatch) {
    const resolved = resolveInterface(namedTypeMatch[1]);
    if (resolved.length > 0) return resolved;
  }

  // Case 3: simple positional params
  const parts = splitTopLevel(inner, ",");
  return parts.map((p) => {
    p = p.trim();
    if (!p) return null;
    const optional = p.includes("?:") || p.includes("=");
    // Handle default values like startIndex = 0n
    const defaultMatch = p.match(/\s*=\s*(.+)$/);
    const cleaned = p.replace(/\s*=\s*[^,]+$/, "");
    const sepIdx = cleaned.search(/\??:/);
    if (sepIdx === -1) {
      // No type annotation, just a name (possibly with default)
      const paramName = cleaned.trim();
      const inferredType = defaultMatch ? inferTypeFromDefault(defaultMatch[1].trim()) : "unknown";
      return {
        name: paramName,
        type: inferredType,
        required: !optional,
        description: "",
      };
    }
    const paramName = cleaned.slice(0, sepIdx).trim();
    const paramType = cleaned.slice(sepIdx).replace(/^\??:\s*/, "").trim();
    return {
      name: paramName,
      type: paramType || "unknown",
      required: !optional,
      description: "",
    };
  }).filter(Boolean);
}

/**
 * Find the position of `: {` that starts the type annotation object (not destructuring).
 */
function findColonBrace(s) {
  // Skip past any destructuring pattern at the start
  let i = 0;
  // If it starts with {, skip the destructuring block
  if (s.trim().startsWith("{")) {
    let depth = 0;
    for (; i < s.length; i++) {
      if (s[i] === "{") depth++;
      if (s[i] === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
  }
  // Now look for `: {`
  for (; i < s.length - 1; i++) {
    if (s[i] === ":" && s.slice(i + 1).trimStart().startsWith("{")) {
      return i;
    }
  }
  return -1;
}

function extractBraceContent(s, startFrom) {
  const braceStart = s.indexOf("{", startFrom);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < s.length; i++) {
    if (s[i] === "{") depth++;
    if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        return s.slice(braceStart + 1, i);
      }
    }
  }
  return null;
}

function splitTopLevel(s, sep) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "{" || ch === "<" || ch === "(") depth++;
    if (ch === "}" || ch === ">" || ch === ")") depth--;
    if (ch === sep && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseObjectFields(inner) {
  const fields = [];
  const entries = splitFields(inner);
  for (let entry of entries) {
    entry = entry.trim();
    if (!entry) continue;
    const optional = entry.includes("?:");
    const fieldMatch = entry.match(/^(\w+)\??\s*:\s*([\s\S]+)$/);
    if (fieldMatch) {
      let fieldType = fieldMatch[2].trim().replace(/;$/, "").trim();
      // Remove trailing semicolons/whitespace
      fieldType = fieldType.replace(/;\s*$/, "");
      fields.push({
        name: fieldMatch[1],
        type: fieldType,
        required: !optional,
        description: "",
      });
    }
  }
  return fields;
}

function splitFields(s) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "{" || ch === "<" || ch === "(") depth++;
    if (ch === "}" || ch === ">" || ch === ")") depth--;
    if (ch === ";" && depth === 0) {
      parts.push(current);
      current = "";
    } else if (ch === "\n" && depth === 0 && current.trim()) {
      // Also split on newlines for multi-line object types
      if (current.includes(":")) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function inferTypeFromDefault(defaultVal) {
  if (defaultVal.endsWith("n")) return "bigint";
  if (defaultVal === "true" || defaultVal === "false") return "boolean";
  if (defaultVal.startsWith('"') || defaultVal.startsWith("'")) return "string";
  if (/^\d+$/.test(defaultVal)) return "number";
  return "unknown";
}

function extractReturnType(sig) {
  // Match ): Promise<...> => or ): ReturnType =>
  const returnMatch = sig.match(/\)\s*:\s*([\s\S]*?)\s*=>/);
  if (!returnMatch) return "";
  let raw = returnMatch[1].trim();
  // Unwrap Promise<>
  const promiseMatch = raw.match(/^Promise<([\s\S]*)>$/);
  if (promiseMatch) {
    raw = promiseMatch[1].trim();
  }
  // Clean up template literal types for display
  if (raw.includes("`")) {
    raw = raw.replace(/`/g, "");
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Resolve named option interfaces from types/staking.ts
// ---------------------------------------------------------------------------
let _stakingTypes = null;
function getStakingTypes() {
  if (!_stakingTypes) {
    _stakingTypes = read("src/types/staking.ts");
  }
  return _stakingTypes;
}

function resolveInterface(name) {
  const src = getStakingTypes();
  const re = new RegExp(
    `export\\s+interface\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m"
  );
  const m = src.match(re);
  if (!m) return [];
  return parseObjectFields(m[1]);
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

function escapeType(t) {
  // Escape pipe chars in types for markdown tables
  return t.replace(/\|/g, "\\|");
}

function paramsTable(params) {
  if (!params.length) return "_No parameters._\n";
  let md = "| Parameter | Type | Required | Description |\n";
  md += "|-----------|------|----------|-------------|\n";
  for (const p of params) {
    const req = p.required ? "yes" : "no";
    md += `| ${p.name} | \`${escapeType(p.type)}\` | ${req} | ${p.description} |\n`;
  }
  return md;
}

function methodBlock(m) {
  let md = `### ${m.name}\n\n`;
  md += `${m.doc}\n\n`;
  md += paramsTable(m.params);
  if (m.returnType) {
    md += `\n**Returns:** \`${m.returnType}\`\n`;
  }
  md += "\n---\n\n";
  return md;
}

function generatePage(title, description, methods) {
  let md = `# ${title}\n\n`;
  md += `${description}\n\n`;
  for (const m of methods) {
    md += methodBlock(m);
  }
  return md;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

mkdirSync(outDir, { recursive: true });

// 1. index.md = README
const readme = readFileSync(join(root, "README.md"), "utf-8");
writeFileSync(join(outDir, "index.md"), readme);
console.log("Generated: docs/api-references/index.md");

// 2. contracts.md
const contractsSrc = read("src/contracts/actions.ts");
const contractMethods = extractMethods(contractsSrc);
const contractsMd = generatePage(
  "Contract Methods",
  "Methods for deploying, reading, writing, and simulating GenLayer intelligent contracts.",
  contractMethods
);
writeFileSync(join(outDir, "contracts.md"), contractsMd);
console.log("Generated: docs/api-references/contracts.md");

// 3. transactions.md
const txSrc = read("src/transactions/actions.ts");
const txMethods = extractMethods(txSrc);
const txMd = generatePage(
  "Transaction Methods",
  "Methods for fetching transactions, waiting for receipts, estimating gas, and debugging execution traces.",
  txMethods
);
writeFileSync(join(outDir, "transactions.md"), txMd);
console.log("Generated: docs/api-references/transactions.md");

// 4. staking.md
const stakingSrc = read("src/staking/actions.ts");
const stakingMethods = extractMethods(stakingSrc);
const stakingMd = generatePage(
  "Staking Methods",
  "Methods for validator and delegator staking operations, epoch queries, and network status.",
  stakingMethods
);
writeFileSync(join(outDir, "staking.md"), stakingMd);
console.log("Generated: docs/api-references/staking.md");
