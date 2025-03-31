async function waitUntil(cond: () => boolean, intervalMs = 100): Promise<void> {
  return new Promise((resolve) => {
    if (cond()) { resolve() }
    else {
      const interval = setInterval(() => {
        if (cond()) {
          clearInterval(interval);
          resolve();
        }
      }, intervalMs);
    }
  })
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* getEarliestOfAsyncIterators<T>(...iterators: AsyncIterator<T>[]): AsyncGenerator<T> {
  while (true) {
    const promises: Promise<{ iterator: AsyncIterator<T> } & IteratorResult<T>>[] = []
    for (const i of iterators) {
      promises.push(i.next().then((d) => {
        return { iterator: i, ...d }
      }))
    }
    const v = await Promise.any(promises)
    if (v.done) {
      iterators = iterators.filter((i) => i !== v.iterator)
      if (iterators.length === 0) return;
    }
    yield v.value;
  }
}

export { waitUntil, sleep, getEarliestOfAsyncIterators }