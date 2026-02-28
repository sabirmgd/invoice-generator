export interface RequestContext {
  ownerId: string;
  isAuthenticated: boolean;
  userId?: string; // DB user UUID (only for authenticated users)
}
