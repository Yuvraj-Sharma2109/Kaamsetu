declare module 'leaflet' {
  export function map(element: HTMLElement, options?: Record<string, unknown>): any;
  export function tileLayer(url: string, options?: Record<string, unknown>): any;
  export function circleMarker(point: [number, number], options?: Record<string, unknown>): any;
  export function marker(point: [number, number], options?: Record<string, unknown>): any;
  export function divIcon(options?: Record<string, unknown>): any;
  export function polyline(points: [number, number][], options?: Record<string, unknown>): any;
  export function control(options?: Record<string, unknown>): { zoom?: (options?: Record<string, unknown>) => { addTo: (map: any) => void } };
}
