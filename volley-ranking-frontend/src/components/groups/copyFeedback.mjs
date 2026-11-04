export function createCopyFeedback({ write, schedule = setTimeout, cancel = clearTimeout, onCopied, onError }) {
  let busy = false;
  let timer = null;
  function reset() {
    if (timer !== null) cancel(timer);
    timer = null;
    onCopied(false);
  }
  return Object.freeze({
    async copy(value) {
      if (busy) return false;
      busy = true;
      onError("");
      try {
        await write(value);
        reset();
        onCopied(true);
        timer = schedule(() => { timer = null; onCopied(false); }, 2000);
        return true;
      } catch {
        reset();
        onError("No pudimos copiar el enlace. Intentá nuevamente.");
        return false;
      } finally { busy = false; }
    },
    reset,
    dispose: reset,
  });
}
