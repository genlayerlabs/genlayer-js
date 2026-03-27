#!/usr/bin/env node
/**
 * Generate a single Markdown API reference from JSDoc comments in the source.
 * Outputs to docs/api-references/index.md
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function extractJSDocMethods(filePath, sectionName) {
  const src = readFileSync(join(root, filePath), "utf-8");
  const methods = [];

  // Match: /** docstring */ followed by method definition
  const regex = /\/\*\*\s*(.*?)\s*\*\/\s*\n\s*(\w+):\s*async\s/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    const doc = match[1].replace(/\s*\*\s*/g, " ").trim();
    const name = match[2];
    methods.push({ name, doc });
  }

  // Also match standalone function declarations with JSDoc
  const fnRegex = /\/\*\*\s*(.*?)\s*\*\/\s*\n\s*(?:export\s+)?(?:const|function)\s+(\w+)/g;
  while ((match = fnRegex.exec(src)) !== null) {
    const doc = match[1].replace(/\s*\*\s*/g, " ").trim();
    const name = match[2];
    if (!methods.find((m) => m.name === name)) {
      methods.push({ name, doc });
    }
  }

  return methods;
}

function generateSection(title, methods) {
  if (!methods.length) return "";
  let md = `## ${title}\n\n`;
  for (const { name, doc } of methods) {
    md += `### \`${name}\`\n\n${doc}\n\n---\n\n`;
  }
  return md;
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

const sections = [
  { file: "src/client/client.ts", title: "Client" },
  { file: "src/contracts/actions.ts", title: "Contracts" },
  { file: "src/transactions/actions.ts", title: "Transactions" },
  { file: "src/staking/actions.ts", title: "Staking" },
];

let md = `# GenLayerJS SDK API Reference\n\n`;
md += `Version: ${pkg.version}\n\n`;

for (const { file, title } of sections) {
  const methods = extractJSDocMethods(file, title);
  md += generateSection(title, methods);
}

// Add enums section manually
md += `## Enums\n\n`;
md += `### TransactionStatus\n\n`;
md += `\`UNINITIALIZED\` | \`PENDING\` | \`PROPOSING\` | \`COMMITTING\` | \`REVEALING\` | \`ACCEPTED\` | \`UNDETERMINED\` | \`FINALIZED\` | \`CANCELED\` | \`APPEAL_REVEALING\` | \`APPEAL_COMMITTING\` | \`READY_TO_FINALIZE\` | \`VALIDATORS_TIMEOUT\` | \`LEADER_TIMEOUT\`\n\n---\n\n`;
md += `### ExecutionResult\n\n`;
md += `\`NOT_VOTED\` | \`FINISHED_WITH_RETURN\` | \`FINISHED_WITH_ERROR\`\n\n---\n\n`;
md += `### TransactionResult\n\n`;
md += `\`IDLE\` | \`AGREE\` | \`DISAGREE\` | \`TIMEOUT\` | \`DETERMINISTIC_VIOLATION\` | \`NO_MAJORITY\` | \`MAJORITY_AGREE\` | \`MAJORITY_DISAGREE\`\n\n---\n\n`;

const outDir = join(root, "docs", "api-references");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "index.md");
writeFileSync(outPath, md);
console.log(`Generated: ${outPath}`);
