interface BadgeProps {
  text: string;
  className: string;
}

export function Badge({ text, className }: BadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}
