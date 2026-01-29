
export const inputClass = (valid: boolean) =>
  `border p-2 w-full rounded ${
    valid ? "border-green-500" : "border-red-500"
  }`;
