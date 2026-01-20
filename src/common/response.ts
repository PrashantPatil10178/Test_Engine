// src/common/response.ts

export type ApiResponse<T = any> = {
  success: boolean;
  message: string;
  data: T | null;
  error?: any;
};

export const successResponse = <T>(
  data: T,
  message = "Success",
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

export const errorResponse = (message: string, error?: any): ApiResponse => ({
  success: false,
  message,
  data: null,
  error,
});
