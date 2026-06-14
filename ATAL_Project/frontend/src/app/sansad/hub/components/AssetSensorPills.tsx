import type { DiagnosticAsset } from "@/services/sansadOutputs";

function tone(status: DiagnosticAsset["sensors"][0]["status"]) {
  if (status === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-zinc-200 bg-zinc-50 text-zinc-800";
}

export default function AssetSensorPills({
  asset,
  className = "",
}: {
  asset?: DiagnosticAsset | null;
  className?: string;
}) {
  if (!asset?.sensors.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {asset.sensors.map((s) => (
        <span
          key={s.label}
          className={`rounded-lg px-2 py-1 border text-[10px] font-mono ${tone(s.status)}`}
        >
          <span className="font-bold uppercase opacity-70">{s.label}: </span>
          {s.value}
        </span>
      ))}
    </div>
  );
}

export function AssetLiveSummary({ asset }: { asset?: DiagnosticAsset | null }) {
  if (!asset) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-500">
      <span>Health {asset.health}%</span>
      {asset.rulHours != null && <span>· RUL {Math.round(asset.rulHours)}h</span>}
      {asset.rulHours == null && asset.rulDays != null && <span>· RUL {Math.round(asset.rulDays * 24)}h</span>}
      {asset.probableFault && !asset.isNormalOperation && (
        <span className="text-amber-700 truncate max-w-[280px]">· {asset.probableFault}</span>
      )}
      {asset.isNormalOperation && <span className="text-emerald-600">· Nominal</span>}
      {asset.faultInjected && (
        <span className="text-amber-700">· Abnormality active</span>
      )}
    </div>
  );
}
