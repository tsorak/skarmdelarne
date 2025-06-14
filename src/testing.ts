export function sleep(n: number) {
  let resolve = (_: unknown) => {};
  const p = new Promise((r) => {
    resolve = r;
  });

  setTimeout(() => resolve(true), n);

  return p;
}

