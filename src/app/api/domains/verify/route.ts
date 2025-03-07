import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { domainService } from "@/lib/domain-service";
import logger from "@/lib/logger";

// POST handler - Verify a domain
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    if (!data.domainId) {
      return NextResponse.json(
        { success: false, message: "Domain ID is required" },
        { status: 400 }
      );
    }
    
    if (!data.verificationCode) {
      return NextResponse.json(
        { success: false, message: "Verification code is required" },
        { status: 400 }
      );
    }
    
    const result = await domainService.verifyDomain(
      data.domainId,
      data.verificationCode
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Domain verified successfully",
    });
  } catch (error) {
    logger.error("Error in POST /api/domains/verify", { error });
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 