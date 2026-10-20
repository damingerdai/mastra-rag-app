export function makeVectorId(
  versionId: string,
  chunkIndex: number,
) {
  return `${versionId}:${chunkIndex}`;
}