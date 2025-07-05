export interface Slide {
  id: number;
  title: string;
  content: React.ReactNode;
  hasVideo?: boolean;
  videoUrl?: string;
}
