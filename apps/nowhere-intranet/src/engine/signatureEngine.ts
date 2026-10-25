/**
 * VIGILANCE Nowhere Esports Intranet - Signature Matching Engine
 * Multi-location regex inspection across bounded request surfaces.
 */

import { MatchedSignature, RuleDefinition, RulesConfig } from '../models/types.js';
import { normalizeForInspection } from './normalizer.js';

export interface InspectionRequest {
  path: string;
  query: Record<string, unknown> | string;
  headers: Record<string, string | undefined>;
  body: unknown;
}

export class SignatureEngine {
  private compiledRules: Array<{
    rule: RuleDefinition;
    regexes: RegExp[];
  }> = [];

  constructor(rulesConfig: RulesConfig) {
    this.compileRules(rulesConfig.rules);
  }

  private compileRules(rules: RuleDefinition[]): void {
    this.compiledRules = [];
    for (const rule of rules) {
      if (!rule.enabled) continue;
      const regexes: RegExp[] = [];
      if (rule.matching_logic?.type === 'regex') {
        for (const pattern of rule.matching_logic.patterns || []) {
          try {
            // Note: YAML patterns may already contain (?i). JavaScript handles RegExp with 'i' flag.
            let cleanPat = pattern;
            let flags = 'g';
            if (cleanPat.startsWith('(?i)')) {
              cleanPat = cleanPat.substring(4);
              flags = 'gi';
            }
            regexes.push(new RegExp(cleanPat, flags));
          } catch {
            // Fallback: standard compilation
            regexes.push(new RegExp(pattern, 'gi'));
          }
        }
      }
      this.compiledRules.push({ rule, regexes });
    }
  }

  /**
   * Evaluates an incoming HTTP request across all configured attack surfaces.
   * A single rule can only match once per request (deduplicated).
   */
  evaluate(req: InspectionRequest): MatchedSignature[] {
    const surfaces: Record<string, string> = {
      path: normalizeForInspection(req.path),
      query: normalizeForInspection(
        typeof req.query === 'string' ? req.query : Object.entries(req.query || {}).map(([k, v]) => `${k}=${v}`).join('&')
      ),
      body: normalizeForInspection(req.body),
      'headers.user-agent': normalizeForInspection(req.headers['user-agent'] || req.headers['User-Agent']),
      'headers.referer': normalizeForInspection(req.headers['referer'] || req.headers['Referer']),
      'headers.x-forwarded-for': normalizeForInspection(req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']),
      'headers.cookie': normalizeForInspection(req.headers['cookie'] || req.headers['Cookie']),
    };

    const matches: MatchedSignature[] = [];

    for (const { rule, regexes } of this.compiledRules) {
      let ruleMatched = false;

      // Handle custom evaluator rules (e.g., credential stuffing detection)
      if (rule.matching_logic?.type === 'custom') {
        if (rule.matching_logic.rule_handler === 'credential_stuffing_evaluator') {
          const pathText = surfaces['path'] || '';
          const bodyText = surfaces['body'] || '';
          const isAuthPath = /auth|login|signin|admin/i.test(pathText);
          const hasBrutePayload = /\b(admin|root|administrator|supervisor|guest|toor|dump_passwords|password123)\b/i.test(bodyText);

          if (isAuthPath && hasBrutePayload) {
            matches.push({
              rule_id: rule.id,
              rule_name: rule.name,
              category: rule.category,
              severity_weight: rule.severity_weight,
              matched_location: 'body',
              extracted_sample: bodyText.length > 120 ? bodyText.slice(0, 120) + '...' : bodyText,
            });
            continue;
          }
        }
      }

      for (const loc of rule.locations) {
        const targetText = surfaces[loc.toLowerCase()];
        if (!targetText) continue;

        for (const rx of regexes) {
          // Reset regex state
          rx.lastIndex = 0;
          const matchResult = rx.exec(targetText);
          if (matchResult) {
            const sample = matchResult[0].length > 120 
              ? matchResult[0].slice(0, 120) + '...' 
              : matchResult[0];

            matches.push({
              rule_id: rule.id,
              rule_name: rule.name,
              category: rule.category,
              severity_weight: rule.severity_weight,
              matched_location: loc,
              extracted_sample: sample,
            });

            ruleMatched = true;
            break; // Stop evaluating patterns for this rule
          }
        }

        if (ruleMatched) {
          break; // Stop evaluating locations for this rule (deduplicate)
        }
      }
    }

    return matches;
  }
}
