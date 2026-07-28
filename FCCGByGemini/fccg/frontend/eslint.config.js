import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', '**/*.backup.*']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // TypeScript의 noUnusedLocals/noUnusedParameters와 strict 검사가 동일 항목을
      // 더 정확히 검사한다. ESLint에서는 중복 진단을 만들지 않는다.
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // 기존 비동기 로더는 의존성을 기계적으로 추가하면 재호출 루프가 생길 수 있다.
      // hooks 호출 순서는 계속 검사하고, 의존성은 기능 모듈 분리 때 함께 정리한다.
      'react-hooks/exhaustive-deps': 'off',
      // 운영 장애 분석용 브라우저 로그를 허용한다.
      'no-console': 'off',
      // 컴포넌트와 관련 훅/상수를 함께 내보내는 기존 모듈 구조를 허용한다.
      'react-refresh/only-export-components': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'error',
      'no-var': 'error'
    },
  },
])
