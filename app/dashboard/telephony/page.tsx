'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Telephony Settings Page
 * Allows pharmacy to purchase phone numbers, configure SIP trunks, and test calls
 */
export default function TelephonyPage() {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handlePurchaseNumber = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/telephony/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: 'GB' }),
      });

      const data = await response.json();
      if (data.success) {
        setPhoneNumber(data.phoneNumber);
        setStatus('Phone number purchased successfully');
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCall = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/telephony/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();
      setStatus(data.message || 'Test call initiated');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Telephony Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure phone numbers and SIP trunks for your pharmacy
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phone Number</CardTitle>
            <CardDescription>Purchase and manage your pharmacy phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Current Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+44 20 1234 5678"
                disabled
              />
            </div>
            <Button onClick={handlePurchaseNumber} disabled={isLoading}>
              {isLoading ? 'Purchasing...' : 'Purchase UK Number'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Call</CardTitle>
            <CardDescription>Test your phone number configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTestCall} disabled={isLoading || !phoneNumber}>
              {isLoading ? 'Initiating...' : 'Initiate Test Call'}
            </Button>
            {status && (
              <div className="p-3 bg-muted rounded-md text-sm">{status}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SIP Trunk Status</CardTitle>
            <CardDescription>Monitor your SIP trunk connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Inbound URI</span>
                <span className="text-sm font-mono">sip:trunk@livekit.io</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Diagnostics</CardTitle>
            <CardDescription>View recent call logs and diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard/calls'}>
              View Call Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

