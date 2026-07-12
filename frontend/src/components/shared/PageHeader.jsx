export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
