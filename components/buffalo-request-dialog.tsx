'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Beer } from 'lucide-react';
import { toast } from 'sonner';

type BuffaloRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: Profile;
  onSuccess?: () => void;
};

export function BuffaloRequestDialog({
  open,
  onOpenChange,
  recipient,
  onSuccess,
}: BuffaloRequestDialogProps) {
  const { user, profile } = useAuth();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user || !profile) return;

    setSubmitting(true);

    const currentYear = new Date().getFullYear();

    const { data: existing } = await supabase
      .from('buffalo_requests')
      .select('*')
      .eq('requester_id', user.id)
      .eq('recipient_id', recipient.id)
      .eq('year', currentYear)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      toast.error('You already have a pending request for this person');
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from('buffalo_requests').insert({
      requester_id: user.id,
      recipient_id: recipient.id,
      year: currentYear,
      note: note.trim() || null,
      status: 'pending',
    });

    if (insertError) {
      toast.error('Failed to send buffalo request');
      setSubmitting(false);
      return;
    }

    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: recipient.id,
      type: 'buffalo_request',
      title: 'New Buffalo Request',
      message: `${profile.display_name} wants to add a buffalo on you${note.trim() ? `: "${note.trim()}"` : ''}`,
      link: `/player/${user.id}`,
      read: false,
    });

    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    await supabase.from('feed_events').insert({
      event_type: 'buffalo_request',
      user_id: user.id,
      related_user_id: recipient.id,
      year: currentYear,
      title: `${profile.display_name} requested a buffalo on ${recipient.display_name}`,
      description: note.trim() || 'Buffalo request sent',
    });

    toast.success(`Buffalo request sent to ${recipient.display_name}!`);
    setNote('');
    setSubmitting(false);
    onOpenChange(false);
    if (onSuccess) onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beer className="w-5 h-5 text-amber-500" />
            Request Buffalo on {recipient.display_name}
          </DialogTitle>
          <DialogDescription>
            They'll need to accept your request before the buffalo is added
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note">Add a note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why you're calling buffalo..."
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-zinc-400">{note.length}/200 characters</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                setNote('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 button-press"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Beer className="w-4 h-4 mr-2" />
              {submitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
