import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildBones, createPet } from "@engine/create";

const CreatePetRequestSchema = z.object({
  source: z.enum(["link", "cli"]),
  sourceUrl: z.string().url().optional(),
  projectContext: z.string().min(1).max(2000),
  mbti: z.object({
    ei: z.enum(["E", "I"]),
    sn: z.enum(["S", "N"]),
    tf: z.enum(["T", "F"]),
    jp: z.enum(["J", "P"]),
  }).optional(),
  timestampMs: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreatePetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400 },
    );
  }

  const { source, sourceUrl, projectContext, mbti, timestampMs } = parsed.data;
  const mbtiAnswers = mbti ?? { ei: "I" as const, sn: "N" as const, tf: "T" as const, jp: "P" as const };

  try {
    const pet = await createPet(source, projectContext, mbtiAnswers, sourceUrl, timestampMs);
    return NextResponse.json({ success: true, data: pet });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
