declare const x: any;
export const y = (x ?? []).map((r) => r);
export const z = x.map((r) => r);
