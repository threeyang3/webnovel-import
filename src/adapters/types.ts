import type { BookRef, SourceMetadata } from '../types';
import type { Identity } from './shared';

export type ResolveUrl = (input: string) => BookRef;
export type SourceFields = Omit<SourceMetadata, keyof BookRef | 'fetched_at' | 'acquisition'>;

/** Platform logic only; adapters never access the Vault or perform network requests. */
export interface SourceAdapter {
  readonly provider: string;
  readonly name: string;
  readonly recoveryHint: string;
  readonly browserCapture?: { readonly selectors: readonly string[] };
  matchUrl(url: URL): BookRef | undefined;
  identities(doc: Document, ref: BookRef, resolveUrl: ResolveUrl): Identity[];
  parse(doc: Document, ref: BookRef, resolveUrl: ResolveUrl): SourceFields;
}
