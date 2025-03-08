import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
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
    
    // Fetch all keys from Redis that match the pattern for page views
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

// POST handler - Sync monitored pages with KV
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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
    const domain = await prisma.domain.findFirst({
      where: {
        name: data.domainName,
        userId,
      },
      include: {
        monitoredPages: true,
      },
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // Fetch all keys from Redis that match the pattern for page views
    const hostSanitized = domain.name;
    const pattern = `pv:local:page:${hostSanitized}:*`;
    
    const keys = await kv.keys(pattern);
    
    // Extract paths from keys
    const kvPaths = keys.map(key => {
      // Format is pv:local:page:domain.com:/path
      const parts = key.split(':');
      return parts.slice(4).join(':'); // Join in case path contains colons
    });
    
    // Get existing monitored page paths
    const existingPaths = domain.monitoredPages.map(page => page.path);
    
    // Find paths in KV that are not in the database
    const pathsToAdd = kvPaths.filter(path => !existingPaths.includes(path));
    
    // Create new monitored pages for paths that exist in KV but not in the database
    const newMonitoredPages = await Promise.all(
      pathsToAdd.map(async (path) => {
        return prisma.monitoredPage.create({
          data: {
            path,
            domainId: domain.id,
          },
        });
      })
    );
    
    logger.info("Monitored pages synced with KV", {
      domainId: domain.id,
      newPagesCount: newMonitoredPages.length,
    });
    
    return successResponse(
      { 
        synced: true, 
        newPagesCount: newMonitoredPages.length,
        newPages: newMonitoredPages,
      },
      "Monitored pages synced successfully"
    );
  } catch (error) {
    logger.error("Error in POST /api/domains/pages", { error });
    return ApiErrors.internalError();
  }
}

// DELETE handler - Delete a monitored page
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
    const pageId = url.searchParams.get("pageId");
    
    if (!pageId) {
      return ApiErrors.badRequest("Page ID is required");
    }
    
    // Check if the page exists and belongs to the user
    const page = await prisma.monitoredPage.findUnique({
      where: { id: pageId },
      include: { domain: true },
    });
    
    if (!page) {
      return ApiErrors.notFound("Page not found");
    }
    
    if (page.domain.userId !== userId) {
      return ApiErrors.unauthorized();
    }
    
    // Delete the page
    await prisma.monitoredPage.delete({
      where: { id: pageId },
    });
    
    return successResponse(
      { deleted: true, pageId },
      "Page deleted successfully"
    );
  } catch (error) {
    logger.error("Error in DELETE /api/domains/pages", { error });
    return ApiErrors.internalError();
  }
} 