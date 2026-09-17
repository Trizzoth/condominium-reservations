export default function SecurityLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true" aria-label="Cargando">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
