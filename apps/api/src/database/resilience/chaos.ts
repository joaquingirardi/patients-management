import { sleep } from './retry';

export interface ChaosOptions {
  enabled: boolean;
  /** Probability in [0, 1] that a query fails before reaching the database. */
  failureRate: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

/**
 * Raised *before* the query is sent — the simulated equivalent of failing to acquire a
 * connection. Because nothing reached the database, it is always safe to retry, even for writes.
 */
export class SimulatedDependencyFailure extends Error {
  readonly preExecution = true;

  constructor() {
    super('Simulated database failure (chaos)');
    this.name = 'SimulatedDependencyFailure';
  }
}

/**
 * Fault injection at the dependency boundary. The task asks to "randomly simulate latency and
 * occasional failures to demonstrate resilience"; injecting them *between the API and its
 * database* (rather than at the HTTP edge) lets us show resilience at both layers: the API
 * retries what is safe to retry, and the web app copes with whatever still gets through.
 */
export class Chaos {
  constructor(
    private readonly options: ChaosOptions,
    private readonly random: () => number = Math.random,
    private readonly wait: (ms: number) => Promise<void> = sleep,
  ) {}

  get enabled(): boolean {
    return this.options.enabled;
  }

  async beforeQuery(): Promise<void> {
    if (!this.options.enabled) return;
    const { minLatencyMs, maxLatencyMs, failureRate } = this.options;
    const latency = minLatencyMs + Math.round(this.random() * (maxLatencyMs - minLatencyMs));
    if (latency > 0) await this.wait(latency);
    if (this.random() < failureRate) throw new SimulatedDependencyFailure();
  }
}
