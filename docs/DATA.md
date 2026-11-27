# Verified World Data Specification (`docs/DATA.md`)

## 1. Golden Rule
**Zero hallucinated places.** Every tech park, darshini, PG, transit stop, auto stand, cafe, and lake shown on the map or referenced by the Director MUST exist in `data/orr/places.json` with a real Google Maps `place_id` verified via the Places API (New). Unverified, permanently closed, out-of-bounds, or duplicate entries are dropped at build time and rejected at runtime by `server/world/verify.ts`.

## 2. Eastern ORR Bounding Box (`ORR_BBOX` in `shared/config.ts`)
Covers the eastern Outer Ring Road corridor from Silk Board / HSR Layout edge northeast through Agara, Bellandur, Devarabisanahalli, and Kadubeesanahalli to Marathahalli (including the Sarjapur Road junction):

```ts
export const ORR_BBOX = {
  south: 12.9050, // South of Silk Board & Sarjapur junction
  west:  77.6100, // West of Silk Board flyover & HSR Sector 6 edge
  north: 12.9750, // North of Marathahalli bridge & Doddanekundi edge
  east:  77.7150, // East of Marathahalli / Kadubeesanahalli tech corridor
} as const;
```

Any coordinate outside `[12.9050..12.9750] N, [77.6100..77.7150] E` is strictly discarded.

## 3. Seed Tech Parks & Neighbourhood Anchors (Input Queries to Verify)

### 3.1 Office Picker Anchors (`category: "tech_park"`)
`scripts/verify-places.ts` queries Places API (New) Text Search for these eastern ORR tech parks and retains only verified open matches inside `ORR_BBOX`:
1. `RMZ EcoWorld Bellandur Bengaluru`
2. `RMZ Ecospace Bellandur Bengaluru`
3. `Embassy TechVillage Devarabisanahalli Bengaluru`
4. `Prestige Tech Park Kadubeesanahalli Bengaluru`
5. `Cessna Business Park Kadubeesanahalli Bengaluru`
6. `Global Technology Park Bellandur Bengaluru`
7. `Vaishnavi Tech Park Sarjapur Outer Ring Road Bengaluru`
8. `Bagmane Constellation Business Park Marathahalli ORR Bengaluru`

### 3.2 Neighbourhood Anchors (for Candidate Grouping & Survival Kit Commutes)
Each verified place is tagged with its nearest ORR neighbourhood anchor by Haversine distance:
- `Marathahalli` (`12.9569, 77.7011`)
- `Kadubeesanahalli` (`12.9392, 77.6953`)
- `Devarabisanahalli` (`12.9315, 77.6848`)
- `Bellandur` (`12.9260, 77.6762`)
- `Sarjapur Road Junction` (`12.9237, 77.6675`)
- `Agara & HSR Layout` (`12.9185, 77.6412`)
- `Silk Board` (`12.9177, 77.6238`)

### 3.3 Mission Place Categories
Queried per neighbourhood anchor (`7 anchors x 5 categories`) inside `ORR_BBOX` so edge tech parks have balanced local density:
- `darshini`: South Indian breakfast darshinis, Udupi tiffin rooms, filter coffee stands
- `pg_coliving`: Paying guest accommodations, co-living spaces, hostels
- `transit_stop`: BMTC bus stops, ORR feeder bus bays, and auto-rickshaw stands *(explicitly excludes under-construction Namma Metro Phase 2A Blue Line ORR stations from Silk Board to Marathahalli so the Director never sends players to unbuilt metro stations)*
- `lake_park`: Bellandur Lake viewpoints, Agara Lake park, neighbourhood parks
- `cafe_daily`: Everyday cafes, bakeries, supermarkets near tech parks

**Candidate Radius Fallback (`server/world/candidates.ts`):** Selects verified places within `3.0 km` of `officePlaceId` first; if fewer than `8` total candidates or `0` places in a needed category are within `3.0 km`, expands deterministically to `5.0 km` within `ORR_BBOX`.

