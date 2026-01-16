/**
 * runawayJobProtection.js
 * ---------------------------------------------------
 * Background Job Protection System
 * Prevents runaway jobs using timeouts, retries,
 * monitoring, and dead-letter queues.
 *
 * Tech: Node.js
 */

const { EventEmitter } = require("events");

/* ===================================================
   CONFIGURATION
=================================================== */

const JOB_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const MONITOR_INTERVAL_MS = 2000;

/* ===================================================
   JOB STATES
=================================================== */

const JOB_STATE = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  DEAD: "DEAD"
};

/* ===================================================
   JOB CLASS
=================================================== */

class Job {
  constructor(id, handler) {
    this.id = id;
    this.handler = handler;
    this.state = JOB_STATE.PENDING;
    this.retries = 0;
    this.startTime = null;
    this.timeoutRef = null;
    this.lastError = null;
  }
}

/* ===================================================
   DEAD LETTER QUEUE
=================================================== */

class DeadLetterQueue {
  constructor() {
    this.jobs = [];
  }

  add(job) {
    this.jobs.push({
      id: job.id,
      retries: job.retries,
      error: job.lastError,
      failedAt: new Date().toISOString()
    });
  }

  list() {
    return this.jobs;
  }
}

const dlq = new DeadLetterQueue();

/* ===================================================
   JOB MANAGER
=================================================== */

class JobManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
  }

  addJob(id, handler) {
    const job = new Job(id, handler);
    this.jobs.set(id, job);
    this.execute(job);
  }

  async execute(job) {
    job.state = JOB_STATE.RUNNING;
    job.startTime = Date.now();

    console.log(`▶️ Job started: ${job.id}`);

    job.timeoutRef = setTimeout(() => {
      this.fail(job, "Execution timeout");
    }, JOB_TIMEOUT_MS);

    try {
      await job.handler();
      this.complete(job);
    } catch (err) {
      this.fail(job, err.message);
    }
  }

  complete(job) {
    clearTimeout(job.timeoutRef);
    job.state = JOB_STATE.SUCCESS;
    console.log(`✅ Job completed: ${job.id}`);
    this.jobs.delete(job.id);
  }

  fail(job, reason) {
    clearTimeout(job.timeoutRef);
    job.retries += 1;
    job.lastError = reason;

    console.error(
      `❌ Job failed: ${job.id} | Reason: ${reason}`
    );

    if (job.retries > MAX_RETRIES) {
      this.kill(job);
    } else {
      const delay =
        BASE_BACKOFF_MS * Math.pow(2, job.retries - 1);

      console.log(
        `🔁 Retrying job ${job.id} in ${delay}ms`
      );

      setTimeout(() => this.execute(job), delay);
    }
  }

  kill(job) {
    job.state = JOB_STATE.DEAD;
    dlq.add(job);

    console.error(
      `☠️ Job terminated and moved to DLQ: ${job.id}`
    );

    this.jobs.delete(job.id);
  }

  monitor() {
    for (const job of this.jobs.values()) {
      if (job.state === JOB_STATE.RUNNING) {
        const runtime = Date.now() - job.startTime;
        if (runtime > JOB_TIMEOUT_MS) {
          this.fail(job, "Detected runaway job");
        }
      }
    }
  }
}

/* ===================================================
   INITIALIZATION
=================================================== */

const jobManager = new JobManager();

/* ===================================================
   MONITORING LOOP
=================================================== */

setInterval(() => {
  jobManager.monitor();
}, MONITOR_INTERVAL_MS);

/* ===================================================
   SAMPLE JOBS
=================================================== */

// Normal job
jobManager.addJob("job-normal", async () => {
  await new Promise(res => setTimeout(res, 1000));
});

// Failing job
jobManager.addJob("job-fail", async () => {
  throw new Error("Simulated failure");
});

// Runaway job
jobManager.addJob("job-runaway", async () => {
  while (true) {}
});

/* ===================================================
   DEBUG / EXPORTS
=================================================== */

module.exports = {
  jobManager,
  deadLetterQueue: dlq,
  JOB_STATE
};

/* ===================================================git 
   END OF FILE
=================================================== */
