type AccountInitializationErrorProps = {
  message: string | null;
  onRetry: () => void;
};

export default function AccountInitializationError({
  message,
  onRetry,
}: AccountInitializationErrorProps) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-6">
      <section
        role="alert"
        aria-live="assertive"
        className="w-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-900"
      >
        <h1 className="text-lg font-semibold">No pudimos inicializar tu cuenta</h1>
        <p className="mt-2 text-sm">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
