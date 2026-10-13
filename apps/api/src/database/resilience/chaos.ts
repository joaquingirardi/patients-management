import { sleep } from './retry';

export interface ChaosOptions {
  enabled: boolean;
  /** Probability in [0, 1] that a query fails before reaching the database. */
  failureRate: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

/**
 * Raised before the query is sent (the simulated equivalent of failing to get a connection).
 * Nothing reached the database, so it is safe to retry even for writes.
 */
export class SimulatedDependencyFailure extends Error {
  readonly preExecution = true;

  constructor() {
    super('Simulated database failure (chaos)');
    this.name = 'SimulatedDependencyFailure';
  }
}

/**
 * Random latency and failures injected between the API and its database rather than at the
 * HTTP edge, so the API's retries get exercised and the web app still sees the failures that
 * get through.
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
