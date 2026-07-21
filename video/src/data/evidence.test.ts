import {describe, expect, it} from 'vitest';
import {evidence} from './evidence';

describe('sanitized film evidence', () => {
  it('binds the genuine GPT-5.6 Sidon result', () => {
    expect(evidence.primary.model).toBe('gpt-5.6-sol');
    expect(evidence.primary.baselineSize).toBe(7193);
    expect(evidence.primary.candidateSize).toBe(7194);
    expect(evidence.primary.pairSumsChecked).toBe(25880415);
    expect(evidence.primary.worker).toBe('success');
    expect(evidence.primary.verifier).toBe('pass');
    expect(evidence.primary.replay).toBe('matched');
  });

  it('preserves the authority boundary', () => {
    expect(evidence.primary.route).toBe('defer');
    expect(evidence.primary.acceptedStateDelta).toBe(0);
    expect(evidence.primary.proposalId).toBe('vpr_491cc97cfdfe98ff');
  });

  it('keeps the rejected formal attempt fail-closed', () => {
    expect(evidence.failClosed.verifier).toBe('failed');
    expect(evidence.failClosed.receiptProduced).toBe(false);
    expect(evidence.failClosed.landingObserved).toBe(false);
    expect(evidence.failClosed.acceptedStateDelta).toBe(0);
  });
});
