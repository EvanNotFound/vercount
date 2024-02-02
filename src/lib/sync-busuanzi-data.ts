import logger from "@/lib/logger";

export default async function syncBusuanziData(host: string, path: string) {
  const url =
    "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111";
  const headers = {
    Referer: `https://${host}${path}`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };
  logger.debug(
    `Sending request from busuanzi for host: https://${host}${path}`,
  );

  try {
    await fetch(url, {
      method: "GET",
      headers,
    });
    logger.debug(`Request sent successfully for host: https://${host}${path}`);
  } catch (e) {
    logger.error(
      `Request failed for host: https://${host}${path}. Error: ${e}`,
    );
  }
}
