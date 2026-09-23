interface VisitorDotLoaderProps {
  label?: string;
}

export default function VisitorDotLoader({ label = 'Loading' }: VisitorDotLoaderProps) {
  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-label={label}>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#d7f36b] [animation-delay:-.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#d7f36b] [animation-delay:-.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#d7f36b]" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
