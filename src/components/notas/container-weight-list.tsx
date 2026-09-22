import type { WeighingMethod } from "@/lib/transactions";
import { cn } from "@/lib/utils";

type ContainerWeightListProps = {
  weighingMethod: WeighingMethod;
  weights: number[];
  grossWeightKg: number;
  /** A non-sensitive explanation for incomplete legacy allocation data. */
  message?: string;
  thermal?: boolean;
};

export function ContainerWeightList({ weighingMethod, weights, grossWeightKg, message, thermal = false }: ContainerWeightListProps) {
  if (weighingMethod === "TOTAL_LANGSUNG") return null;

  const label = weighingMethod === "PER_KARUNG" ? "Karung" : "Peti";
  const shortLabel = weighingMethod === "PER_KARUNG" ? "Krg" : "Peti";
  const totalContainerWeight = weights.reduce((total, weight) => total + weight, 0);
  const totalMatchesGross = totalContainerWeight === grossWeightKg;

  if (thermal) {
    return <div className="mt-2 break-inside-avoid border-y border-dashed border-black py-1.5 text-[11px]">
      {weights.map((weight, index) => <div className="flex justify-between gap-3 py-0.5" key={`${label}-${index + 1}`}><span>{shortLabel} {index + 1}</span><strong>{weight} kg</strong></div>)}
      {!weights.length && <p>Rincian {label.toLowerCase()} tidak tersedia.</p>}
      {weights.length > 0 && <p className="mt-1 font-bold">Total {label.toLowerCase()} {totalContainerWeight} kg{totalMatchesGross ? "" : ` dari ${grossWeightKg} kg fisik`}</p>}
      {message && <p className="mt-1 font-bold">{message}</p>}
    </div>;
  }

  return <div className="mt-3 break-inside-avoid rounded-lg border border-tj-border bg-tj-canvas px-3 py-2.5">
    <p className="text-xs font-semibold text-tj-text">Rincian {label.toLowerCase()}</p>
    {weights.length > 0 ? <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
      {weights.map((weight, index) => <div className="flex items-center justify-between gap-3 text-xs" key={`${label}-${index + 1}`}><span className="text-tj-muted">{label} {index + 1}</span><strong className="text-tj-text">{weight} kg</strong></div>)}
    </div> : <p className="mt-1.5 text-xs text-tj-muted">Rincian {label.toLowerCase()} tidak tersedia.</p>}
    {weights.length > 0 && <p className="mt-2 border-t border-tj-border pt-2 text-xs font-semibold text-tj-text">Total {label.toLowerCase()} {totalContainerWeight} kg{totalMatchesGross ? "" : ` dari ${grossWeightKg} kg fisik`}</p>}
    {message && <p className={cn("mt-2 text-xs font-medium text-tj-warning", thermal && "font-bold")}>{message}</p>}
  </div>;
}
