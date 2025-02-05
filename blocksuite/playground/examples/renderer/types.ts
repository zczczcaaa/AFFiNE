export interface SentenceLayout {
  text: string;
  rects: TextRect[];
}

export interface ParagraphLayout {
  sentences: SentenceLayout[];
  scale: number;
}

export interface TextRect {
  rect: DOMRect;
  text: string;
}
