export interface AppletDefinition {
  id: string;
  title: string;
  page: string;
  entry: string;
  kind: "replay" | "explanation" | "simulator";
  assets: string[];
  controls: string[];
  defaultCamera: "orbit" | "follow" | "comparison";
}
