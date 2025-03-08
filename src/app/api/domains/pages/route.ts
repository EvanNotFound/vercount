import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";
import kv from "@/lib/kv";
import { safeDecodeURIComponent } from "@/utils/url";

// GET handler - Get all paths from KV for a domain
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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
    const domain = await prisma.domain.findFirst({
      where: {
        name: domainName,
        userId,
      },
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // Fetch all keys from KV that match the pattern for page views
    const hostSanitized = domain.name;
    const pattern = `pv:local:page:${hostSanitized}:*`;
    
    const keys = await kv.keys(pattern);
    
    // Extract paths from keys
    const paths = keys.map(key => {
      // Format is pv:local:page:domain.com:/path
      const parts = key.split(':');
      return parts.slice(4).join(':'); // Join in case path contains colons
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
    const session = await getServerSession(authOptions);
    
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
    const domain = await prisma.domain.findFirst({
      where: {
        name: domainName,
        userId,
      },
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // Delete the page view counter from KV
    const hostSanitized = domainName;
    const pageKey = `pv:local:page:${hostSanitized}:${path}`;
    
    await kv.del(pageKey);
    
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