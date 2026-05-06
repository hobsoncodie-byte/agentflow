type SkeletonBlockProps = {
  className?: string;
};

export default function SkeletonBlock({
  className = "",
}: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-800/80 ${className}`}
    />
  );
}
