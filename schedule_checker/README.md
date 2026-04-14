# AutoFlow / 스케줄 체커

업무·스케줄 관리 웹앱 (Next.js + Firebase).

## 앱 실행해서 화면 보기 (한 번에 실행 + 브라우저 열기)

- **F5** 키를 누르면 개발 서버가 켜지고, 준비되면 브라우저가 자동으로 http://localhost:4000 을 엽니다.  
  (처음 한 번은 "AutoFlow 실행 (개발 서버 + 브라우저)" 를 선택하면 됩니다.)
- 자세한 단계는 프로젝트 루트의 **[실행_방법.md](실행_방법.md)** 에 정리해 두었습니다.

## 지금까지 개발된 내용 보기

- **브라우저에서 보기**: 앱을 실행한 뒤(위 방법) 페이지에서 각 **파일명을 클릭**하면 해당 설정/규칙 내용이 펼쳐집니다.
- **코드에서 보기**: **[src/app/page.tsx](src/app/page.tsx)** 파일을 열면 개발 현황 페이지 구조와 표시되는 파일 목록을 볼 수 있습니다.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:4000](http://localhost:4000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
