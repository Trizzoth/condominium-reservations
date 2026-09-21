import { ListSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="animate-pulse rounded-md bg-muted h-8 w-56" aria-hidden />
        <div className="animate-pulse rounded-md bg-muted h-4 w-80" aria-hidden />
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}
