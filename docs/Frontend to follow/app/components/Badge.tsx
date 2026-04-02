interface BadgeProps {
  name: string;
  icon: string;
  description: string;
}

export function Badge({ name, icon, description }: BadgeProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer group">
      <div className="size-12 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-zinc-100 capitalize">{name}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
    </div>
  );
}
