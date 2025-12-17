/**
 * Pivot Detection Utilities
 *
 * Detect conversation boundaries and phase transitions
 */

import { Observation } from '../types';

export interface Pivot {
  type: 'phase_change' | 'decision_point' | 'new_question' | 'file_change';
  label: string;
  icon: string;
  position: number; // Index in observations array
}

/**
 * Detect pivots in observation sequence
 */
export function detectPivots(observations: Observation[]): Pivot[] {
  const pivots: Pivot[] = [];

  for (let i = 1; i < observations.length; i++) {
    const prev = observations[i - 1];
    const curr = observations[i];

    // Type transition: Investigation → Implementation
    if (prev.type === 'discovery' && curr.type !== 'discovery' && curr.type !== 'change') {
      pivots.push({
        type: 'phase_change',
        label: 'Started implementation',
        icon: '⚡',
        position: i
      });
    }

    // Type transition: Implementation → Bug fixing
    if ((prev.type === 'feature' || prev.type === 'change') && curr.type === 'bugfix') {
      pivots.push({
        type: 'phase_change',
        label: 'Bug fixing',
        icon: '🔧',
        position: i
      });
    }

    // Decision points mark task boundaries
    if (curr.type === 'decision') {
      pivots.push({
        type: 'decision_point',
        label: curr.title || 'Decision made',
        icon: '🔴',
        position: i
      });
    }

    // Prompt number change (new question)
    if (prev.prompt_number !== null && curr.prompt_number !== null &&
        curr.prompt_number > prev.prompt_number) {
      pivots.push({
        type: 'new_question',
        label: `Prompt ${curr.prompt_number}`,
        icon: '💬',
        position: i
      });
    }

    // File context switch
    try {
      const prevFiles = prev.files_modified ? JSON.parse(prev.files_modified) : [];
      const currFiles = curr.files_modified ? JSON.parse(curr.files_modified) : [];

      if (prevFiles.length > 0 && currFiles.length > 0 && prevFiles[0] !== currFiles[0]) {
        // Extract just filename for display
        const fromFile = prevFiles[0].split('/').pop() || prevFiles[0];
        const toFile = currFiles[0].split('/').pop() || currFiles[0];

        pivots.push({
          type: 'file_change',
          label: `${fromFile} → ${toFile}`,
          icon: '📁',
          position: i
        });
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return pivots;
}

/**
 * Group observations by prompt number
 */
export function groupByPrompt(observations: Observation[]): Map<number, Observation[]> {
  const groups = new Map<number, Observation[]>();

  for (const obs of observations) {
    const promptNum = obs.prompt_number || 0;
    if (!groups.has(promptNum)) {
      groups.set(promptNum, []);
    }
    groups.get(promptNum)!.push(obs);
  }

  // Sort by prompt number
  return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * Find prompt text for a given prompt number
 */
export function findPromptText(
  promptNumber: number,
  prompts: Array<{ prompt_number: number; prompt_text: string }>
): string | null {
  const prompt = prompts.find(p => p.prompt_number === promptNumber);
  return prompt?.prompt_text || null;
}
