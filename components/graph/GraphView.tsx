'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { bounds, layout, type LayoutEdge } from '@/lib/graph/layout';
import { useStrings } from '@/components/providers/StringsProvider';
import { format } from '@/lib/i18n/format';

/**
 * Renders the document link graph as an interactive SVG.
 *
 * The layout is computed once from a deterministic seed, so the graph looks the
 * same on every visit — a graph that rearranges itself each time is hard to
 * build any familiarity with. Hovering a node dims everything it is not
 * connected to, which is the only practical way to read a dense graph.
 *
 * The viewport is a camera over that fixed layout rather than a second layout:
 * dragging pans, the wheel or a pinch zooms about the pointer, and the buttons
 * in the corner do the same for anyone without a wheel or a touch screen. The
 * graph itself never moves — the camera does.
 */

/** A node as supplied by the server. */
export interface GraphViewNode {
  path: string;
  title: string;
  url: string;
  degree: number;
}

interface GraphViewProps {
  nodes: GraphViewNode[];
  edges: LayoutEdge[];
  /** Page to mark as the one being read, when the graph is centred on one */
  activePath?: string;
  /** Height utility class; the default suits a full page of its own */
  heightClass?: string;
}

/** Nominal layout area; the SVG viewBox scales the result to fit. */
const AREA = { width: 900, height: 640 };

/** Node radius bounds, interpolated by link count. */
const MIN_RADIUS = 5;
const MAX_RADIUS = 14;

/** Smallest and largest zoom levels the camera allows. */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

/** How far a press may wander before it stops being a click. */
const CLICK_SLOP = 4;

/** A camera: how the layout is translated and scaled into the viewport. */
interface Camera {
  x: number;
  y: number;
  /** 1 shows the layout exactly as the viewBox fits it */
  k: number;
}

