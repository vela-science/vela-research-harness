import {describe, expect, it} from 'vitest';
import {evidence} from './evidence';

describe('sanitized film evidence', () => {
  it('keeps the formal GPT-5.6 attempt fail-closed', () => {
    expect(evidence.formal.model).toBe('gpt-5.6-sol');
    expect(evidence.formal.worker).toBe('success');
    expect(evidence.formal.verifierStatus).toBe('failed');
    expect(evidence.formal.landingObserved).toBe(false);
    expect(evidence.formal.acceptedStateDelta).toBe(0);
  });

  it('identifies the retained successful worker truthfully', () => {
    expect(evidence.retained.model).toBe('gpt-5.4');
    expect(evidence.retained.worker).toBe('success');
    expect(evidence.retained.verifier).toBe('pass');
    expect(evidence.retained.route).toBe('defer');
    expect(evidence.retained.acceptedStateDelta).toBe(0);
  });

  it('keeps the GPT-5.6 audit non-authoritative', () => {
    expect(evidence.audit.model).toBe('gpt-5.6-sol');
    expect(evidence.audit.classification).toBe('model_assessment');
    expect(evidence.audit.scientificStateLanded).toBe(false);
  });
});

