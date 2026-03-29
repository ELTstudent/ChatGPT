import { NextResponse } from "next/server";

import { ReadingRequestSchema, ReadingResponseSchema } from "@/lib/tarot/types";
import { buildReadingPrompt } from "@/services/ai/prompt-builder";
import { readingProvider } from "@/services/ai/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedRequest = ReadingRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz istek. Lütfen seçimlerini kontrol edip tekrar dene.",
          details: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const request = parsedRequest.data;
    const prompt = buildReadingPrompt(request);

    const providerResult = await readingProvider.generateReading({ request, prompt });

    const responseCandidate = {
      success: true,
      reading: providerResult.output,
      cards: request.cards,
      meta: {
        provider: readingProvider.name,
        generatedAt: new Date().toISOString(),
        fallbackUsed: providerResult.fallbackUsed,
      },
    };

    const parsedResponse = ReadingResponseSchema.safeParse(responseCandidate);

    if (!parsedResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Yorum hazırlanırken bir biçim sorunu oluştu.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Şu anda akışa bağlanamadık. Birazdan tekrar deneyebilirsin.",
      },
      { status: 500 },
    );
  }
}
