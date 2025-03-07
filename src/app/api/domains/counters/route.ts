import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

// POST handler - Update counter values for a domain
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID not found in session" },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    if (!data.domainName) {
      return NextResponse.json(
        { success: false, message: "Domain name is required" },
        { status: 400 }
      );
    }
    
    // Check if the domain belongs to the user
    const domain = await prisma.domain.findFirst({
      where: {
        name: data.domainName,
        userId,
      },
    });
    
    if (!domain) {
      return NextResponse.json(
        { success: false, message: "Domain not found or does not belong to you" },
        { status: 404 }
      );
    }
    
    // Update counters
    const result = await domainService.updateDomainCounters(
      data.domainName,
      data.sitePv,
      data.siteUv
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Counters updated successfully",
      counters: result.counters,
    });
  } catch (error) {
    logger.error("Error in POST /api/domains/counters", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET handler - Get counter values for a domain
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID not found in session" },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const domainName = searchParams.get("domain");
    
    if (!domainName) {
      return NextResponse.json(
        { success: false, message: "Domain name is required" },
        { status: 400 }
      );
    }
    
    // Check if the domain belongs to the user
    const domain = await prisma.domain.findFirst({
      where: {
        name: domainName,
        userId,
      },
    });
    
    if (!domain) {
      return NextResponse.json(
        { success: false, message: "Domain not found or does not belong to you" },
        { status: 404 }
      );
    }
    
    // Get counters
    const counters = await domainService.getCountersForDomain(domainName);
    
    return NextResponse.json({
      success: true,
      counters,
    });
  } catch (error) {
    logger.error("Error in GET /api/domains/counters", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 