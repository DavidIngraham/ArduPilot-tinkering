export interface AppletDefinition {
  id: string;
  title: string;
  page: string;
  /** Source HTML, relative to the viewer workspace; page is the stable public URL. */
  html: string;
  entry: string;
  kind: "replay" | "explanation" | "simulator";
  assets: string[];
  controls: string[];
  defaultCamera: "orbit" | "follow" | "comparison";
}
