import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Clock, Phone, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useWaitlist, useAddWaitlistEntry, useSeatWaitlistEntry, useCancelWaitlistEntry, type WaitlistEntry } from "@/hooks/use-waitlist";
import { useTables } from "@/hooks/use-tables";

export const Route = createFileRoute("/host-stand")({
  head: () => ({ meta: [{ title: "Host Stand — RestoStack" }] }),
  component: HostStandPage,
});

function HostStandPage() {
  const { data: waitlist = [], isLoading } = useWaitlist();
  const { data: tables = [] } = useTables();
  const addEntry = useAddWaitlistEntry();
  const seatEntry = useSeatWaitlistEntry();
  const cancelEntry = useCancelWaitlistEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [phone, setPhone] = useState("");
  const [quotedWait, setQuotedWait] = useState("15");

  const waiting = waitlist.filter((e) => e.status === "waiting" || e.status === "notified");
  const availableTables = tables.filter((t) => t.status === "available");

  const handleAdd = () => {
    if (!name.trim()) return;
    addEntry.mutate(
      {
        guest_name: name.trim(),
        party_size: parseInt(partySize) || 2,
        phone: phone || undefined,
        quoted_wait_minutes: parseInt(quotedWait) || 15,
      },
      {
        onSuccess: () => {
          toast.success(`${name} added to waitlist`);
          setDialogOpen(false);
          setName("");
          setPartySize("2");
          setPhone("");
          setQuotedWait("15");
        },
      }
    );
  };

  const handleSeat = (entry: WaitlistEntry) => {
    const matchingTable = availableTables.find((t) => t.capacity >= entry.party_size);
    if (!matchingTable) {
      toast.error("No available table for this party size");
      return;
    }
    seatEntry.mutate(
      { id: entry.id, tableId: matchingTable.id },
      { onSuccess: () => toast.success(`${entry.guest_name} seated at Table ${matchingTable.number}`) }
    );
  };

  const handleCancel = (entry: WaitlistEntry) => {
    cancelEntry.mutate(entry.id, {
      onSuccess: () => toast.success(`${entry.guest_name} removed from waitlist`),
    });
  };

  const waitTime = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return "Just now";
    return `${mins} min`;
  };

  return (
    <div>
      <PageHeader
        title="Host Stand"
        description="Manage the waitlist and seat arriving guests"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add to Waitlist
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Waiting</p>
          <p className="text-2xl font-bold mt-1">{waiting.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available Tables</p>
          <p className="text-2xl font-bold mt-1">{availableTables.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg Wait</p>
          <p className="text-2xl font-bold mt-1">
            {waiting.length > 0
              ? `${Math.round(waiting.reduce((s, e) => s + (e.quoted_wait_minutes || 15), 0) / waiting.length)} min`
              : "—"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : waiting.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No guests on the waitlist</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
            Add First Guest
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {waiting.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{entry.guest_name}</p>
                  {entry.status === "notified" && <Badge variant="secondary">Notified</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {entry.party_size}</span>
                  {entry.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {entry.phone}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {waitTime(entry.created_at)}</span>
                  {entry.quoted_wait_minutes && <span>Quoted: {entry.quoted_wait_minutes} min</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSeat(entry)} disabled={seatEntry.isPending}>
                  Seat
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleCancel(entry)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Waitlist</DialogTitle>
            <DialogDescription>Add a walk-in guest to the waitlist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Guest Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Party Size</Label>
                <Select value={partySize} onValueChange={setPartySize}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quoted Wait (min)</Label>
                <Select value={quotedWait} onValueChange={setQuotedWait}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30, 45, 60].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!name.trim() || addEntry.isPending}>
              {addEntry.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
