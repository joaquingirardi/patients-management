import { PASSWORD } from './fixtures';
import { type TestApp } from './test-app';

export async function login(t: TestApp, email: string): Promise<string> {
  const response = await t
    .http()
    .post('/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return (response.body as { token: string }).token;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
