import { NextResponse } from "next/server";

/**
 * Standard API response type
 */
export type ApiResponse<T = any> = {
  status: "success" | "error";
  message: string;
  data?: T;
  code?: number;
  details?: Record<string, any>;
};

/**
 * Creates a standardized success response
 */
export function successResponse<T>(
  data: T,
  message: string = "Request completed successfully",
  status: number = 200,
  headers?: Record<string, string>
): NextResponse {
  const response: ApiResponse<T> = {
    status: "success",
    message,
    data,
  };
  
  return NextResponse.json(response, { status, headers });
}

/**
 * Creates a standardized error response
 */
export function errorResponse(
  message: string = "An error occurred",
  code: number = 500,
  details?: Record<string, any>
): NextResponse {
  const response: ApiResponse = {
    status: "error",
    message,
    code,
  };
  
  if (details) {
    response.details = details;
  }
  
  return NextResponse.json(response, { status: code });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => errorResponse("Unauthorized", 401),
  badRequest: (message: string = "Bad request", details?: Record<string, any>) => 
    errorResponse(message, 400, details),
  notFound: (message: string = "Resource not found") => 
    errorResponse(message, 404),
  internalError: (message: string = "Internal server error") => 
    errorResponse(message, 500),
}; 