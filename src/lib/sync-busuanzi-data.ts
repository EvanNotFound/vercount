import logger from "@/lib/logger";

export default function syncBusuanziData(host: string, path: string) {
  const url =
    "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111";
  const headers = {
    Referer: `https://${host}${path}`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };
  
  // Fire and forget - explicitly non-blocking
  fetch(url, {
    method: "GET",
    headers,
  })
    .then(() => {
      logger.debug(`Busuanzi sync request sent for: https://${host}${path}`);
    })
    .catch((e) => {
      logger.error(`Busuanzi sync failed for: https://${host}${path}. Error: ${e}`);
    });
}
