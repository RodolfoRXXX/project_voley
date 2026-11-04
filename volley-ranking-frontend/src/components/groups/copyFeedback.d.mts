export function createCopyFeedback(options: {
  write: (value: string) => Promise<void>;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
  onCopied: (value: boolean) => void;
  onError: (value: string) => void;
}): { copy(value: string): Promise<boolean>; reset(): void; dispose(): void };
