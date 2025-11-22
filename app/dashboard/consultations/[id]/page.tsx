'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ConsultationDetails {
  id: string;
  type: string;
  patient: {
    name: string;
    phone: string;
    dob: string;
  };
  triageData: any;
  redFlags: string[];
  documentationStatus: string;
  createdAt: string;
}

/**
 * Consultation Detail Page
 * Shows full details of a consultation for pharmacist review
 */
export default function ConsultationDetailPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const [consultation, setConsultation] = useState<ConsultationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (consultationId) {
      fetchConsultation();
    }
  }, [consultationId]);

  const fetchConsultation = async () => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}`);
      const data = await response.json();
      setConsultation(data.consultation);
    } catch (error) {
      console.error('Error fetching consultation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    try {
      const response = await fetch('/api/consultations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          pharmacistId: 'current-user-id', // TODO: Get from auth
          approved,
        }),
      });

      if (response.ok) {
        window.location.href = '/dashboard/consultations';
      }
    } catch (error) {
      console.error('Error approving consultation:', error);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!consultation) {
    return <div className="container mx-auto p-6">Consultation not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consultation Details</h1>
        <p className="text-muted-foreground mt-2">
          Review consultation information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="font-medium">{consultation.patient.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone:</span>
              <p className="font-medium">{consultation.patient.phone}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Date of Birth:</span>
              <p className="font-medium">{consultation.patient.dob}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Condition:</span>
              <p className="font-medium">{consultation.type}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge>{consultation.documentationStatus}</Badge>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created:</span>
              <p className="font-medium">
                {new Date(consultation.createdAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Triage Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
              {JSON.stringify(consultation.triageData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {consultation.redFlags.length > 0 && (
          <Card className="md:col-span-2 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Red Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {consultation.redFlags.map((flag, i) => (
                  <li key={i} className="text-red-700">{flag}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => handleApprove(true)}>
              Approve Consultation
            </Button>
            <Button variant="outline" onClick={() => handleApprove(false)}>
              Reject
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

