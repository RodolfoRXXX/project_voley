export async function readJsonSafely(response: Response): Promise<unknown> {
  const rawBody = await response.text();

  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
}
