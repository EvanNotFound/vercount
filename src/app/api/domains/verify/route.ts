import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import logger from "@/lib/logger";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";

// POST handler - Verify a domain
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return ApiErrors.unauthorized();
    }
    
    const data = await req.json();
    
    if (!data.domainId) {
      return ApiErrors.badRequest("Domain ID is required");
    }
    
    if (!data.verificationCode) {
      return ApiErrors.badRequest("Verification code is required");
    }
    
    const result = await domainService.verifyDomain(
      data.domainId,
      data.verificationCode
    );
    
    if (!result.success) {
      logger.warn("Domain verification failed", { 
        domainId: data.domainId, 
        message: result.message 
      });
      
      return ApiErrors.badRequest(result.message);
    }
    
    logger.info("Domain verified successfully", { domainId: data.domainId });
    return successResponse(
      { verified: true, domainId: data.domainId },
      result.message || "Domain verified successfully"
    );
  } catch (error) {
    logger.error("Error in POST /api/domains/verify", { error });
    return ApiErrors.internalError();
  }
} 