import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useRestaurant, useUpdateRestaurant } from "@/hooks/use-restaurant";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Clock, Globe, Bell, CreditCard, Users, Shield, Plug, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — RestoStack" }] }),
});

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Configure your restaurant, team, and integrations" />
      <Tabs defaultValue="restaurant" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="restaurant" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Restaurant</TabsTrigger>
          <TabsTrigger value="hours" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Hours</TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> Channels</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Billing</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Team</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5"><Plug className="h-3.5 w-3.5" /> Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant"><RestaurantSettings /></TabsContent>
        <TabsContent value="hours"><HoursSettings /></TabsContent>
        <TabsContent value="channels"><ChannelsSettings /></TabsContent>
        <TabsContent value="notifications"><NotificationSettings /></TabsContent>
        <TabsContent value="billing"><BillingSettings /></TabsContent>
        <TabsContent value="team"><TeamSettings /></TabsContent>
        <TabsContent value="security"><SecuritySettings /></TabsContent>
        <TabsContent value="integrations"><IntegrationSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function RestaurantSettings() {
  const { data: restaurant, isLoading } = useRestaurant();
  const update = useUpdateRestaurant();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (restaurant && !initialized) {
    setName(restaurant.name || "");
    setPhone(restaurant.phone || "");
    setEmail(restaurant.email || "");
    setAddress(restaurant.address || "");
    setCuisine(restaurant.cuisine_type || "");
    setInitialized(true);
  }

  const handleSave = () => {
    update.mutate(
      { name, phone, email, address, cuisine_type: cuisine },
      { onSuccess: () => toast.success("Restaurant settings saved") }
    );
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-2"><Label>Restaurant Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      <div className="space-y-2"><Label>Cuisine Type</Label><Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} /></div>
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select defaultValue={restaurant?.timezone || "America/New_York"}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
            <SelectItem value="America/Chicago">Central (CT)</SelectItem>
            <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select defaultValue={restaurant?.currency || "USD"}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD ($)</SelectItem>
            <SelectItem value="EUR">EUR (€)</SelectItem>
            <SelectItem value="GBP">GBP (£)</SelectItem>
            <SelectItem value="CAD">CAD ($)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={update.isPending}>
        {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}

function HoursSettings() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (
    <div className="max-w-lg space-y-3">
      {days.map((day) => (
        <div key={day} className="flex items-center gap-4">
          <span className="w-24 text-sm font-medium">{day}</span>
          <Input type="time" defaultValue="11:00" className="w-32" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="time" defaultValue="22:00" className="w-32" />
          <Switch defaultChecked={day !== "Monday"} />
        </div>
      ))}
      <Button className="mt-4" onClick={() => toast.success("Hours updated")}>Save Hours</Button>
    </div>
  );
}

function ChannelsSettings() {
  const channels = [
    { name: "Dine-in", desc: "Walk-in and reserved tables", enabled: true },
    { name: "Takeout", desc: "Customer pickup orders", enabled: true },
    { name: "Delivery", desc: "Direct delivery orders", enabled: true },
    { name: "Online Ordering", desc: "Website & app orders", enabled: true },
    { name: "DoorDash", desc: "Third-party delivery", enabled: false },
    { name: "Uber Eats", desc: "Third-party delivery", enabled: false },
    { name: "Grubhub", desc: "Third-party delivery", enabled: false },
  ];
  return (
    <div className="max-w-lg space-y-4">
      {channels.map((ch) => (
        <div key={ch.name} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{ch.name}</p>
            <p className="text-xs text-muted-foreground">{ch.desc}</p>
          </div>
          <Switch defaultChecked={ch.enabled} />
        </div>
      ))}
      <Button className="mt-2" onClick={() => toast.success("Channel settings saved")}>Save Channels</Button>
    </div>
  );
}

function NotificationSettings() {
  const settings = [
    { label: "New order alerts", desc: "Push notification for incoming orders" },
    { label: "Low inventory warnings", desc: "Alert when items fall below threshold" },
    { label: "Reservation reminders", desc: "Notify staff of upcoming reservations" },
    { label: "Review alerts", desc: "New review notifications" },
    { label: "Daily sales summary", desc: "End-of-day email report" },
    { label: "Staff shift reminders", desc: "Notify staff before their shift" },
    { label: "Marketing campaign results", desc: "Campaign performance emails" },
  ];
  return (
    <div className="max-w-lg space-y-4">
      {settings.map((s) => (
        <div key={s.label} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
          <Switch defaultChecked />
        </div>
      ))}
      <Button className="mt-2" onClick={() => toast.success("Notification preferences saved")}>Save Preferences</Button>
    </div>
  );
}

function BillingSettings() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Pro Plan</p>
            <p className="text-sm text-muted-foreground">$149/month · Billed monthly</p>
          </div>
          <Badge>Active</Badge>
        </div>
        <Separator />
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Next billing date</span><span>April 1, 2026</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payment method</span><span>•••• 4242</span></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Change Plan</Button>
          <Button variant="outline" size="sm">Update Payment</Button>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Invoices</h3>
        {["Mar 2026 — $149.00", "Feb 2026 — $149.00", "Jan 2026 — $149.00"].map((inv) => (
          <div key={inv} className="flex items-center justify-between py-2 border-b text-sm">
            <span>{inv}</span>
            <Button variant="ghost" size="sm">Download</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSettings() {
  const { profile } = useAuth();
  const members = [
    { name: profile?.full_name || "You", email: "owner@restaurant.com", role: "Owner" },
  ];
  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Team Members</h3>
        <Button size="sm" onClick={() => toast.info("Invite dialog coming soon")}>Invite Member</Button>
      </div>
      {members.map((m) => (
        <div key={m.email} className="flex items-center justify-between py-2 border-b">
          <div>
            <p className="text-sm font-medium">{m.name}</p>
            <p className="text-xs text-muted-foreground">{m.email}</p>
          </div>
          <Badge variant="secondary">{m.role}</Badge>
        </div>
      ))}
      <div className="pt-4">
        <h3 className="font-semibold mb-2">Roles & Permissions</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Owner</strong> — Full access to all features and billing</p>
          <p><strong className="text-foreground">Manager</strong> — Manage operations, staff, and reports</p>
          <p><strong className="text-foreground">Staff</strong> — POS, floor plan, and order management</p>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Change Password</h3>
        <div className="space-y-2"><Label>Current Password</Label><Input type="password" /></div>
        <div className="space-y-2"><Label>New Password</Label><Input type="password" /></div>
        <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" /></div>
        <Button onClick={() => toast.success("Password updated")}>Update Password</Button>
      </div>
      <Separator />
      <div className="space-y-4">
        <h3 className="font-semibold">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Enable 2FA</p>
            <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
          </div>
          <Switch />
        </div>
      </div>
      <Separator />
      <div className="space-y-4">
        <h3 className="font-semibold">Session Management</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Current Session</p>
            <p className="text-xs text-muted-foreground">Chrome on macOS · Active now</p>
          </div>
          <Badge variant="secondary">Current</Badge>
        </div>
      </div>
    </div>
  );
}

function IntegrationSettings() {
  const integrations = [
    { name: "Square POS", desc: "Payment processing & hardware", connected: false },
    { name: "Stripe", desc: "Online payments", connected: false },
    { name: "Toast", desc: "POS sync", connected: false },
    { name: "DoorDash Drive", desc: "Delivery logistics", connected: false },
    { name: "Mailchimp", desc: "Email marketing sync", connected: false },
    { name: "Google Business", desc: "Reviews & listings", connected: false },
    { name: "QuickBooks", desc: "Accounting sync", connected: false },
    { name: "Slack", desc: "Team notifications", connected: false },
  ];
  return (
    <div className="max-w-lg space-y-4">
      {integrations.map((int) => (
        <div key={int.name} className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="text-sm font-medium">{int.name}</p>
            <p className="text-xs text-muted-foreground">{int.desc}</p>
          </div>
          <Button
            variant={int.connected ? "outline" : "default"}
            size="sm"
            onClick={() => toast.info(`${int.connected ? "Disconnect" : "Connect"} ${int.name} — coming soon`)}
          >
            {int.connected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      ))}
    </div>
  );
}