## 4. Places API (New) Verification Method (`scripts/verify-places.ts`)
- **Endpoint:** `POST https://places.googleapis.com/v1/places:searchText`
- **Headers:**
  - `Content-Type: application/json`
  - `X-Goog-Api-Key: process.env.MAPS_SERVER_KEY` (never exposed to browser)
  - `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`
  - `X-Goog-FieldMask: places.id,places.displayName,places.location,places.types,places.primaryType,places.formattedAddress,places.shortFormattedAddress,places.businessStatus,places.googleMapsUri` *(strictly Pro SKU fields; zero Enterprise SKU fields)*
- **Body:**
  ```json
  {
    "textQuery": "<category query>",
    "regionCode": "IN",
    "languageCode": "en",
    "locationRestriction": {
      "rectangle": {
        "low": { "latitude": 12.9050, "longitude": 77.6100 },
        "high": { "latitude": 12.9750, "longitude": 77.7150 }
      }
    }
  }
  ```
- **Filtering & Deduplication Pipeline:**
  1. Drop if `businessStatus` is `"CLOSED_PERMANENTLY"` or `"CLOSED_TEMPORARILY"`.
  2. Drop if `location.latitude` or `location.longitude` falls outside `ORR_BBOX` (defensive double-check).
  3. Deduplicate by `place.id`, keeping deterministic alphabetical order by `id`.
  4. Derive `category` (`PlaceCategory`) and nearest `neighbourhood` (`NeighbourhoodId`).

## 5. `data/orr/places.json` Schema (`VerifiedPlacesDataset`)

```ts
export type PlaceCategory =
  | "tech_park"
  | "darshini"
  | "pg_coliving"
  | "transit_stop"
  | "lake_park"
  | "cafe_daily";

export interface VerifiedPlace {
  id: string;                     // Google Maps place_id (e.g., "ChIJ...")
  name: string;                   // displayName.text from Places API (New)
  category: PlaceCategory;
  neighbourhood: string;          // Nearest ORR anchor label
  lat: number;
  lng: number;
  shortAddress: string;           // shortFormattedAddress or formattedAddress
  googleMapsUri: string;          // Official Maps URI for Confirm Sheet exit
  primaryType?: string;
}

export interface VerifiedPlacesDataset {
  verifiedAt: string;             // ISO-8601 UTC timestamp (refresh <= 30 days per Maps ToS)
  bbox: { south: number; west: number; north: number; east: number };
  totalCount: number;
  places: VerifiedPlace[];
}
```

## 6. `data/orr/corridor.geojson` Specification (`scripts/build-corridor.ts`)
- **Endpoint:** `POST https://routes.googleapis.com/directions/v2:computeRoutes`
- **Headers:** `X-Goog-Api-Key`, `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`, `X-Goog-FieldMask: routes.polyline.encodedPolyline,routes.distanceMeters`
- **Route:** Origin Marathahalli Bridge (`12.9569, 77.7011`) -> intermediate `via: true` waypoints along Kadubeesanahalli (`12.9392, 77.6953`), Bellandur (`12.9260, 77.6762`), and Agara (`12.9212, 77.6455`) -> Destination Silk Board Junction (`12.9177, 77.6238`), `travelMode: "DRIVE"`.
- **Output:** Decoded standard GeoJSON `Feature<LineString>` (`[lng, lat]` coordinate pairs) with `properties: { generatedAt, distanceMeters, source: "Google Routes API v2" }`.

## 7. Compliance & Terms of Service Notes
- Google Maps content is never used for model training or fine-tuning.
- `places.json` records `verifiedAt` and must be refreshed within 30 calendar days under Google Maps Platform Service Specific Terms.
- `<Map>` in React sets `internalUsageAttributionIds={["gmp_git_agentskills_v1"]}` and uses `AdvancedMarkerElement` with a valid `mapId`.
- Dataset summary table (counts per category and per neighbourhood) is appended here automatically by `scripts/verify-places.ts` in Phase 1 (`T1.1`).
