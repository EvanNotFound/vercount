import { prisma } from "@/lib/prisma";
import kv from "@/lib/kv";
import logger from "@/lib/logger";
import dns from "dns";
import { promisify } from "util";
import { updateTotalUV } from "@/utils/counter";
import { EXPIRATION_TIME } from "@/utils/counter";

// Promisify DNS methods
const resolveTxt = promisify(dns.resolveTxt);

/**
 * Check if a domain is a subdomain of another domain
 */
function isSubdomainOf(subdomain: string, parentDomain: string): boolean {
  // Normalize both domains for comparison
  const normalizedSubdomain = normalizeDomain(subdomain);
  const normalizedParentDomain = normalizeDomain(parentDomain);
  
  // A domain is a subdomain if it ends with the parent domain and has an additional segment
  const isSubdomain = normalizedSubdomain !== normalizedParentDomain && 
         normalizedSubdomain.endsWith(normalizedParentDomain) && 
         normalizedSubdomain.charAt(normalizedSubdomain.length - normalizedParentDomain.length - 1) === '.';
  
  logger.debug(`Checking if ${normalizedSubdomain} is a subdomain of ${normalizedParentDomain}: ${isSubdomain}`);
  
  return isSubdomain;
}

/**
 * Service for managing domains and their counter data
 */
