import { RequestUser } from './user.types';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
