import { loadConfig } from './app-config';

const minimal = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadConfig', () => {
  it('applies safe defaults (chaos off, 30 min tokens)', () => {
    const config = loadConfig(minimal);
    expect(config.chaos.enabled).toBe(false);
    expect(config.auth.ttlSeconds).toBe(1800);
    expect(config.corsOrigins).toEqual(['http://localhost:3000']);
  });

  it('parses booleans and lists from strings', () => {
    const config = loadConfig({
      ...minimal,
      CHAOS_ENABLED: 'true',
      CORS_ORIGINS: 'http://a.test, http://b.test',
    });
    expect(config.chaos.enabled).toBe(true);
    expect(config.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('refuses to boot with a weak JWT secret', () => {
    expect(() => loadConfig({ ...minimal, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('refuses to boot without a database URL', () => {
    expect(() => loadConfig({ JWT_SECRET: minimal.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });
});
