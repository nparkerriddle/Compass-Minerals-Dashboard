export function LoadingSpinner({ size = 20 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-gray-200 border-t-brand-600"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size={32} />
    </div>
  );
}
