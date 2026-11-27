/**
 * Feature: Verified Place Filtering, Neighbourhood Tagging & Polyline Decoding
 * Purpose: Pure deterministic helpers that enforce ORR bounding-box checks, drop closed or unbuilt metro places, dedupe IDs, and decode Routes API polylines.
 * Inputs: Raw Google Places API (New) candidate objects and encoded polyline strings.
 * Outputs: Validated VerifiedPlace arrays and GeoJSON [lng, lat] coordinate arrays.
 * Deliberately excludes: Network I/O or environment variable reads so every rule is 100% unit-testable.
 */
import {
  ORR_BBOX,
  ORR_NEIGHBOURHOOD_ANCHORS,
  type BoundingBox,
  type PlaceCategory,
  type VerifiedPlace,
} from "@apna-area/shared";

export interface RawGooglePlace {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  businessStatus?: string;
  googleMapsUri?: string;
}

const EARTH_RADIUS_KM = 6_371;

/**
 * Calculates great-circle Haversine distance in kilometres between two WGS84 coordinates.
 *
 * @param lat1 - Origin latitude in degrees.
 * @param lng1 - Origin longitude in degrees.
 * @param lat2 - Destination latitude in degrees.
 * @param lng2 - Destination longitude in degrees.
 * @returns Distance in kilometres.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Checks whether a coordinate lies inclusively inside the eastern ORR bounding box.
 */
export function isWithinBoundingBox(
  lat: number,
  lng: number,
  bbox: BoundingBox = ORR_BBOX,
): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= bbox.south &&
    lat <= bbox.north &&
    lng >= bbox.west &&
    lng <= bbox.east
  );
}

/**
 * Returns true if a place represents an under-construction eastern ORR Phase 2A Blue Line metro station.
 *
 * @param name - Display name of the place.
 * @param types - Google Places type list.
 * @param primaryType - Optional primary place type.
 * @returns True if the place should be excluded from operational transit stops.
 */
export function isUnderConstructionOrrMetro(
  name: string,
  types: readonly string[] = [],
  primaryType?: string,
): boolean {
  const allTypes = new Set([...types, ...(primaryType ? [primaryType] : [])]);
  if (allTypes.has("subway_station") || allTypes.has("light_rail_station")) {
    return true;
  }
  return /\b(namma\s+metro|metro\s+station|metro\s+pillar)\b/i.test(name);
}

/**
 * Resolves the closest eastern ORR neighbourhood anchor label for a coordinate.
 *
 * @param lat - Place latitude.
 * @param lng - Place longitude.
 * @returns Human-readable neighbourhood label.
 */
export function nearestNeighbourhood(lat: number, lng: number): string {
  let bestLabel: string = ORR_NEIGHBOURHOOD_ANCHORS[0].label;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const anchor of ORR_NEIGHBOURHOOD_ANCHORS) {
    const dist = haversineKm(lat, lng, anchor.lat, anchor.lng);
    if (dist < bestDist) {
      bestDist = dist;
      bestLabel = anchor.label;
    }
  }
  return bestLabel;
}

const NON_CAMPUS_TECH_PARK_TYPES = new Set([
  "restaurant", "meal_takeaway", "sandwich_shop", "cafe", "bakery",
  "beauty_salon", "hair_care", "spa", "bus_stop", "bus_station",
  "transit_station", "parking", "parking_lot",
]);

/**
 * Returns true if a tech_park search hit is actually an in-campus shop, eatery, bus stop, or gate room.
 *
 * @param name - Display name of the place.
 * @param types - Google Places type list.
 * @param primaryType - Optional primary place type.
 * @returns True when the hit should not be listed as an office campus.
 */
export function isNonCampusTechParkSubvenue(
  name: string,
  types: readonly string[] = [],
  primaryType?: string,
): boolean {
  if ((primaryType && NON_CAMPUS_TECH_PARK_TYPES.has(primaryType)) || types.some((t) => NON_CAMPUS_TECH_PARK_TYPES.has(t))) {
    return true;
  }
  return /\b(security\s+room|gate\s+\d+|salon|subway|kitchen|parking)\b/i.test(name);
}

/**
 * Filters, validates, categorises, and deduplicates raw Places API (New) items.
 *
 * @param batches - Pairs of target PlaceCategory and raw Google Places items.
 * @param bbox - Bounding rectangle to enforce.
 * @returns Deterministically sorted array of unique VerifiedPlace records.
 */
export function normaliseAndDedupePlaces(
  batches: ReadonlyArray<{ category: PlaceCategory; items: readonly RawGooglePlace[] }>,
  bbox: BoundingBox = ORR_BBOX,
): VerifiedPlace[] {
  const byId = new Map<string, VerifiedPlace>();
  const seenTechParkNames = new Set<string>();

  for (const batch of batches) {
    for (const raw of batch.items) {
      const id = raw.id?.trim();
      const name = raw.displayName?.text?.trim();
      const lat = raw.location?.latitude;
      const lng = raw.location?.longitude;
      if (!id || !name || typeof lat !== "number" || typeof lng !== "number") {
        continue;
      }
      if (
        raw.businessStatus === "CLOSED_PERMANENTLY" ||
        raw.businessStatus === "CLOSED_TEMPORARILY"
      ) {
        continue;
      }
      if (!isWithinBoundingBox(lat, lng, bbox)) {
        continue;
      }
      if (
        batch.category === "transit_stop" &&
        isUnderConstructionOrrMetro(name, raw.types ?? [], raw.primaryType)
      ) {
        continue;
      }
      if (batch.category === "tech_park") {
        if (isNonCampusTechParkSubvenue(name, raw.types ?? [], raw.primaryType)) {
          continue;
        }
        const canonicalCampus = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seenTechParkNames.has(canonicalCampus)) {
          continue;
        }
        seenTechParkNames.add(canonicalCampus);
      }
      if (byId.has(id)) {
        continue;
      }
      const shortAddress =
        raw.shortFormattedAddress?.trim() || raw.formattedAddress?.trim() || "Outer Ring Road, Bengaluru";
      const googleMapsUri =
        raw.googleMapsUri?.trim() ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`;

      const place: VerifiedPlace = {
        id,
        name,
        category: batch.category,
        neighbourhood: nearestNeighbourhood(lat, lng),
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        shortAddress,
        googleMapsUri,
        ...(raw.primaryType ? { primaryType: raw.primaryType } : {}),
      };
      byId.set(id, place);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Decodes a Google Maps encoded polyline string into GeoJSON [lng, lat] coordinate pairs.
 *
 * @param encoded - Google polyline5 encoded string from Routes API v2.
 * @returns Array of [longitude, latitude] pairs.
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);
    const dLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);
    const dLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coordinates.push([Number((lng / 1e5).toFixed(6)), Number((lat / 1e5).toFixed(6))]);
  }

  return coordinates;
}
