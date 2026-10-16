import { Request } from 'express';

declare module 'express' {
  interface Request {
    requestId?: string;
    user?: {
      uid: string;
      email?: string;
      admin?: boolean;
      [key: string]: any;
    };
  }
}
