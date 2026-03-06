interface AlertProps {
  type: 'success' | 'error';
  message: string;
  onDismiss?: () => void;
}

const styles = {
  success: 'border-green-200 bg-green-50 text-green-700',
  error: 'border-red-200 bg-red-50 text-red-700',
};

export function Alert({ type, message, onDismiss }: AlertProps) {
  if (!message) return null;

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-3 text-current opacity-60 hover:opacity-100"
        >
          &times;
        </button>
      )}
    </div>
  );
}
