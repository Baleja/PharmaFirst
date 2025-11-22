'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Consultation {
  id: string;
  type: string;
  patient: {
    name: string;
    phone: string;
  };
  documentationStatus: string;
  createdAt: string;
  redFlags: string[];
}

/**
 * Consultations Dashboard
 * Shows pending consultations requiring pharmacist approval
 */
export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      const response = await fetch('/api/consultations');
      const data = await response.json();
      setConsultations(data.consultations || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (consultationId: string, approved: boolean) => {
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
        fetchConsultations(); // Refresh list
      }
    } catch (error) {
      console.error('Error approving consultation:', error);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  const pendingConsultations = consultations.filter(
    (c) => c.documentationStatus === 'PENDING_APPROVAL'
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consultations</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve patient consultations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval ({pendingConsultations.length})</CardTitle>
          <CardDescription>
            Consultations awaiting pharmacist review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingConsultations.length === 0 ? (
            <p className="text-muted-foreground">No pending consultations</p>
          ) : (
            <div className="space-y-4">
              {pendingConsultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{consultation.patient.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {consultation.type} • {consultation.patient.phone}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(consultation.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">{consultation.documentationStatus}</Badge>
                  </div>

                  {consultation.redFlags.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm font-medium text-red-800">Red Flags:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {consultation.redFlags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(consultation.id, true)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(consultation.id, false)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/dashboard/consultations/${consultation.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

