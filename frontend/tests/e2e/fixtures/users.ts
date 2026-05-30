/**
 * USCP V2 E2E 테스트용 사용자 fixture.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §6 (역할 정의)
 *
 * 4종 역할:
 *  - citizen : 일반 시민 회원 (회원가입 기본값)
 *  - operator: 운영자 (지역사회특화센터 실무 담당자)
 *  - mentor  : 멘토 (citizen 위 add-on, operator 가 부여)
 *  - student : 학생팀 (citizen 위 add-on, operator 가 편성)
 *
 * 본 fixture 는 `seed.ts` 의 ensureTestUsers() 로 DB 에 미리 시드된 사용자와 매칭.
 * 환경 변수로 비밀번호 override 가능 (CI 시크릿 활용).
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'citizen' | 'operator' | 'mentor' | 'student';
  /** seed.ts 에서 부여될 user_id (테스트 도중 사용 시 fetch). */
  id?: string;
}

const PW = process.env.E2E_TEST_USER_PASSWORD ?? 'TestPassw0rd!';

export const testCitizen: TestUser = {
  email: 'citizen@uscp-e2e.local',
  password: PW,
  name: '김시민',
  role: 'citizen',
};

export const testOperator: TestUser = {
  email: 'operator@uscp-e2e.local',
  password: PW,
  name: '이운영',
  role: 'operator',
};

export const testMentor: TestUser = {
  email: 'mentor@uscp-e2e.local',
  password: PW,
  name: '박멘토',
  role: 'mentor',
};

export const testStudent: TestUser = {
  email: 'student@uscp-e2e.local',
  password: PW,
  name: '최학생',
  role: 'student',
};

export const ALL_TEST_USERS: ReadonlyArray<TestUser> = [
  testCitizen,
  testOperator,
  testMentor,
  testStudent,
];

/** 잘못된 자격 증명 (Error Path 테스트용). */
export const invalidCredentials = {
  email: 'nonexistent@uscp-e2e.local',
  password: 'WrongPassword123!',
} as const;
