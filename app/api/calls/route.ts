import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/calls
 * Get all call sessions for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const where: any = { orgId };
    if (status) {
      where.status = status;
    }

    const calls = await db.callSession.findMany({
      where,
      select: {
        id: true,
        incomingNumber: true,
        status: true,
        startTime: true,
        endTime: true,
        duration: true,
        resolution: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch calls',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

