import { NextResponse } from "next/server";

import { CORNERS, type Corner, mirrorCornerHorizontally } from "@/lib/pdf/constants";
import { repositionLabel } from "@/lib/pdf/reposition-label";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCorner(value: string): value is Corner {
  return CORNERS.includes(value as Corner);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const corner = formData.get("corner");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Plik PDF jest wymagany." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Obsługiwane są tylko pliki PDF." }, { status: 400 });
  }

  if (typeof corner !== "string" || !isCorner(corner)) {
    return NextResponse.json({ error: "Wybierz poprawny docelowy róg." }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await repositionLabel(bytes, mirrorCornerHorizontally(corner));
    const outputName = file.name.toLowerCase().endsWith(".pdf")
      ? file.name.replace(/\.pdf$/i, "-repositioned.pdf")
      : `${file.name}-repositioned.pdf`;

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "Nie udało się przetworzyć pliku PDF. Jeśli etykieta zawiera tylko grafikę bez warstwy tekstowej, wykrywanie może wymagać dopracowania.",
      },
      { status: 500 },
    );
  }
}