export const domainService = {
  /**
   * Add a new domain for a user
   */
  async addDomain(userId: string, domainName: string) {
    try {
      // Normalize domain name (remove protocol, www, etc.)
      const normalizedDomain = normalizeDomain(domainName);
      
      // Check if domain already exists for any user
      const existingDomain = await prisma.domain.findUnique({
        where: { name: normalizedDomain },
      });
      
      if (existingDomain) {
        // Check if the domain belongs to the current user
        if (existingDomain.userId === userId) {
          return { success: false, message: "You have already added this domain" };
        } else {
          return { success: false, message: "This domain has already been registered by another user" };
        }
      }
      
      // Check if this is a subdomain of an already verified domain owned by the same user
      const userDomains = await prisma.domain.findMany({
        where: { 
          userId,
          verified: true
        },
      });
      
      logger.info(`Checking if ${normalizedDomain} is a subdomain of any verified domains for user ${userId}`);
      
      // Check if any of the user's verified domains is a parent domain of the new domain
      const parentDomain = userDomains.find(domain => isSubdomainOf(normalizedDomain, domain.name));
      
      if (parentDomain) {
        logger.info(`${normalizedDomain} is a subdomain of verified domain ${parentDomain.name}, auto-verifying`);
      }
      
      // Create new domain, automatically verified if it's a subdomain of a verified domain
      const domain = await prisma.domain.create({
        data: {
          name: normalizedDomain,
          userId,
          verified: parentDomain ? true : false,
        },
      });

      // No need to recreate monitored pages in PostgreSQL anymore
      // since we're using Redis exclusively for page views
      
      if (parentDomain) {
        return { 
          success: true, 
          domain,
          message: `Domain added and automatically verified as a subdomain of ${parentDomain.name}`
        };
      }
      
      return { success: true, domain };
    } catch (error) {
      logger.error("Error adding domain", { error, userId, domainName });
      return { success: false, message: "Failed to add domain" };
    }
  },
  
  /**
   * Get all domains for a user
   */
  async getDomains(userId: string) {
    try {
      const domains = await prisma.domain.findMany({
        where: { userId },
      });
      
      // Enrich domains with counter data from Redis
      const enrichedDomains = await Promise.all(
        domains.map(async (domain) => {
          const counterData = await this.getCountersForDomain(domain.name);
          return {
            ...domain,
            counters: counterData,
          };
        })
      );
      
      return { success: true, domains: enrichedDomains };
    } catch (error) {
      logger.error("Error getting domains", { error, userId });
      return { success: false, message: "Failed to get domains" };
    }
  },
  
  /**
   * Verify a domain using a verification code
   */
  async verifyDomain(domainId: string, verificationCode: string) {
    try {
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
      });
      
      if (!domain) {
        return { success: false, message: "Domain not found" };
      }
      
      if (domain.verified) {
        return { success: true, message: "Domain already verified" };
      }
      
      // Always verify via DNS TXT record
      try {
        logger.info(`Attempting to verify domain: ${domain.name} with DNS lookup for _vercount.${domain.name}`);
        
        // Check for TXT record in DNS
        let txtRecords: string[][] = [];
        try {
          txtRecords = await resolveTxt(`_vercount.${domain.name}`);
          logger.info(`DNS TXT records found for _vercount.${domain.name}:`, { txtRecords });
        } catch (dnsError) {
          logger.error(`DNS lookup failed for _vercount.${domain.name}`, { error: dnsError });
          return { 
            success: false, 
            message: "DNS verification failed: Could not find TXT record. Please ensure you've added the _vercount TXT record to your DNS settings." 
          };
        }
        
        const expectedValue = `vercount-domain-verify=${domain.name},${domain.verificationCode}`;
        logger.info(`Expected TXT record value: ${expectedValue}`);
        
        // Check if any of the TXT records match our expected format
        const verified = txtRecords.some(record => {
          const joined = record.join('');
          logger.info(`Comparing TXT record: "${joined}" with expected: "${expectedValue}"`);
          return joined === expectedValue;
        });
        
        if (!verified) {
          return { 
            success: false, 
            message: "Domain verification failed: TXT record found but value doesn't match. Please ensure you've added the correct TXT record value." 
          };
        }
        
        // If DNS verification succeeded, update domain to verified
        await prisma.domain.update({
          where: { id: domainId },
          data: { verified: true },
        });
        
        return { success: true, message: "Domain verified successfully via DNS!" };
      } catch (error) {
        logger.error("Error verifying domain via DNS", { error, domainId, domain: domain.name });
        return { 
          success: false, 
          message: "Failed to verify domain via DNS. Please check your DNS configuration and ensure the TXT record is properly set." 
        };
      }
    } catch (error) {
      logger.error("Error verifying domain", { error, domainId });
      return { success: false, message: "Failed to verify domain" };
    }
  },
  
  /**
   * Get counters for a domain from Redis
   */
  async getCountersForDomain(domainName: string) {
    try {
      const normalizedDomain = normalizeDomain(domainName);
      
      // Get site PV and UV data in parallel
      const sitePvKey = `pv:local:site:${normalizedDomain}`;
      const siteUvKey = `uv:local:site:${normalizedDomain}`;
      const siteUvAdjustKey = `uv:adjust:site:${normalizedDomain}`;
      
      // Use pipeline for better performance
      const pipeline = kv.pipeline();
      pipeline.get(sitePvKey);
      pipeline.scard(siteUvKey);
      pipeline.get(siteUvAdjustKey);
      
      // Execute the pipeline to get all values at once
      const [sitePv, siteUvSetCount, siteUvAdjust] = await pipeline.exec();
      
      // Combine the set cardinality with the manual adjustment
      const siteUv = Number(siteUvSetCount || 0) + Number(siteUvAdjust || 0);
      
      // Get all page keys directly from Redis
      const pageKeys = await kv.keys(`pv:local:page:${normalizedDomain}:*`);
      
      // If no page keys, return early with empty pageViews
      if (pageKeys.length === 0) {
        return {
          sitePv: Number(sitePv || 0),
          siteUv,
          pageViews: [],
        };
      }
      
      // Use pipeline to batch fetch all page view counts in a single Redis operation
      const pagesPipeline = kv.pipeline();
      pageKeys.forEach(key => {
        pagesPipeline.get(key);
      });
      
      // Execute the pipeline to get all values at once
      const pageViewCounts = await pagesPipeline.exec();
      
      // Map the results to create pageViews data
      const pageViewsData = pageKeys.map((key, index) => {
        // Extract the path part from the key
        const prefix = `pv:local:page:${normalizedDomain}:`;
        const path = key.substring(key.indexOf(prefix) + prefix.length);
        const views = Number(pageViewCounts[index] || 0);
        
        return {
          path,
          views
        };
      });
      
      // Sort by view count (highest first)
      pageViewsData.sort((a, b) => b.views - a.views);
      
      return {
        sitePv: Number(sitePv || 0),
        siteUv,
        pageViews: pageViewsData,
      };
    } catch (error) {
      logger.error("Error getting counters for domain", { error, domainName });
      return {
        sitePv: 0,
        siteUv: 0,
        pageViews: [],
      };
    }
  },
  
  /**
   * Update counter values for a domain in Redis
   */
  async updateDomainCounters(domainName: string, sitePv?: number, siteUv?: number) {
    try {
      const normalizedDomain = normalizeDomain(domainName);
      
      // Check if the domain exists and is verified
      const domain = await prisma.domain.findUnique({
        where: { name: normalizedDomain },
      });
      
      if (!domain || !domain.verified) {
        return { success: false, message: "Domain not found or not verified" };
      }
      
      // Update site PV in Redis if provided
      if (sitePv !== undefined) {
        const sitePvKey = `pv:local:site:${normalizedDomain}`;
        await kv.set(sitePvKey, sitePv);
      }
      
      // Update site UV in Redis if provided
      if (siteUv !== undefined) {
        // Use the updateTotalUV function to properly update the UV adjustment
        await updateTotalUV(normalizedDomain, siteUv);
      }
      
      // Get updated counter data
      const counterData = await this.getCountersForDomain(normalizedDomain);
      
      return {
        success: true,
        message: "Domain counters updated successfully",
        counters: counterData,
      };
    } catch (error) {
      logger.error("Error updating domain counters", { error, domainName });
      return { success: false, message: "Failed to update domain counters" };
    }
  },
  
  /**
   * Add a monitored page for a domain and optionally set its view count
   */
  async addMonitoredPage(domainId: string, path: string, pageViews?: number) {
    try {
      // Normalize path
      const normalizedPath = normalizePath(path);
      
      // Get the domain
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
      });
      
      if (!domain) {
        return { success: false, message: "Domain not found" };
      }
      
      // Store page view in Redis only
      if (pageViews !== undefined) {
        const pageViewKey = `pv:local:page:${domain.name}:${normalizedPath}`;
        await kv.set(pageViewKey, pageViews);
        // Set expiration time
        await kv.expire(pageViewKey, EXPIRATION_TIME); // 3 months
      }
      
      return { 
        success: true, 
        monitoredPage: {
          path: normalizedPath,
          domainId
        }
      };
    } catch (error) {
      logger.error("Error adding monitored page", { error, domainId, path });
      return { success: false, message: "Failed to add monitored page" };
    }
  },
  
  /**
   * Update page view counter for a specific page in Redis
   */
  async updatePageViewCounter(domainName: string, path: string, pageViews: number) {
    try {
      const normalizedDomain = normalizeDomain(domainName);
      const normalizedPath = normalizePath(path);
      
      // Check if the domain exists and is verified
      const domain = await prisma.domain.findUnique({
        where: { name: normalizedDomain },
      });
      
      if (!domain || !domain.verified) {
        return { success: false, message: "Domain not found or not verified" };
      }
      
      // Update the page view in Redis
      const pageViewKey = `pv:local:page:${normalizedDomain}:${normalizedPath}`;
      await kv.set(pageViewKey, pageViews);
      // Set expiration time
      await kv.expire(pageViewKey, EXPIRATION_TIME); // 3 months
      
      return { success: true, message: "Page view counter updated" };
    } catch (error) {
      logger.error("Error updating page view counter", { error, domainName, path });
      return { success: false, message: "Failed to update page view counter" };
    }
  },
  
  /**
   * Remove a monitored page from a domain
   * Note: This only marks the page as not monitored, but preserves the data in Redis
   */
  async removeMonitoredPage(domainId: string, path: string) {
    try {
      // Normalize path
      const normalizedPath = normalizePath(path);
      
      // Get the domain
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
      });
      
      if (!domain) {
        return { success: false, message: "Domain not found" };
      }
      
      // We're keeping the data in KV as requested
      // const pageViewKey = `pv:local:page:${domain.name}:${normalizedPath}`;
      // await kv.del(pageViewKey);
      
      return { success: true, message: "Monitored page removed (KV data preserved)" };
    } catch (error) {
      logger.error("Error removing monitored page", { error, domainId, path });
      return { success: false, message: "Failed to remove monitored page" };
    }
  },
};

/**
 * Normalize domain name for consistent storage
 * Removes protocol and trailing slashes, preserves www
 */
function normalizeDomain(domain: string): string {
  // Remove protocol only, preserve www
  let normalizedDomain = domain.replace(/^(https?:\/\/)/i, '');
  
  // Remove trailing slash
  normalizedDomain = normalizedDomain.replace(/\/+$/, '');
  
  // Remove path if present
  normalizedDomain = normalizedDomain.split('/')[0];
  
  // Remove port number if present
  normalizedDomain = normalizedDomain.split(':')[0];
  
  return normalizedDomain.toLowerCase();
}

/**
 * Normalize path for consistent storage
 */
function normalizePath(path: string): string {
  // Ensure path starts with a slash
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash except for root path
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  // Convert to lowercase
  return normalizedPath.toLowerCase();
} 