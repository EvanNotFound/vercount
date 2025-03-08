import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import kv from "@/lib/kv";
import { safeDecodeURIComponent } from "@/utils/url";

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
    const pageId = url.searchParams.get("id");
    
    if (!pageId) {
      return ApiErrors.badRequest("Monitored page ID is required");
    }
    
    // Find the monitored page and ensure it belongs to the user
    const monitoredPage = await prisma.monitoredPage.findUnique({
      where: { id: pageId },
      include: { domain: true },
    });
    
    if (!monitoredPage) {
      return ApiErrors.notFound("Monitored page not found");
    }
    
    if (monitoredPage.domain.userId !== userId) {
      return errorResponse("You don't have permission to delete this monitored page", 403);
    }
    
    // Delete the monitored page
    await prisma.monitoredPage.delete({
      where: { id: pageId },
    });
    
    // Delete the page view counter from Redis
    const hostSanitized = monitoredPage.domain.name;
    const pathSanitized = monitoredPage.path;
    const pageKey = `pv:local:page:${hostSanitized}:${pathSanitized}`;
    
    await kv.del(pageKey);
    
    logger.info("Monitored page deleted", {
      pageId,
      domainId: monitoredPage.domain.id,
      path: monitoredPage.path,
      decodedPath: safeDecodeURIComponent(monitoredPage.path),
    });
    
    return successResponse(
      { 
        deleted: true,
        path: monitoredPage.path,
        decodedPath: safeDecodeURIComponent(monitoredPage.path),
      },
      "Monitored page deleted successfully"
    );
  } catch (error) {
    logger.error("Error in DELETE /api/domains/monitored-page", { error });
    return ApiErrors.internalError();
  }
} 