export function GraphView({ nodes, edges, activePath, heightClass = 'h-[70vh]' }: GraphViewProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, k: 1 });
  // True while a pointer is down, so the cursor can say the graph is draggable.
  const [dragging, setDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  // Pointers currently down, keyed by pointer id. `sx`/`sy` record where each
  // press began, in CSS pixels, so a click can be told from a drag afterwards.
  const pointersRef = useRef(new Map<number, { x: number; y: number; sx: number; sy: number }>());
  // Path of the node a press began on, if any.
  const pressPathRef = useRef<string | null>(null);
  // A press that became a two-finger pinch must never be read as a click.
  const pinchedRef = useRef(false);

  const t = useStrings();

  const positions = useMemo(() => {
    const settled = layout(
      nodes.map((node) => node.path),
      edges,
      AREA,
    );

    return new Map(settled.map((node) => [node.id, node]));
  }, [nodes, edges]);

  const box = useMemo(() => bounds([...positions.values()]), [positions]);

  const maxDegree = useMemo(() => Math.max(1, ...nodes.map((node) => node.degree)), [nodes]);

  const nodeByPath = useMemo(() => new Map(nodes.map((node) => [node.path, node])), [nodes]);

  /** Paths connected to the hovered node, including itself. */
  const connected = useMemo(() => {
    if (!hovered) return null;

    const set = new Set<string>([hovered]);
    for (const edge of edges) {
      if (edge.from === hovered) set.add(edge.to);
      if (edge.to === hovered) set.add(edge.from);
    }
    return set;
  }, [hovered, edges]);

  // A different graph is a different canvas: start its camera over again.
  const layoutRef = useRef(positions);
  useEffect(() => {
    if (layoutRef.current !== positions) {
      layoutRef.current = positions;
      setCamera({ x: 0, y: 0, k: 1 });
    }
  }, [positions]);

  /**
   * Converts a screen coordinate to SVG user coordinates.
   *
   * The svg's own matrix already accounts for the viewBox fit and any
   * transform on an ancestor, so a wheel zoom stays anchored on the node the
   * cursor is over rather than wherever the layout happens to sit.
   */
  const toUser = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: box.x, y: box.y };

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const matrix = svg.getScreenCTM();
      if (matrix) {
        const mapped = point.matrixTransform(matrix.inverse());
        return { x: mapped.x, y: mapped.y };
      }

      // No screen transform yet; fall back to the fitted box itself.
      const rect = svg.getBoundingClientRect();
      const fit = Math.min(rect.width / box.width, rect.height / box.height);
      return {
        x: box.x + (clientX - rect.left - (rect.width - box.width * fit) / 2) / fit,
        y: box.y + (clientY - rect.top - (rect.height - box.height * fit) / 2) / fit,
      };
    },
    [box],
  );

  const clampZoom = useCallback((k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k)), []);

  /** Zooms by `factor`, keeping the graph point under the anchor stationary. */
  const zoomBy = useCallback(
    (factor: number, anchorX: number, anchorY: number) => {
      setCamera((view) => {
        const k = clampZoom(view.k * factor);
        if (k === view.k) return view;

        const ratio = k / view.k;
        return {
          k,
          x: anchorX - (anchorX - view.x) * ratio,
          y: anchorY - (anchorY - view.y) * ratio,
        };
      });
    },
    [clampZoom],
  );

  /** Pans the graph by a delta measured in SVG user coordinates. */
  const panBy = useCallback((dx: number, dy: number) => {
    setCamera((view) => ({ ...view, x: view.x + dx, y: view.y + dy }));
  }, []);

  /** Zooms about the middle of the viewport, for the corner buttons. */
  const zoomByViewportCenter = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const anchor = toUser(rect.left + rect.width / 2, rect.top + rect.height / 2);
      zoomBy(factor, anchor.x, anchor.y);
    },
    [toUser, zoomBy],
  );

  const resetView = useCallback(() => setCamera({ x: 0, y: 0, k: 1 }), []);

  // Native, not React's onWheel: that one is registered passively, and zooming
  // must be allowed to stop the page scrolling under the graph.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = toUser(event.clientX, event.clientY);
      zoomBy(Math.exp(-event.deltaY * 0.0015), anchor.x, anchor.y);
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [toUser, zoomBy]);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // Secondary buttons still select text or open a context menu.
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const anchor = toUser(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, {
      x: anchor.x,
      y: anchor.y,
      sx: event.clientX,
      sy: event.clientY,
    });

    const target = event.target as Element | null;
    const link = target?.closest('[data-graph-path]');
    pressPathRef.current = link?.getAttribute('data-graph-path') ?? null;
    pinchedRef.current = pointersRef.current.size > 1;

    if (!pinchedRef.current) setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = pointersRef.current.get(event.pointerId);
    if (!current) return;

    const anchor = toUser(event.clientX, event.clientY);

    // One pointer: pan, whatever the pointer began as — the click check that
    // matters happens on release, from how far the press actually travelled.
    if (pointersRef.current.size === 1) {
      panBy(anchor.x - current.x, anchor.y - current.y);
      pointersRef.current.set(event.pointerId, { ...current, x: anchor.x, y: anchor.y });
      return;
    }

    // Two pointers: pinch. The pair's previous spread and midpoint give the
    // zoom and pan for this move; measuring both lets either finger drive it.
    const [firstId, secondId] = [...pointersRef.current.keys()];
    const first = pointersRef.current.get(firstId);
    const second = pointersRef.current.get(secondId);
    if (!first || !second) return;

    pinchedRef.current = true;
    const previousDistance = Math.hypot(first.x - second.x, first.y - second.y);
    const previousMidX = (first.x + second.x) / 2;
    const previousMidY = (first.y + second.y) / 2;

    pointersRef.current.set(event.pointerId, { ...current, x: anchor.x, y: anchor.y });

    const movedFirst = pointersRef.current.get(firstId);
    const movedSecond = pointersRef.current.get(secondId);
    if (!movedFirst || !movedSecond) return;

    const nextDistance = Math.hypot(movedFirst.x - movedSecond.x, movedFirst.y - movedSecond.y);
    const nextMidX = (movedFirst.x + movedSecond.x) / 2;
    const nextMidY = (movedFirst.y + movedSecond.y) / 2;

    if (previousDistance > 0) zoomBy(nextDistance / previousDistance, previousMidX, previousMidY);
    panBy(nextMidX - previousMidX, nextMidY - previousMidY);
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = pointersRef.current.get(event.pointerId);
    const moved =
      current === undefined
        ? CLICK_SLOP + 1
        : Math.hypot(event.clientX - current.sx, event.clientY - current.sy);

    // A press that stayed put on a node is a click; one that travelled is a
    // pan, which the reader was doing instead of asking for the page.
    if (current && pointersRef.current.size === 1 && !pinchedRef.current) {
      const path = pressPathRef.current;
      if (path && moved <= CLICK_SLOP) {
        const node = nodeByPath.get(path);
        if (node) router.push(node.url);
      }
    }

    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      pressPathRef.current = null;
      pinchedRef.current = false;
      setDragging(false);
      if (moved > CLICK_SLOP) setHovered(null);
    }
  };

  const onPointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      pressPathRef.current = null;
      pinchedRef.current = false;
      setDragging(false);
    }
  };

  if (nodes.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t.graphEmpty}</p>
    );
  }

  const atReset = camera.x === 0 && camera.y === 0 && camera.k === 1;

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <svg
        ref={svgRef}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        className={`${heightClass} w-full touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        // `group`, not `img`: an image's children are presentational, so the
        // focusable nodes inside were pruned from the accessibility tree and
        // a keyboard reader tabbed through stops that announced nothing.
        role="group"
        aria-label={format(t.graphLabel, { pages: nodes.length, links: edges.length })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
          <g>
            {edges.map((edge, index) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              if (!from || !to) return null;

              const active = !connected || (connected.has(edge.from) && connected.has(edge.to));

              return (
                <line
                  key={`${edge.from}->${edge.to}-${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="stroke-gray-300 dark:stroke-gray-700"
                  strokeWidth={active ? 1.4 : 0.6}
                  opacity={active ? 0.9 : 0.15}
                />
              );
            })}
          </g>

          <g>
            {nodes.map((node) => {
              const position = positions.get(node.path);
              if (!position) return null;

              const radius =
                MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(node.degree / maxDegree);
              const active = !connected || connected.has(node.path);
              const isCurrent = node.path === activePath;

              return (
                <g
                  key={node.path}
                  data-graph-path={node.path}
                  transform={`translate(${position.x}, ${position.y})`}
                  opacity={active ? 1 : 0.2}
                  className={dragging ? 'cursor-grabbing' : 'cursor-pointer'}
                  onMouseEnter={() => setHovered(node.path)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(node.path)}
                  onBlur={() => setHovered(null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(node.url);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={node.title}
                >
                  <circle
                    r={isCurrent ? radius + 2 : radius}
                    className={
                      isCurrent
                        ? // The page being read is filled solid rather than tinted,
                          // so it is findable in its own neighbourhood at a glance.
                          'fill-blue-600 stroke-white dark:fill-blue-400 dark:stroke-gray-900'
                        : hovered === node.path
                          ? 'fill-blue-500 stroke-white dark:stroke-gray-900'
                          : 'fill-blue-400/80 stroke-white dark:fill-blue-500/70 dark:stroke-gray-900'
                    }
                    strokeWidth={1.5}
                  />
                  <text
                    y={radius + 12}
                    textAnchor="middle"
                    className={`pointer-events-none text-[11px] ${isCurrent ? 'fill-gray-900 font-semibold dark:fill-gray-100' : 'fill-gray-700 dark:fill-gray-300'}`}
                  >
                    {node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          onClick={() => zoomByViewportCenter(1 / 1.25)}
          disabled={camera.k <= MIN_ZOOM}
          aria-label={t.graphZoomOut}
          title={t.graphZoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => zoomByViewportCenter(1.25)}
          disabled={camera.k >= MAX_ZOOM}
          aria-label={t.graphZoomIn}
          title={t.graphZoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={resetView}
          disabled={atReset}
          aria-label={t.graphResetView}
          title={t.graphResetView}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
