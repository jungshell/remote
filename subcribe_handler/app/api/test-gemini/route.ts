import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Gemini API 테스트용 엔드포인트
 */
export async function GET() {
  const geminiApiKey = process.env.GEMINI_API_KEY

  if (!geminiApiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  const results: any = {
    api_key_set: !!geminiApiKey,
    api_key_length: geminiApiKey.length,
    tested_models: [],
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-flash-latest', 'gemini-2.5-pro']

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent('test')
      const response = result.response
      const text = response.text()

      results.tested_models.push({
        name: modelName,
        status: '✅ 성공',
        response_length: text.length,
      })
    } catch (error: any) {
      results.tested_models.push({
        name: modelName,
        status: '❌ 실패',
        error: error.message || String(error),
        error_code: error.code,
      })
    }
  }

  const workingModels = results.tested_models.filter((m: any) => m.status.includes('✅'))

  return NextResponse.json({
    ...results,
    summary: {
      working_models: workingModels.length,
      recommended_model: workingModels[0]?.name || '없음',
      all_models: modelNames,
    },
  })
}


