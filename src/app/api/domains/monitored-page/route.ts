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
    const pathSanitized = path;
    const pageKey = `pv:local:page:${hostSanitized}:${pathSanitized}`;
  
    
    logger.info("Monitored page deleted from KV", {
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
      "Monitored page deleted successfully"
    );
  } catch (error) {
    logger.error("Error in DELETE /api/domains/monitored-page", { error });
    return ApiErrors.internalError();
  }
} 