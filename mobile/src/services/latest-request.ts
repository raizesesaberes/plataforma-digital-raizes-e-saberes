// Each resource owns its request generation. Cancellation invalidates callbacks;
// it does not pretend that an in-flight HTTP request was physically aborted.
export function createLatestRequest() {
  let generation = 0;
  return {
    cancel() { generation += 1; },
    async run<T>(load: () => Promise<T>, success: (data: T) => void, failure: () => void) {
      const request = ++generation;
      try {
        const data = await load();
        if (request === generation) success(data);
      } catch {
        if (request === generation) failure();
      }
    }
  };
}
