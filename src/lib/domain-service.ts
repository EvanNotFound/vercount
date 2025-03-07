import { prisma } from "@/lib/prisma";
import kv from "@/lib/kv";
import logger from "@/lib/logger";

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
      
      // Check if domain already exists
      const existingDomain = await prisma.domain.findUnique({
        where: { name: normalizedDomain },
      });
      
      if (existingDomain) {
        return { success: false, message: "Domain already exists" };
      }
      
      // Create new domain
      const domain = await prisma.domain.create({
        data: {
          name: normalizedDomain,
          userId,
        },
      });
      
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
        include: {
          monitoredPages: true,
        },
      });
      
      // Enrich domains with counter data from Redis
      const enrichedDomains = await Promise.all(
        domains.map(async (domain) => {
          const counterData = await this.getCountersForDomain(domain.name);
          return {
            ...domain,
            counters: counterData
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
      
      if (domain.verificationCode !== verificationCode) {
        return { success: false, message: "Invalid verification code" };
      }
      
      // Update domain to verified
      await prisma.domain.update({
        where: { id: domainId },
        data: { verified: true },
      });
      
      return { success: true, message: "Domain verified successfully" };
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
      
      // Get site PV from Redis
      const sitePvKey = `site:${normalizedDomain}:pv`;
      const sitePv = await kv.get<number>(sitePvKey) || 0;
      
      // Get site UV from Redis
      const siteUvKey = `site:${normalizedDomain}:uv`;
      const siteUv = await kv.get<number>(siteUvKey) || 0;
      
      // Get page views
      const pageKeys = await kv.keys(`page:${normalizedDomain}:*:pv`);
      const pageViews = await Promise.all(
        pageKeys.map(async (key) => {
          const parts = key.split(':');
          const path = parts[2]; // Extract path from key
          const views = await kv.get<number>(key) || 0;
          
          return {
            path,
            views,
          };
        })
      );
      
      return {
        sitePv,
        siteUv,
        pageViews,
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
        const sitePvKey = `site:${normalizedDomain}:pv`;
        await kv.set(sitePvKey, sitePv);
      }
      
      // Update site UV in Redis if provided
      if (siteUv !== undefined) {
        const siteUvKey = `site:${normalizedDomain}:uv`;
        await kv.set(siteUvKey, siteUv);
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
      
      // Create or update the monitored page entry
      const monitoredPage = await prisma.monitoredPage.upsert({
        where: {
          domainId_path: {
            domainId,
            path: normalizedPath,
          },
        },
        update: {},
        create: {
          domainId,
          path: normalizedPath,
        },
      });
      
      // If page views were provided, update the Redis counter
      if (pageViews !== undefined) {
        const pageViewKey = `page:${domain.name}:${normalizedPath}:pv`;
        await kv.set(pageViewKey, pageViews);
      }
      
      return { success: true, monitoredPage };
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
      const pageViewKey = `page:${normalizedDomain}:${normalizedPath}:pv`;
      await kv.set(pageViewKey, pageViews);
      
      // Ensure the page is in our monitored pages list
      await this.addMonitoredPage(domain.id, normalizedPath);
      
      return { success: true, message: "Page view counter updated" };
    } catch (error) {
      logger.error("Error updating page view counter", { error, domainName, path });
      return { success: false, message: "Failed to update page view counter" };
    }
  },
  
  /**
   * Remove a monitored page from a domain
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
      
      // Delete the monitored page
      await prisma.monitoredPage.deleteMany({
        where: {
          domainId,
          path: normalizedPath,
        },
      });
      
      // Also remove the page view counter from Redis
      const pageViewKey = `page:${domain.name}:${normalizedPath}:pv`;
      await kv.del(pageViewKey);
      
      return { success: true, message: "Monitored page removed" };
    } catch (error) {
      logger.error("Error removing monitored page", { error, domainId, path });
      return { success: false, message: "Failed to remove monitored page" };
    }
  },
};

/**
 * Normalize domain name for consistent storage
 * Removes protocol, www, and trailing slashes
 */
function normalizeDomain(domain: string): string {
  // Remove protocol
  let normalizedDomain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  
  // Remove trailing slash
  normalizedDomain = normalizedDomain.replace(/\/+$/, '');
  
  // Remove path if present
  normalizedDomain = normalizedDomain.split('/')[0];
  
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