/**
 * XBau Message Builders (PROJ-7, ADR-004)
 *
 * Re-Exports aller Message Builder.
 */

export { build1100 } from "./build-1100";
export type { Build1100Params } from "./build-1100";

export { build1180 } from "./build-1180";
export type { Build1180Params } from "./build-1180";

export { build0201 } from "./build-0201";
export type { Build0201Params } from "./build-0201";

export { appendNachrichtenkopf, createXmlDocument } from "./nachrichtenkopf";
export type { Behoerde, NachrichtenkopfParams } from "./nachrichtenkopf";

export {
  NS_XBAU,
  NS_XBAUK,
  CODELISTE,
  PRODUKT_NAME,
  PRODUKT_HERSTELLER,
  STANDARD_KERNMODUL,
  VERSION_KERNMODUL,
  STANDARD_HOCHBAU,
  VERSION_HOCHBAU,
} from "./namespaces";
