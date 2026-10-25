/**
 * VIGILANCE Nowhere Esports Intranet - Severity Scoring Engine
 * Deterministic scoring with contextual modifiers and clamping to [0, 100].
 */

import { MatchedSignature, SeverityLevel, SeverityResult } from '../models/types.js';

export interface ScoreContext {
  path: string;
  userAgent?: string;
}

export class SeverityScorer {
  /**
   * Calculates deterministic severity score, context modifiers, and classification level.
   */
  calculate(matches: MatchedSignature[], context: ScoreContext): SeverityResult {
    // 1. Base Score: sum of unique matched rule weights
    const baseScore = matches.reduce((sum, m) => sum + m.severity_weight, 0);

    let contextModifier = 0;
    const appliedModifiers: string[] = [];

    // 2. Sensitive Canary Route Modifier (+15)
    const lowerPath = (context.path || '').toLowerCase();
    const canaryRoutes = ['/.env', '/admin', '/wp-config.php', '/actuator', '/backup'];
    if (canaryRoutes.some(decoy => lowerPath.includes(decoy))) {
      contextModifier += 15;
      appliedModifiers.push('CANARY_ROUTE_PROBE (+15)');
    }

    // 3. Known Automated Scanner Modifier (+15)
    const lowerUA = (context.userAgent || '').toLowerCase();
    const scannerFingerprints = ['sqlmap', 'nikto', 'masscan', 'nmap', 'gobuster', 'dirbuster', 'evilscan'];
    if (scannerFingerprints.some(tool => lowerUA.includes(tool))) {
      contextModifier += 15;
      appliedModifiers.push('SCANNER_USER_AGENT (+15)');
    }

    // 4. Multi-Vector Exploit Combination (+20)
    const uniqueCategories = new Set(matches.map(m => m.category));
    if (uniqueCategories.size >= 2) {
      contextModifier += 20;
      appliedModifiers.push('MULTI_VECTOR_COMBINATION (+20)');
    }

    // 5. Clamping to [0, 100]
    const rawScore = baseScore + contextModifier;
    const clampedScore = Math.max(0, Math.min(100, rawScore));

    // 6. Classification Level
    let severityLevel: SeverityLevel;
    if (clampedScore < 20) {
      severityLevel = 'INFORMATIONAL';
    } else if (clampedScore < 40) {
      severityLevel = 'LOW';
    } else if (clampedScore < 60) {
      severityLevel = 'MEDIUM';
    } else if (clampedScore < 80) {
      severityLevel = 'HIGH';
    } else {
      severityLevel = 'CRITICAL';
    }

    return {
      base_score: baseScore,
      context_modifier: contextModifier,
      raw_score: rawScore,
      clamped_score: clampedScore,
      severity_level: severityLevel,
      applied_modifiers: appliedModifiers,
    };
  }
}
