import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { forceSyncAllFromBusuanzi } from "@/utils/busuanzi";
import { domainService } from "@/lib/domain-service";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * POST handler - Force sync data from Busuanzi for a domain
 * This allows users to manually trigger a re-sync of their data from Busuanzi,
 * which is useful when the initial sync failed due to Busuanzi service issues.
 */
export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession();

		if (!session || !session.user) {
			return ApiErrors.unauthorized();
		}

		const userId = session.user.id;
		if (!userId) {
			return ApiErrors.badRequest("User ID not found in session");
		}

		const data = await req.json();

		if (!data.domainName) {
			return ApiErrors.badRequest("Domain name is required");
		}

		// Check if the domain belongs to the user
		const domain = await db.query.domains.findFirst({
			where: and(eq(domains.name, data.domainName), eq(domains.userId, userId)),
		});

		if (!domain) {
			return ApiErrors.notFound("Domain not found or does not belong to you");
		}

		if (!domain.verified) {
			return ApiErrors.badRequest("Domain must be verified before syncing data");
		}

		logger.info(`Starting Busuanzi sync for domain: ${domain.name}`, { userId });

		// Force sync from Busuanzi
		const syncResult = await forceSyncAllFromBusuanzi(domain.name, domain.name);

		if (!syncResult.success) {
			logger.warn(`Busuanzi sync partially failed for domain: ${domain.name}`, { 
				syncResult,
				userId 
			});
			
			// Return partial success with details about what failed
			return successResponse(
				{
					synced: false,
					domainName: domain.name,
					details: {
						siteUv: syncResult.siteUv,
						sitePv: syncResult.sitePv,
					},
				},
				syncResult.error || "Some data failed to sync from Busuanzi. The service may be temporarily unavailable.",
				200
			);
		}

		// Get updated counter data
		const counters = await domainService.getCountersForDomain(domain.name);

		logger.info(`Busuanzi sync completed for domain: ${domain.name}`, {
			userId,
			siteUv: syncResult.siteUv?.value,
			sitePv: syncResult.sitePv?.value,
		});

		return successResponse(
			{
				synced: true,
				domainName: domain.name,
				counters,
				syncedValues: {
					siteUv: syncResult.siteUv?.value,
					sitePv: syncResult.sitePv?.value,
				},
			},
			"Data synced successfully from Busuanzi"
		);
	} catch (error) {
		logger.error("Error in POST /api/domains/sync-busuanzi", { error });
		return ApiErrors.internalError();
	}
}
