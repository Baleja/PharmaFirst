import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/consultations/[id]
 * Get a specific consultation by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const consultation = await db.consultation.findUnique({
      where: { id },
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
        pharmacist: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    return NextResponse.json({ consultation });
  } catch (error) {
    console.error('Error fetching consultation:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch consultation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

