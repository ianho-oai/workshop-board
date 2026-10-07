export async function verifyAdminPassword(
  supplied: string,
  configured: string | undefined,
) {
  if (
    !configured ||
    configured.length < 16 ||
    configured.startsWith("replace-")
  )
    return false;
  const digest = async (s: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    );
  const [a, b] = await Promise.all([digest(supplied), digest(configured)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
