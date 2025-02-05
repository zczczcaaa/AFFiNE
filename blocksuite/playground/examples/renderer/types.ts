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

export interface SectionLayout {
  paragraphs: ParagraphLayout[];
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
