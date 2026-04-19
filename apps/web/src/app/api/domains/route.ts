import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import logger from "@/lib/logger";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";

// GET handler - Get all domains for the authenticated user
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
    
    const result = await domainService.getDomains(userId);
    
    if (!result.success) {
      return ApiErrors.badRequest(result.message);
    }
    
    return successResponse({ domains: result.domains });
  } catch (error) {
    logger.error("Error in GET /api/domains", { error });
    return ApiErrors.internalError();
  }
}

// POST handler - Add a new domain
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
    
    if (!data.domain) {
      return ApiErrors.badRequest("Domain name is required");
    }
    
    // Optional verificationType parameter
    const verificationType = data.verificationType as 'DNS' | 'FILE' | undefined;
    
    const result = await domainService.addDomain(userId, data.domain, verificationType);
    
    if (!result.success) {
      return ApiErrors.badRequest(result.message);
    }
    
    return successResponse(
      { domain: result.domain },
      "Domain added successfully"
    );
  } catch (error) {
    logger.error("Error in POST /api/domains", { error });
    return ApiErrors.internalError();
  }
}