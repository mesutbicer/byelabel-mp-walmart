import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * BaseException - Base exception class
 * 
 * Fully compatible with the C# DTOs/CustomException/BaseException.cs.
 * 
 * C# Serialization Format:
 * {
 *   "Message": "error message",
 *   "code": "GENERAL"
 * }
 */
export class BaseException extends HttpException {
  public code: string;

  constructor(message: string, code: string = 'GENERAL') {
    // Response object compatible with C# format (Message with capital M)
    super(
      {
        Message: message,
        code: code,
      },
      HttpStatus.BAD_REQUEST,
    );
    this.code = code;
  }
}

/**
 * UserNotFoundException - User not found error
 * 
 * Fully compatible with the C# DTOs/CustomException/UserNotFoundException.cs.
 * NOTE: C# project returns this error as 400 Bad Request (not 404),
 * The same behavior is preserved for compatibility.
 * 
 * C# Serialization Format:
 * {
 *   "Message": "User Not Found.",
 *   "code": "USER_NOT_FOUND"
 * }
 */
export class UserNotFoundException extends HttpException {
  public code: string;

  constructor(message: string = 'User Not Found.') {
    // Response object compatible with C# format (Message with capital M)
    super(
      {
        Message: message,
        code: 'USER_NOT_FOUND',
      },
      HttpStatus.BAD_REQUEST, // Uses 400 for compatibility with the C# project
    );
    this.code = 'USER_NOT_FOUND';
  }
}
