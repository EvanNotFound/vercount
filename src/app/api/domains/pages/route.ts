import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

// POST handler - Update page view counter
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
    
    if (!data.path) {
      return NextResponse.json(
        { success: false, message: "Page path is required" },
        { status: 400 }
      );
    }
    
    if (data.pageViews === undefined) {
      return NextResponse.json(
        { success: false, message: "Page views count is required" },
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
    
    // Update page view counter
    const result = await domainService.updatePageViewCounter(
      data.domainName,
      data.path,
      data.pageViews
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Page view counter updated successfully",
    });
  } catch (error) {
    logger.error("Error in POST /api/domains/pages", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE handler - Remove a monitored page
export async function DELETE(req: NextRequest) {
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
    const domainId = searchParams.get("domainId");
    const path = searchParams.get("path");
    
    if (!domainId) {
      return NextResponse.json(
        { success: false, message: "Domain ID is required" },
        { status: 400 }
      );
    }
    
    if (!path) {
      return NextResponse.json(
        { success: false, message: "Page path is required" },
        { status: 400 }
      );
    }
    
    // Check if the domain belongs to the user
    const domain = await prisma.domain.findFirst({
      where: {
        id: domainId,
        userId,
      },
    });
    
    if (!domain) {
      return NextResponse.json(
        { success: false, message: "Domain not found or does not belong to you" },
        { status: 404 }
      );
    }
    
    // Remove the monitored page
    const result = await domainService.removeMonitoredPage(domainId, path);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Monitored page removed successfully",
    });
  } catch (error) {
    logger.error("Error in DELETE /api/domains/pages", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 