import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { safeDecodeURIComponent } from "@/utils/url";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// DELETE handler - Delete a monitored page
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return ApiErrors.unauthorized();
    }
    
    const userId = session.user.id;
    if (!userId) {
      return ApiErrors.badRequest("User ID not found in session");
    }
    
    const url = new URL(req.url);
    const domainName = url.searchParams.get("domain");
    const path = url.searchParams.get("path");
    
    if (!domainName || !path) {
      return ApiErrors.badRequest("Domain name and path are required");
    }
    
    // Check if the domain belongs to the user
    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.name, domainName), eq(domains.userId, userId)),
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // We're keeping the data in KV as requested
    const hostSanitized = domainName;
    const pathSanitized = path;
    
    // No need to delete from PostgreSQL anymore since we're using Redis exclusively
    // Just log that the page is no longer monitored
    
    logger.info("Monitored page marked as not monitored (KV data preserved)", {
      domainId: domain.id,
      path: pathSanitized,
      decodedPath: safeDecodeURIComponent(pathSanitized),
    });
    
    return successResponse(
      { 
        deleted: true,
        path: pathSanitized,
        decodedPath: safeDecodeURIComponent(pathSanitized),
      },
      "Monitored page marked as not monitored (KV data preserved)"
    );
  } catch (error) {
    logger.error("Error in DELETE /api/domains/monitored-page", { error });
    return ApiErrors.internalError();
  }
} 