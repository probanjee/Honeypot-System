/**
 * VIGILANCE Nowhere Esports Intranet - YAML Rules Loader
 * Loads and validates detection rules from configs/honeypot-rules.yaml.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { RuleDefinition, RulesConfig } from '../models/types.js';

export function resolveRulesFilePath(configuredPath?: string): string {
  if (configuredPath && fs.existsSync(configuredPath)) {
    return path.resolve(configuredPath);
  }

  // Common resolution candidates
  const candidates = [
    path.resolve(process.cwd(), '../../configs/honeypot-rules.yaml'),
    path.resolve(process.cwd(), '../configs/honeypot-rules.yaml'),
    path.resolve(process.cwd(), 'configs/honeypot-rules.yaml'),
    path.resolve(process.cwd(), 'honeypot-rules.yaml'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`[RULES_FILE_NOT_FOUND] Could not locate honeypot-rules.yaml. Checked candidates:\n${candidates.join('\n')}`);
}

export function loadAndValidateRules(customPath?: string): RulesConfig {
  const filePath = resolveRulesFilePath(customPath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(fileContent) as { rules: RuleDefinition[] };

  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error(`[RULES_INVALID_FORMAT] Rules file at ${filePath} must contain a top-level 'rules' array.`);
  }

  const validatedRules: RuleDefinition[] = [];
  const seenIds = new Set<string>();

  for (const rule of parsed.rules) {
    if (!rule.id || typeof rule.id !== 'string') {
      throw new Error(`[RULE_INVALID] Rule missing 'id': ${JSON.stringify(rule)}`);
    }
    if (seenIds.has(rule.id)) {
      throw new Error(`[RULE_DUPLICATE_ID] Duplicate rule ID detected: ${rule.id}`);
    }
    seenIds.add(rule.id);

    if (!rule.category || typeof rule.category !== 'string') {
      throw new Error(`[RULE_INVALID] Rule ${rule.id} missing 'category'`);
    }
    if (typeof rule.severity_weight !== 'number' || rule.severity_weight < 0) {
      throw new Error(`[RULE_INVALID] Rule ${rule.id} has invalid 'severity_weight'`);
    }
    if (!Array.isArray(rule.locations) || rule.locations.length === 0) {
      throw new Error(`[RULE_INVALID] Rule ${rule.id} must define at least one location`);
    }

    // Validate regex patterns
    if (rule.matching_logic?.type === 'regex') {
      const patterns = rule.matching_logic.patterns || [];
      if (patterns.length === 0) {
        throw new Error(`[RULE_INVALID] Regex rule ${rule.id} has no patterns`);
      }
      for (const pat of patterns) {
        let cleanPat = pat;
        let flags = 'i';
        if (cleanPat.startsWith('(?i)')) {
          cleanPat = cleanPat.substring(4);
        }
        try {
          new RegExp(cleanPat, flags);
        } catch (e) {
          throw new Error(`[RULE_REGEX_SYNTAX_ERROR] Rule ${rule.id} pattern /${pat}/ is invalid: ${(e as Error).message}`);
        }
      }
    }

    validatedRules.push(rule);
  }

  return { rules: validatedRules };
}
