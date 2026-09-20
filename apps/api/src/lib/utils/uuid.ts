// apps/api/src/lib/utils/uuid.ts
export function uuidToCloid(uuid: string): string {
  return `0x${uuid.replace(/-/g, "")}`;
}

export function cloidToUuid(cloid: string): string {
  const hex = cloid.replace(/^0x/, "");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
