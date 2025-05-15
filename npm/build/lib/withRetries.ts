export const withRetries =
  <T, Args extends readonly any[]>(
    action: (...args: Args) => Promise<T>,
    retries = 3
  ): ((...args: Args) => Promise<T>) =>
  async (...args) => {
    let lastError: any;
    for (let i = 1; i < retries; i++) {
      try {
        return await action(...args);
      } catch (e) {
        lastError = e;
        console.warn(`Operation failed on attempt #${i}`, e);
        await new Promise<void>((r) => setTimeout(() => r(), 100));
      }
    }

    throw lastError!;
  };
