import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureCompare } from "@/lib/security";

export async function GET(request: Request) {
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
    const status = searchParams.get("status");
    const company = searchParams.get("company");

    const where = {
      ...(status && { status }),
      ...(company && { company }),
    };

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 },
      );
    }

    const updated = await db.invoice.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 },
    );
  }
}
