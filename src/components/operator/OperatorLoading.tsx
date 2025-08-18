export function OperatorLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Booting Operator VM...</p>
        <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
      </div>
    </div>
  );
}