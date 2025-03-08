import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import logger from "@/lib/logger";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import kv from "@/lib/kv";

// GET handler - Get all domains for the authenticated user
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
    const session = await getServerSession(authOptions);
    
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
    
    const result = await domainService.addDomain(userId, data.domain);
    
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

// // DELETE handler - Delete a domain
// export async function DELETE(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
    
//     if (!session || !session.user) {
//       return ApiErrors.unauthorized();
//     }
    
//     const userId = session.user.id;
//     if (!userId) {
//       return ApiErrors.badRequest("User ID not found in session");
//     }
    
//     const url = new URL(req.url);
//     const domainId = url.searchParams.get("id");
    
//     if (!domainId) {
//       return ApiErrors.badRequest("Domain ID is required");
//     }
    
//     // Find the domain and ensure it belongs to the user
//     const domain = await prisma.domain.findUnique({
//       where: { id: domainId },
//       include: { monitoredPages: true },
//     });
    
//     if (!domain) {
//       return ApiErrors.notFound("Domain not found");
//     }
    
//     if (domain.userId !== userId) {
//       return errorResponse("You don't have permission to delete this domain", 403);
//     }
    
//     // Delete all page view counters from Redis
//     for (const page of domain.monitoredPages) {
//       const pageKey = `pv:local:page:${domain.name}:${page.path}`;
//       await kv.del(pageKey);
//     }
    
//     // // Delete domain counters from Redis
//     // const siteUvKey = `pv:local:site:${domain.name}:uv`;
//     // const sitePvKey = `pv:local:site:${domain.name}:pv`;
//     // await kv.del(siteUvKey);
//     // await kv.del(sitePvKey);
    
//     // Delete the domain (this will cascade delete monitored pages)
//     await prisma.domain.delete({
//       where: { id: domainId },
//     });
    
//     logger.info("Domain deleted", {
//       domainId,
//       domainName: domain.name,
//     });
    
//     return successResponse(
//       { deleted: true, domainId },
//       "Domain deleted successfully"
//     );
//   } catch (error) {
//     logger.error("Error in DELETE /api/domains", { error });
//     return ApiErrors.internalError();
//   }
// } 