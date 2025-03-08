import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { successResponse, ApiErrors } from "@/lib/api-response";
import kv from "@/lib/kv";
import { calculateTotalUV, updateTotalUV } from "@/utils/counter";
import { EXPIRATION_TIME } from "@/utils/counter";
import { safeDecodeURIComponent } from "@/utils/url";
import { domainService } from "@/lib/domain-service";

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
    console.log("Data:", data);
    
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
    
    // Save the counter values to Redis
    const hostSanitized = domain.name;
    
    // Update site PV in Redis
    await kv.set(`pv:local:site:${hostSanitized}`, sitePv || 0);
    await kv.expire(`pv:local:site:${hostSanitized}`, EXPIRATION_TIME); // 3 months
    
    // Update site UV if provided
    if (siteUv !== undefined) {
      await updateTotalUV(hostSanitized, siteUv);
    } else {
      // Just ensure the UV set has proper expiration
      await kv.expire(`uv:local:site:${hostSanitized}`, EXPIRATION_TIME); // 3 months
    }
    
    // Update page views in Redis
    if (pageViews && Array.isArray(pageViews)) {
      const pageViewPromises = pageViews.map(async (pv: { path: string; views: number }) => {
        // Save page view count directly to Redis without creating monitored pages in PostgreSQL
        const pageKey = `pv:local:page:${hostSanitized}:${pv.path}`;
        await kv.set(pageKey, pv.views || 0);
        await kv.expire(pageKey, EXPIRATION_TIME); // 3 months
        
        return { path: pv.path, views: pv.views };
      });
      
      await Promise.all(pageViewPromises);
    }
    
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
    
    // Use the domain service to get counters
    // This now uses Redis exclusively and is optimized with pipelines
    const counters = await domainService.getCountersForDomain(domainName);
    
    return successResponse({ counters });
  } catch (error) {
    logger.error("Error in GET /api/domains/counters", { error });
    return ApiErrors.internalError();
  }
} 