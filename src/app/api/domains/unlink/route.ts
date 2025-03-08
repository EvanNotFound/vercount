import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

// POST handler - Unlink a domain (remove from PostgreSQL but keep data in KV)
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
    
    const url = new URL(req.url);
    const domainId = url.searchParams.get("id");
    
    if (!domainId) {
      return ApiErrors.badRequest("Domain ID is required");
    }
    
    // Find the domain and ensure it belongs to the user
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: { monitoredPages: true },
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found");
    }
    
    if (domain.userId !== userId) {
      return errorResponse("You don't have permission to unlink this domain", 403);
    }
    
    // Delete the domain from PostgreSQL (this will cascade delete monitored pages)
    // But we're NOT deleting any data from KV
    await prisma.domain.delete({
      where: { id: domainId },
    });
    
    logger.info("Domain unlinked", {
      domainId,
      domainName: domain.name,
    });
    
    return successResponse(
      { unlinked: true, domainId },
      "Domain unlinked successfully. Analytics data has been preserved."
    );
  } catch (error) {
    logger.error("Error in POST /api/domains/unlink", { error });
    return ApiErrors.internalError();
  }
} 