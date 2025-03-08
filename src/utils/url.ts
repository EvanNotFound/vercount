/**
 * Safely decodes a URL-encoded string
 * @param encodedString The URL-encoded string to decode
 * @returns The decoded string, or the original string if decoding fails
 */
export function safeDecodeURIComponent(encodedString: string): string {
  try {
    return decodeURIComponent(encodedString);
  } catch (error) {
    console.error("Error decoding URL component:", encodedString, error);
    return encodedString;
  }
} 