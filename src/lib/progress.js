/**
 * Progresso globale della cattura (docs + chat + finale).
 * La barra non si resetta tra le fasi: total si accumula.
 */

export function createProgressBus(onProgress = () => {}) {
  let done = 0;
  let total = 0;
  let phase = "start";
  let label = "";

  function emit() {
    onProgress({
      phase,
      current: done,
      total: Math.max(total, 1),
      label,
    });
  }

  return {
    /** Aggiunge unità di lavoro a una fase (non azzera current). */
    beginPhase(nextPhase, units, nextLabel = "") {
      phase = nextPhase;
      total += Math.max(0, units | 0);
      if (nextLabel) label = nextLabel;
      emit();
    },
    step(nextLabel) {
      done += 1;
      if (nextLabel) label = nextLabel;
      // Se abbiamo sottostimato, allarga il totale.
      if (done > total) total = done;
      emit();
    },
    setLabel(nextLabel) {
      label = nextLabel;
      emit();
    },
    complete(nextLabel = "Completato") {
      phase = "done";
      label = nextLabel;
      if (done < total) done = total;
      if (total < 1) total = 1;
      emit();
    },
    snapshot() {
      return { phase, current: done, total, label };
    },
  };
}

/**
 * Pausa cooperativa: i loop attendono gate() tra un pezzo e l'altro.
 * @param {AbortSignal} [signal]
 */
export function createPauseController(signal) {
  let paused = false;
  /** @type {(() => void) | null} */
  let wake = null;

  return {
    get paused() {
      return paused;
    },
    pause() {
      paused = true;
    },
    resume() {
      if (!paused) return;
      paused = false;
      const w = wake;
      wake = null;
      w?.();
    },
    async gate() {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      while (paused) {
        await new Promise((resolve) => {
          wake = resolve;
        });
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
      }
    },
  };
}
