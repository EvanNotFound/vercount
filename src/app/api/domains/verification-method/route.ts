import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import logger from "@/lib/logger";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST handler - Update domain verification method
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
    
    if (!data.domainId) {
      return ApiErrors.badRequest("Domain ID is required");
    }
    
    if (!data.verificationType || !['DNS', 'FILE'].includes(data.verificationType)) {
      return ApiErrors.badRequest("Valid verification type is required (DNS or FILE)");
    }
    
    // Check if domain exists and belongs to user
    const domain = await db.query.domains.findFirst({
      where: eq(domains.id, data.domainId),
    });
    
    if (!domain) {
      return ApiErrors.badRequest("Domain not found");
    }
    
    if (domain.userId !== userId) {
      return errorResponse("You don't have permission to modify this domain", 403);
    }
    
      // Update the verification type
      const updatedDomain = await db.update(domains).set({ verificationType: data.verificationType }).where(eq(domains.id, data.domainId)).returning();
    
    logger.info("Domain verification method updated", { 
      domainId: data.domainId, 
      domain: domain.name,
      newVerificationType: data.verificationType 
    });
    
    return successResponse(
      { domain: updatedDomain },
      "Verification method updated successfully"
    );
  } catch (error) {
    logger.error("Error in POST /api/domains/verification-method", { error });
    return ApiErrors.internalError();
  }
}