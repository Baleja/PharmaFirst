'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CallSession {
  id: string;
  incomingNumber: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  resolution?: string;
}

/**
 * Call Logs Page
 * Shows recent call sessions and allows monitoring
 */
export default function CallsPage() {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await fetch('/api/calls');
      const data = await response.json();
      setCalls(data.calls || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800';
      case 'FAILED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Call Logs</h1>
        <p className="text-muted-foreground mt-2">
          View and monitor recent phone calls
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            All incoming and outgoing calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-muted-foreground">No calls found</p>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{call.incomingNumber}</span>
                      <Badge className={getStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(call.startTime).toLocaleString()}
                      {call.duration && ` • ${Math.floor(call.duration / 60)}m ${call.duration % 60}s`}
                    </p>
                    {call.resolution && (
                      <p className="text-xs text-muted-foreground">
                        Resolution: {call.resolution}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/calls/${call.id}`}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

