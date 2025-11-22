import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DocumentationStatus } from '@prisma/client';
import { sendConsultationConfirmation } from '@/lib/sms/send';

/**
 * POST /api/consultations/approve
 * Pharmacist approval endpoint for consultations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, pharmacistId, approved, notes } = body;

    if (!consultationId || !pharmacistId) {
      return NextResponse.json(
        { error: 'consultationId and pharmacistId are required' },
        { status: 400 }
      );
    }

    // Get consultation
    const consultation = await db.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        organization: true,
        pharmacist: true,
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Update consultation
    const updatedConsultation = await db.consultation.update({
      where: { id: consultationId },
      data: {
        pharmacistId,
        documentationStatus: approved ? DocumentationStatus.APPROVED : DocumentationStatus.REJECTED,
        metadata: {
          ...(consultation.metadata as Record<string, any>),
          approvalNotes: notes,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    // Send SMS confirmation to patient
    if (approved && consultation.patient.phone) {
      const triageData = consultation.triageData as any;
      await sendConsultationConfirmation(consultation.patient.phone, {
        condition: consultation.type,
        status: 'approved',
        pharmacyName: consultation.organization.name,
        pickupTime: triageData?.deliveryOption === 'PICKUP' ? '5:00 PM' : undefined,
        deliveryDate:
          triageData?.deliveryOption === 'STANDARD'
            ? 'in 2-3 business days'
            : triageData?.deliveryOption === 'NEXT_DAY'
            ? 'tomorrow'
            : triageData?.deliveryOption === 'SAME_DAY'
            ? 'today'
            : undefined,
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: pharmacistId,
        action: approved ? 'consultation.approved' : 'consultation.rejected',
        resourceType: 'Consultation',
        resourceId: consultationId,
        details: {
          consultationType: consultation.type,
          notes,
        },
      },
    });

    return NextResponse.json({
      success: true,
      consultation: updatedConsultation,
    });
  } catch (error) {
    console.error('Error approving consultation:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve consultation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

