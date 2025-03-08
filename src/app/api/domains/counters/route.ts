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
      include: {
        monitoredPages: true,
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
        // Ensure the path is monitored
        let monitoredPage = domain.monitoredPages.find(mp => mp.path === pv.path);
        
        if (!monitoredPage) {
          // Create a new monitored page if it doesn't exist
          monitoredPage = await prisma.monitoredPage.create({
            data: {
              path: pv.path,
              domainId: domain.id,
            },
          });
        }
        
        // Save page view count to Redis
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
      include: {
        monitoredPages: true,
      },
    });
    
    if (!domain) {
      return ApiErrors.notFound("Domain not found or does not belong to you");
    }
    
    // Fetch counter values from Redis
    const hostSanitized = domain.name;
    
    // Get site PV from Redis and calculate UV using the utility function
    const [sitePv, uvData] = await Promise.all([
      kv.get(`pv:local:site:${hostSanitized}`),
      calculateTotalUV(hostSanitized)
    ]);
    
    const siteUv = uvData.total;
    
    // Batch fetch page views using pipeline or MGET instead of individual calls
    if (domain.monitoredPages.length === 0) {
      // No monitored pages, return early with empty pageViews
      const counters = {
        sitePv: Number(sitePv || 0),
        siteUv: Number(siteUv || 0),
        pageViews: [],
      };
      return successResponse({ counters });
    }
    
    // Create an array of keys for all monitored pages
    const pageKeys = domain.monitoredPages.map(page => 
      `pv:local:page:${hostSanitized}:${page.path}`
    );
    
    // Use pipeline to batch fetch all page view counts in a single Redis operation
    const pipeline = kv.pipeline();
    pageKeys.forEach(key => {
      pipeline.get(key);
    });
    
    // Execute the pipeline to get all values at once
    const pageViewCounts = await pipeline.exec();
    
    // Map the results back to the monitored pages
    const pageViews = domain.monitoredPages.map((page, index) => {
      const views = pageViewCounts[index];
      logger.debug("Page views", { 
        pageKey: pageKeys[index], 
        views 
      });
      
      return {
        path: page.path,
        decodedPath: safeDecodeURIComponent(page.path),
        views: Number(views || 0),
      };
    });
    
    const counters = {
      sitePv: Number(sitePv || 0),
      siteUv: Number(siteUv || 0),
      pageViews,
    };
    
    return successResponse({ counters });
  } catch (error) {
    logger.error("Error in GET /api/domains/counters", { error });
    return ApiErrors.internalError();
  }
} 