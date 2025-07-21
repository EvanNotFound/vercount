import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";
import kv from "@/lib/kv";
import { safeDecodeURIComponent } from "@/utils/url";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// GET handler - Get all paths from KV for a domain
export async function GET(req: NextRequest) {
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
    
    if (!domainName) {
      return ApiErrors.badRequest("Domain name is required");
    }
    
    // Check if the domain belongs to the user
    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.name, domainName), eq(domains.userId, userId)),
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // Fetch all keys from KV that match the pattern for page views
    const hostSanitized = domain.name;
    const pattern = `pv:page:${hostSanitized}:*`;
    
    const keys = await kv.keys(pattern);
    
    // Extract paths from keys
    const paths = keys.map(key => {
      // Format is pv:page:domain.com:/path
      const parts = key.split(':');
      return parts.slice(3).join(':'); // Join in case path contains colons
    });
    
    logger.info("Paths fetched from KV", {
      domainId: domain.id,
      pathCount: paths.length,
    });
    
    return successResponse({ 
      paths,
      decodedPaths: paths.map(path => ({
        original: path,
        decoded: safeDecodeURIComponent(path)
      }))
    });
  } catch (error) {
    logger.error("Error in GET /api/domains/pages", { error });
    return ApiErrors.internalError();
  }
}

// DELETE handler - Delete a monitored page from KV
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
    
    
    logger.info("Page deleted from KV", {
      domainId: domain.id,
      path,
      decodedPath: safeDecodeURIComponent(path),
    });
    
    return successResponse(
      { 
        deleted: true, 
        path,
        decodedPath: safeDecodeURIComponent(path)
      },
      "Page deleted successfully"
    );
  } catch (error) {
    logger.error("Error in DELETE /api/domains/pages", { error });
    return ApiErrors.internalError();
  }
} 