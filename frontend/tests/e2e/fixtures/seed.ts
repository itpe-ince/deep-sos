/**
 * E2E 테스트 사용자 시드 보장.
 *
 * CI 환경: backend/scripts/seed_e2e.py 가 CI job에서 자동 실행.
 * 로컬 환경: 아래 함수를 beforeAll에서 호출하여 API를 통해 시드.
 *
 * 현재는 CI seed_e2e.py에 의존하므로 이 파일은 로컬 fallback용.
 */
import { STUDENT, type TestUser } from './auth';

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3810/api/v1';

/**
 * 테스트 사용자가 없으면 회원가입 API로 생성.
 * 이미 존재하면 409를 무시한다.
 */
export async function ensureTestUser(user: TestUser = STUDENT): Promise<void> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      name: user.name,
      role: 'student',
    }),
  });

  if (res.ok) {
    console.log(`Test user '${user.email}' created via API.`);
  } else if (res.status === 409) {
    console.log(`Test user '${user.email}' already exists.`);
  } else {
    console.warn(`Seed user failed: ${res.status} ${await res.text()}`);
  }
}
