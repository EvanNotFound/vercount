import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import logger from "@/lib/logger";

// GET handler - Get all domains for the authenticated user
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
    
    const result = await domainService.getDomains(userId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, domains: result.domains });
  } catch (error) {
    logger.error("Error in GET /api/domains", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler - Add a new domain
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
    
    if (!data.domain) {
      return NextResponse.json(
        { success: false, message: "Domain name is required" },
        { status: 400 }
      );
    }
    
    const result = await domainService.addDomain(userId, data.domain);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      domain: result.domain,
      message: "Domain added successfully" 
    });
  } catch (error) {
    logger.error("Error in POST /api/domains", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 