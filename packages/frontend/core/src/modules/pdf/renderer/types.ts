export type PDFMeta = {
  pageCount: number;
  width: number;
  height: number;
};

export type RenderPageOpts = {
  pageNum: number;
  width: number;
  height: number;
  scale?: number;
};

export type RenderedPage = RenderPageOpts & {
  bitmap: ImageBitmap;
};
