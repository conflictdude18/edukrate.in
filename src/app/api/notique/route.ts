import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is missing." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const message = body.message as string | undefined;
    const image = body.image as
      | {
          base64?: string;
          mimeType?: string;
        }
      | undefined;

    if (!message && !image) {
      return NextResponse.json(
        { error: "Message or image is required." },
        { status: 400 }
      );
    }

    if (message && message.length > 15000) {
      return NextResponse.json(
        { error: "Message is too long. Please upload a smaller PDF or shorter text." },
        { status: 400 }
      );
    }

    if (image?.base64 && image.base64.length > 6000000) {
      return NextResponse.json(
        { error: "Image is too large. Please upload a smaller image." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are Notique AI, a free AI study assistant for students on Edukrate.

Always format responses using clean markdown.

Rules:
- Explain in simple student-friendly language.
- Use headings only when useful.
- Use bullet points for steps, summaries, formulas, and key points.
- Keep answers clear, practical, and readable.
- Do not call yourself premium.
- If an image is provided, understand it and help the student with it.
- If the student asks for notes, summaries, explanations, questions, or revision help, respond like a helpful study assistant.
- Avoid unnecessary long answers unless the student asks for detail.

User request:
${message || "Explain this image clearly."}
`;

    const parts: any[] = [prompt];

    if (image?.base64 && image?.mimeType) {
      parts.push({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      });
    }

    const result = await model.generateContent(parts);
    const response = result.response.text();

    return NextResponse.json({
      reply: response,
    });
  } catch (error) {
    console.error("Notique API Error:", error);

    return NextResponse.json(
      { error: "Notique AI failed to respond." },
      { status: 500 }
    );
  }
}