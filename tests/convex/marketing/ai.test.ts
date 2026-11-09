import { describe, expect, it } from 'vitest';

import {
  htmlToText,
  normalizeWebsiteUrl,
  parseBrand,
  parseDrafts,
  parseJsonObject,
  parseRevision,
} from '#convex/marketing/ai';

describe('normalizeWebsiteUrl', () => {
  it('adds https and drops the fragment', () => {
    expect(normalizeWebsiteUrl(' shop.example.com/about#team ')).toBe(
      'https://shop.example.com/about',
    );
  });

  it.each([
    'localhost:3000',
    'http://127.0.0.1/admin',
    'http://10.0.0.8',
    'http://192.168.1.1',
    'http://169.254.169.254/latest',
    'http://172.20.0.1',
    'http://[::1]/',
    'http://printer.local',
    'http://0x7f.0.0.1',
    'not a url',
  ])('rejects %s', (input) => {
    expect(() => normalizeWebsiteUrl(input)).toThrow();
  });
});

describe('htmlToText', () => {
  it('keeps the title and copy and removes scripts and styles', () => {
    const text = htmlToText(
      '<title>Shop</title><style>a{}</style><script>bad()</script><p>Tea &amp; mugs</p>',
    );
    expect(text).toContain('Shop');
    expect(text).toContain('Tea & mugs');
    expect(text).not.toContain('bad()');
  });
});

describe('model output parsing', () => {
  it('reads JSON wrapped in other text', () => {
    expect(parseJsonObject('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('rejects output with no JSON or the wrong shape', () => {
    expect(() => parseJsonObject('no json here')).toThrow();
    expect(() => parseBrand('{"audience":"x"}')).toThrow();
    expect(() => parseRevision('{"headline":"x"}')).toThrow();
  });

  it('drops drafts for channels that were not requested and incomplete drafts', () => {
    const { drafts } = parseDrafts(
      JSON.stringify({
        angles: ['One'],
        drafts: [
          { channel: 'email', headline: 'Keep', body: 'Yes' },
          { channel: 'ads', headline: 'Not requested', body: 'No' },
          { channel: 'email', headline: '', body: 'Missing headline' },
        ],
      }),
      ['email'],
    );
    expect(drafts).toEqual([{ channel: 'email', headline: 'Keep', body: 'Yes' }]);
  });

  it('fails when no usable draft remains', () => {
    expect(() => parseDrafts('{"drafts":[]}', ['email'])).toThrow();
  });
});
