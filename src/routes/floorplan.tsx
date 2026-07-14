import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { FloorplanDesigner } from "@/components/FloorplanDesigner";
import { Grid3x3, Loader2 } from "lucide-react";

export const Route = createFileRoute("/floorplan")({
  head: () => ({ meta: [{ title: "Floor plan — RestoStack" }] }),
  component: FloorplanPage,
});

function FloorplanPage() {
  const { staff, loading } = useAuth();
  return (
    <AppShell>
      <PageHeader
        title="Floor plan designer"
        description="Drag your tables to match your dining room layout. Guests and staff use this on the Host Stand."
        icon={Grid3x3}
      />
      <div className="p-4 lg:p-5">
        {loading || !staff ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : (
          <FloorplanDesigner restaurantId={staff.restaurant_id} />
        )}
      </div>
    </AppShell>
  );
}
