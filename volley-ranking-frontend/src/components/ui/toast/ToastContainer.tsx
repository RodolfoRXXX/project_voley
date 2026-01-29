import ToastItem from './ToastItem';

export default function ToastContainer({ toasts }: { toasts: any[] }) {
  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
