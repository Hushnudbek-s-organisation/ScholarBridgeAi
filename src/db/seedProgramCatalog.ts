/**
 * The previous programme list contained unverified programme names, fixed
 * requirements and cycle dates linked only to generic university homepages.
 * It is intentionally not seeded until current programme-specific official
 * pages have been reviewed. Existing catalogue rows remain untouched.
 */
export interface SeedProgramCatalogSummary {
  universitiesMatched: number;
  programsInserted: number;
  requirementsInserted: number;
  cyclesInserted: number;
  sourcesCreated: number;
}

/** Compatibility entry point used by the fresh-seed and top-up paths. */
export async function seedProgramCatalog(): Promise<SeedProgramCatalogSummary> {
  return {
    universitiesMatched: 0,
    programsInserted: 0,
    requirementsInserted: 0,
    cyclesInserted: 0,
    sourcesCreated: 0,
  };
}
