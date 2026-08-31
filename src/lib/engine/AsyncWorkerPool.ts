export interface Task<TInput, TOutput> {
  id: string;
  data: TInput;
  retries: number;
  maxRetries: number;
  priority?: number;
  submittedAt: number;
  resolve: (value: TOutput) => void;
  reject: (reason: any) => void;
}

export interface DLQEntry<TInput> {
  id: string;
  data: TInput;
  error: string;
  totalAttempts: number;
  failedAt: number;
  stack?: string;
}

export interface WorkerPoolConfig {
  concurrency: number;
  chunkSize: number;
  maxRetries: number;
  baseDelayMs: number;
  maxQueueSize: number;
}

export interface WorkerPoolStats {
  concurrency: number;
  activeWorkers: number;
  queueDepth: number;
  totalTasksSubmitted: number;
  totalTasksProcessed: number;
  totalRetries: number;
  dlqCount: number;
  avgLatencyMs: number;
  throughputOpsSec: number;
}

export class AsyncWorkerPool<TInput, TOutput> {
  private concurrency: number;
  private chunkSize: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxQueueSize: number;

  private queue: Task<TInput, TOutput>[];
  private activeWorkers: number;
  private dlq: DLQEntry<TInput>[];
  private isProcessing: boolean;
  private isShutdown: boolean;

  private stats: {
    totalSubmitted: number;
    totalProcessed: number;
    totalRetries: number;
    totalLatencies: number[];
    startTime: number;
  };

  private workerFn: (input: TInput) => Promise<TOutput>;

  constructor(
    workerFn: (input: TInput) => Promise<TOutput>,
    config?: Partial<WorkerPoolConfig>
  ) {
    this.workerFn = workerFn;
    this.concurrency = config?.concurrency ?? 4;
    this.chunkSize = config?.chunkSize ?? 16;
    this.maxRetries = config?.maxRetries ?? 3;
    this.baseDelayMs = config?.baseDelayMs ?? 10;
    this.maxQueueSize = config?.maxQueueSize ?? 10000;

    this.queue = [];
    this.activeWorkers = 0;
    this.dlq = [];
    this.isProcessing = false;
    this.isShutdown = false;

    this.stats = {
      totalSubmitted: 0,
      totalProcessed: 0,
      totalRetries: 0,
      totalLatencies: [],
      startTime: Date.now()
    };
  }

  public getStats(): WorkerPoolStats {
    const elapsedSec = Math.max(0.001, (Date.now() - this.stats.startTime) / 1000);
    const latencies = this.stats.totalLatencies;
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    return {
      concurrency: this.concurrency,
      activeWorkers: this.activeWorkers,
      queueDepth: this.queue.length,
      totalTasksSubmitted: this.stats.totalSubmitted,
      totalTasksProcessed: this.stats.totalProcessed,
      totalRetries: this.stats.totalRetries,
      dlqCount: this.dlq.length,
      avgLatencyMs: parseFloat(avgLatency.toFixed(2)),
      throughputOpsSec: parseFloat((this.stats.totalProcessed / elapsedSec).toFixed(2))
    };
  }

  public getDLQ(): DLQEntry<TInput>[] {
    return [...this.dlq];
  }

  public clearDLQ(): void {
    this.dlq = [];
  }

  public async submit(data: TInput, id?: string): Promise<TOutput> {
    if (this.isShutdown) {
      throw new Error('Worker pool is shut down');
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Queue overflow. Max capacity (${this.maxQueueSize}) reached.`);
    }

    const taskId = id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.stats.totalSubmitted++;

    return new Promise<TOutput>((resolve, reject) => {
      const task: Task<TInput, TOutput> = {
        id: taskId,
        data,
        retries: 0,
        maxRetries: this.maxRetries,
        submittedAt: Date.now(),
        resolve,
        reject
      };

      this.queue.push(task);
      this.dispatch();
    });
  }

  public async submitBatch(items: TInput[]): Promise<TOutput[]> {
    if (items.length === 0) return [];
    return Promise.all(items.map(item => this.submit(item)));
  }

  private async dispatch(): Promise<void> {
    if (this.isShutdown) return;

    while (this.activeWorkers < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeWorkers++;
      this.executeTask(task).finally(() => {
        this.activeWorkers--;
        this.dispatch();
      });
    }
  }

  private async executeTask(task: Task<TInput, TOutput>): Promise<void> {
    try {
      const result = await this.workerFn(task.data);
      const latency = Date.now() - task.submittedAt;
      this.stats.totalProcessed++;
      this.stats.totalLatencies.push(latency);
      if (this.stats.totalLatencies.length > 500) {
        this.stats.totalLatencies.shift();
      }
      task.resolve(result);
    } catch (err: any) {
      if (task.retries < task.maxRetries) {
        task.retries++;
        this.stats.totalRetries++;
        // Exponential backoff: baseDelayMs * 2^(retries)
        const delay = this.baseDelayMs * Math.pow(2, task.retries - 1);
        await new Promise(res => setTimeout(res, delay));
        this.queue.unshift(task); // Re-queue with high priority
      } else {
        // Exceeded retries -> Route to Dead Letter Queue
        this.dlq.push({
          id: task.id,
          data: task.data,
          error: err?.message || String(err),
          totalAttempts: task.retries + 1,
          failedAt: Date.now(),
          stack: err?.stack
        });
        task.reject(new Error(`Task ${task.id} failed after ${task.retries + 1} attempts: ${err?.message || err}`));
      }
    }
  }

  public async replayDLQ(): Promise<{ replayed: number; errors: number }> {
    const items = [...this.dlq];
    this.dlq = [];
    let replayed = 0;
    let errors = 0;

    for (const item of items) {
      try {
        await this.submit(item.data, item.id);
        replayed++;
      } catch (e) {
        errors++;
      }
    }

    return { replayed, errors };
  }

  public async drain(): Promise<void> {
    while (this.queue.length > 0 || this.activeWorkers > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  public async shutdown(): Promise<void> {
    this.isShutdown = true;
    await this.drain();
  }
}
