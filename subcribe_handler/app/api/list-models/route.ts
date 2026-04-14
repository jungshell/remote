import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * 사용 가능한 Gemini 모델 목록 조회
 */
export async function GET() {
  const geminiApiKey = process.env.GEMINI_API_KEY

  if (!geminiApiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    
    // ListModels API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: '모델 목록 조회 실패',
          status: response.status,
          statusText: response.statusText,
          details: errorText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // generateContent를 지원하는 모델만 필터링
    const availableModels = data.models
      ?.filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent')
      )
      .map((model: any) => ({
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        supportedMethods: model.supportedGenerationMethods,
      })) || []

    return NextResponse.json({
      success: true,
      total_models: data.models?.length || 0,
      available_models: availableModels,
      recommended: availableModels[0]?.name || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: '모델 목록 조회 중 오류 발생',
        message: error.message || String(error),
      },
      { status: 500 }
    )
  }
}


