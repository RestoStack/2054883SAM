export function EmptyTenantState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {description ?? "This section starts empty for every new restaurant account. Real activity for your venue will show up here."}
      </p>
    </div>
  );
}
