// Exact local originals shipped in public/educational; arbitrary paths/hosts remain invalid.
export const bundledImages = {
  painting: "./educational/13ac40933e78d807.jpg",
  lear: "./educational/23be21a1f50dc48b.png",
  elephant: "./educational/1d49c2794cc7c4a0.png",
  lion: "./educational/7fa1a9ee987659e1.png",
  whale: "./educational/bfdd8a9844a8e5e5.png",
  polarBear: "./educational/799bb0f5816cb728.png",
};
export const isBundledImage = (src: string) =>
  Object.values(bundledImages).includes(src);
