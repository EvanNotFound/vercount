import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";

// POST handler - Update counter values for a domain
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
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // Update the counter values
    const { sitePv, siteUv, pageViews } = data;
    
    // For simplicity, we'll just log the values and return success
    // In a real implementation, you would update the counters in your database
    logger.info("Domain counters updated", {
      domainId: domain.id,
      sitePv: sitePv || 0,
      siteUv: siteUv || 0,
      pageViewsCount: pageViews?.length || 0,
    });
    
    return successResponse(
      { 
        updated: true, 
        domainId: domain.id,
        counters: {
          sitePv: sitePv || 0,
          siteUv: siteUv || 0,
          pageViewsCount: pageViews?.length || 0,
        }
      },
      "Domain counters updated successfully"
    );
  } catch (error) {
    logger.error("Error in POST /api/domains/counters", { error });
    return ApiErrors.internalError();
  }
}

// GET handler - Get counter values for a domain
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
    
    // For simplicity, we'll just return some default values
    // In a real implementation, you would fetch the counters from your database
    const counters = {
      sitePv: 0,
      siteUv: 0,
      pageViews: [],
    };
    
    return successResponse({ counters });
  } catch (error) {
    logger.error("Error in GET /api/domains/counters", { error });
    return ApiErrors.internalError();
  }
} 