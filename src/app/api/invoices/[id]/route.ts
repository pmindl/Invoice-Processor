import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureCompare } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.APP_API_KEY) {
    console.error("CRITICAL: APP_API_KEY is not defined in the environment.");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get("key");

  const isValidHeader = authHeader
    ? secureCompare(authHeader, `Bearer ${process.env.APP_API_KEY}`)
    : false;
  const isValidApiKey = apiKeyHeader
    ? secureCompare(apiKeyHeader, process.env.APP_API_KEY)
    : false;
  const isValidQuery = queryKey
    ? secureCompare(queryKey, process.env.APP_API_KEY)
    : false;

  if (!isValidHeader && !isValidApiKey && !isValidQuery) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const invoice = await db.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice detail" },
      { status: 500 },
    );
  }
}
