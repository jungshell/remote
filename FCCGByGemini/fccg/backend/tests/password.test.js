const { generateTempPassword } = require('../dist/utils/password');

describe('generateTempPassword', () => {
  test('요청한 길이와 혼동 방지 문자 집합을 사용한다', () => {
    const password = generateTempPassword(16);
    expect(password).toHaveLength(16);
    expect(password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%]+$/);
  });

  test('기본 길이는 12자다', () => {
    expect(generateTempPassword()).toHaveLength(12);
  });
});
