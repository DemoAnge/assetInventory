import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TONE_DOT, type ConditionTone } from "./dashboardUtils";

export interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: ConditionTone;
}

export function EventTimeline({ events, loading }: { events: TimelineEvent[]; loading: boolean }) {
  return (
    <section aria-label="Bitácora y mantenimiento" className="min-h-[280px] rounded-panel border border-line bg-surface p-4">
      <h2 className="text-sm font-medium text-fx-100">Bitácora</h2>
      <p className="text-[12px] text-fx-500 mt-0.5">Altas recientes y órdenes de mantenimiento</p>
      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-fx-900 rounded-control" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="mt-8 text-sm text-fx-500">Sin eventos. Las altas y las OT aparecen aquí en orden cronológico.</p>
      ) : (
        <ol className="mt-3 max-h-56 overflow-y-auto">
          {events.map((ev) => (
            <li key={ev.id} className="flex gap-3 py-2 border-b border-fx-800 last:border-b-0">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[ev.tone]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-fx-100 truncate">{ev.title}</p>
                <p className="text-[11px] text-fx-500 truncate">{ev.detail}</p>
              </div>
              <time className="shrink-0 font-mono text-[11px] tabular-nums text-fx-500" dateTime={ev.at}>
                {format(new Date(ev.at), "dd MMM HH:mm", { locale: es })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
