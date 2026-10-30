import { describe, expect, it } from 'vitest';
import { bynAmount, gb, money, phoneValid, prettyMetric } from './format';

describe('Форматирование данных API', () => {
  it('formats BYN values without floating-point presentation errors', () => {
    expect(money('23.46')).toContain('23,46');
    expect(money('0.00')).toContain('0,00');
  });
  it('converts internet MB using 1024 MB in a GB', () => {
    expect(gb(10240)).toBe('10 ГБ');
  });
  it('validates phone numbers in E.164 format', () => {
    expect(phoneValid('+375291111111')).toBe(true);
    expect(phoneValid('80291111111')).toBe(false);
  });
  it('normalizes BYN amounts to two decimal places', () => {
    expect(bynAmount('20')).toBe('20.00');
    expect(bynAmount('15,9')).toBe('15.90');
    expect(bynAmount('abc')).toBeNull();
  });
  it('renders usage metrics in Russian', () => {
    expect(prettyMetric('minutes_other')).toBe('Минуты в другие сети');
  });
});
