/**
 * Feature: Glowing ORR Corridor SVG Overlay Layer
 * Purpose: Renders the verified GeoJSON corridor LineString in a Google Maps DOM OverlayView above the desaturated base-map canvas so the neon pink route stays 100% vivid.
 * Inputs: GeoJSONLineStringFeature coordinates ([lng, lat][]).
 * Outputs: Custom google.maps.OverlayView SVG path synced on zoom/pan and cleaned up on unmount.
 * Deliberately excludes: Legacy DirectionsService or canvas-bound polylines muted by base-map filters.
 */
import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { GeoJSONLineStringFeature } from "@apna-area/shared";

export interface CorridorLayerProps {
  corridor: GeoJSONLineStringFeature;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const PAD_PX = 4000;

/**
 * Mounts a vector SVG corridor spline inside Google Maps overlayLayer so it glows crisply above monochrome map tiles.
 *
 * @param props - Verified corridor GeoJSON feature.
 * @returns Null (manages OverlayView lifecycle imperatively).
 */
export function CorridorLayer({ corridor }: CorridorLayerProps): null {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps?.OverlayView) {
      return;
    }

    class CorridorSvgOverlay extends google.maps.OverlayView {
      private svgEl: SVGSVGElement | null = null;
      private glowPath: SVGPathElement | null = null;
      private corePath: SVGPathElement | null = null;

      override onAdd(): void {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.style.position = "absolute";
        svg.style.left = `${-PAD_PX}px`;
        svg.style.top = `${-PAD_PX}px`;
        svg.style.width = `${PAD_PX * 2}px`;
        svg.style.height = `${PAD_PX * 2}px`;
        svg.style.pointerEvents = "none";
        svg.style.overflow = "visible";

        const glow = document.createElementNS(SVG_NS, "path");
        glow.setAttribute("fill", "none");
        glow.setAttribute("stroke", "rgba(255, 79, 160, 0.28)");
        glow.setAttribute("stroke-width", "14");
        glow.setAttribute("stroke-linecap", "round");
        glow.setAttribute("stroke-linejoin", "round");

        const core = document.createElementNS(SVG_NS, "path");
        core.setAttribute("fill", "none");
        core.setAttribute("stroke", "#FF4FA0");
        core.setAttribute("stroke-width", "4");
        core.setAttribute("stroke-linecap", "round");
        core.setAttribute("stroke-linejoin", "round");

        svg.appendChild(glow);
        svg.appendChild(core);
        this.svgEl = svg;
        this.glowPath = glow;
        this.corePath = core;

        const panes = this.getPanes();
        panes?.overlayLayer.appendChild(svg);
      }

      override draw(): void {
        const projection = this.getProjection();
        if (!projection || !this.glowPath || !this.corePath) {
          return;
        }
        const parts: string[] = [];
        corridor.geometry.coordinates.forEach(([lng, lat], idx) => {
          const pt = projection.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
          if (pt) {
            const x = (pt.x + PAD_PX).toFixed(1);
            const y = (pt.y + PAD_PX).toFixed(1);
            parts.push(`${idx === 0 ? "M" : "L"}${x} ${y}`);
          }
        });
        const d = parts.join(" ");
        this.glowPath.setAttribute("d", d);
        this.corePath.setAttribute("d", d);
      }

      override onRemove(): void {
        this.svgEl?.remove();
        this.svgEl = null;
        this.glowPath = null;
        this.corePath = null;
      }
    }

    const overlay = new CorridorSvgOverlay();
    overlay.setMap(map);

    return () => {
      overlay.setMap(null);
    };
  }, [map, corridor]);

  return null;
}
