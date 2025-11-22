import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/consultations
 * Get all consultations for the current organization
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
      where.documentationStatus = status;
    }

    const consultations = await db.consultation.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            dob: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({
      consultations: consultations.map((c) => ({
        id: c.id,
        type: c.type,
        patient: c.patient,
        documentationStatus: c.documentationStatus,
        redFlags: c.redFlags,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch consultations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

