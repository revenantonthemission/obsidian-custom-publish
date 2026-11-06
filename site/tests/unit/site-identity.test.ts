import { describe, expect, it } from 'vitest';
import { SITE_NAME, documentTitle } from '../../src/lib/site';

describe('site identity', () => {
  it('names the site Passion Project', () => {
    expect(SITE_NAME).toBe('Passion Project');
  });

  it('uses the site name alone for the homepage', () => {
    expect(documentTitle()).toBe('Passion Project');
    expect(documentTitle('')).toBe('Passion Project');
    expect(documentTitle('  ')).toBe('Passion Project');
    expect(documentTitle('Passion Project')).toBe('Passion Project');
  });

  it('puts the page title before the site name', () => {
    expect(documentTitle('Tags')).toBe('Tags — Passion Project');
    expect(documentTitle(' 그래프 ')).toBe('그래프 — Passion Project');
  });
});
