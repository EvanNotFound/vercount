import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";

// POST handler - Update page view counter
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
    
    if (!data.path) {
      return ApiErrors.badRequest("Page path is required");
    }
    
    if (data.pageViews === undefined) {
      return ApiErrors.badRequest("Page views count is required");
    }
    
    // Check if the domain exists and belongs to the user
    const domain = await prisma.domain.findFirst({
      where: {
        name: data.domainName,
        userId: userId,
      },
    });
    
    if (!domain) {
      return ApiErrors.badRequest("Domain not found or does not belong to you");
    }
    
    // Update or create the page view counter
    const result = await domainService.updatePageViewCounter(
      domain.id,
      data.path,
      data.pageViews
    );
    
    if (!result.success) {
      return ApiErrors.badRequest(result.message);
    }
    
    return successResponse(
      { updated: true, domainId: domain.id, path: data.path },
      "Page view counter updated successfully"
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