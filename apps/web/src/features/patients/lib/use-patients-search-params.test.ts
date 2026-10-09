import { parseListQuery } from './use-patients-search-params';

describe('parseListQuery', () => {
  it('returns defaults for an empty URL', () => {
    expect(parseListQuery(new URLSearchParams())).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      sortBy: 'lastName',
      order: 'asc',
    });
  });

  it('keeps valid fields and drops hand-edited garbage instead of failing', () => {
    expect(
      parseListQuery(new URLSearchParams('page=abc&limit=20&sortBy=password&search=ada')),
    ).toEqual({
      page: 1,
      limit: 20,
      search: 'ada',
      sortBy: 'lastName',
      order: 'asc',
    });
  });
});
