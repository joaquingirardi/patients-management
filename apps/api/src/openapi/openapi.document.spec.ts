import { buildOpenApiDocument } from './openapi.document';

describe('OpenAPI document', () => {
  const doc = buildOpenApiDocument();

  it('documents every endpoint of the API contract with the right verbs', () => {
    const routes = Object.entries(doc.paths).flatMap(([path, item]) =>
      Object.keys(item)
        .filter((key) => ['get', 'post', 'put', 'delete'].includes(key))
        .map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(routes).toEqual(
      expect.arrayContaining([
        'POST /auth/login',
        'GET /patients',
        'POST /patients',
        'GET /patients/{id}',
        'PUT /patients/{id}',
        'DELETE /patients/{id}',
      ]),
    );
  });

  it('marks login and health public and everything else bearer-protected', () => {
    expect(doc.security).toEqual([{ bearer: [] }]);
    expect(doc.paths['/auth/login'].post.security).toEqual([]);
    expect(doc.paths['/health'].get.security).toEqual([]);
  });

  it('derives request schemas from the shared contract', () => {
    const input = doc.components.schemas.PatientInput as { required: string[] };
    expect(input.required.sort()).toEqual(['dob', 'email', 'firstName', 'lastName', 'phoneNumber']);
    const update = doc.components.schemas.UpdatePatient as { properties: Record<string, unknown> };
    expect(update.properties).toHaveProperty('version');
  });

  it('exposes the list query parameters', () => {
    const names = doc.paths['/patients'].get.parameters.map((p) => p.name).sort();
    expect(names).toEqual(['limit', 'order', 'page', 'search', 'sortBy']);
  });
});
