export default function DashboardLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary rounded-full animate-spin border-t-transparent" />
        </div>
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    </div>
  );
}
