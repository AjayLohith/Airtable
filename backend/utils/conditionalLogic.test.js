import { shouldShowQuestion } from './conditionalLogic.js';

describe('shouldShowQuestion', () => {
  test('returns true when rules is null', () => {
    expect(shouldShowQuestion(null, {})).toBe(true);
  });

  test('returns true when rules is undefined', () => {
    expect(shouldShowQuestion(undefined, {})).toBe(true);
  });

  test('returns true when conditions array is empty', () => {
    expect(shouldShowQuestion({ logic: 'AND', conditions: [] }, {})).toBe(true);
  });

  test('AND logic: all conditions must be true', () => {
    const rules = {
      logic: 'AND',
      conditions: [
        { questionKey: 'q1', operator: 'equals', value: 'yes' },
        { questionKey: 'q2', operator: 'equals', value: 'no' }
      ]
    };
    expect(shouldShowQuestion(rules, { q1: 'yes', q2: 'no' })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: 'yes', q2: 'yes' })).toBe(false);
  });

  test('OR logic: at least one condition must be true', () => {
    const rules = {
      logic: 'OR',
      conditions: [
        { questionKey: 'q1', operator: 'equals', value: 'yes' },
        { questionKey: 'q2', operator: 'equals', value: 'no' }
      ]
    };
    expect(shouldShowQuestion(rules, { q1: 'yes', q2: 'maybe' })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: 'no', q2: 'maybe' })).toBe(false);
  });

  test('equals operator works correctly', () => {
    const rules = {
      logic: 'AND',
      conditions: [{ questionKey: 'q1', operator: 'equals', value: 'test' }]
    };
    expect(shouldShowQuestion(rules, { q1: 'test' })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: 'not-test' })).toBe(false);
  });

  test('notEquals operator works correctly', () => {
    const rules = {
      logic: 'AND',
      conditions: [{ questionKey: 'q1', operator: 'notEquals', value: 'test' }]
    };
    expect(shouldShowQuestion(rules, { q1: 'other' })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: 'test' })).toBe(false);
  });

  test('contains operator works with strings', () => {
    const rules = {
      logic: 'AND',
      conditions: [{ questionKey: 'q1', operator: 'contains', value: 'test' }]
    };
    expect(shouldShowQuestion(rules, { q1: 'this is a test' })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: 'no match' })).toBe(false);
  });

  test('contains operator works with arrays', () => {
    const rules = {
      logic: 'AND',
      conditions: [{ questionKey: 'q1', operator: 'contains', value: 'option1' }]
    };
    expect(shouldShowQuestion(rules, { q1: ['option1', 'option2'] })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: ['option2', 'option3'] })).toBe(false);
  });

  test('returns false when answer is missing', () => {
    const rules = {
      logic: 'AND',
      conditions: [{ questionKey: 'q1', operator: 'equals', value: 'test' }]
    };
    expect(shouldShowQuestion(rules, {})).toBe(false);
    expect(shouldShowQuestion(rules, { q1: null })).toBe(false);
    expect(shouldShowQuestion(rules, { q1: '' })).toBe(false);
  });

  test('defaults to AND logic when not specified', () => {
    const rules = {
      conditions: [
        { questionKey: 'q1', operator: 'equals', value: 'yes' },
        { questionKey: 'q2', operator: 'equals', value: 'no' }
      ]
    };
    expect(shouldShowQuestion(rules, { q1: 'yes', q2: 'no' })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: 'yes', q2: 'yes' })).toBe(false);
  });

  test('handles numeric values correctly', () => {
    const rules = {
      logic: 'AND',
      conditions: [{ questionKey: 'q1', operator: 'equals', value: '123' }]
    };
    expect(shouldShowQuestion(rules, { q1: 123 })).toBe(true);
    expect(shouldShowQuestion(rules, { q1: '123' })).toBe(true);
  });
});


