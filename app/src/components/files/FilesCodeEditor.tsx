import { lazy, Suspense } from "react";
import { PhobosSpinner } from "../navigation/PhobosSpinner";
import type { FilesEditorViewState } from "./filesPaneSnapshot";

const PierreFileEditor = lazy(() => import("./FilesPierreEditor"));
const ReadonlyFileViewer = lazy(() => import("./FilesReadonlyViewer"));

export function FilesCodeEditor({ documentId, filename, initialViewState, label, onChange, onViewStateChange, value, wordWrap }: {
  documentId: string;
  filename: string;
  label: string;
  onChange?: (value: string) => void;
  initialViewState?: FilesEditorViewState;
  onViewStateChange?: (state: FilesEditorViewState) => void;
  value: string;
  wordWrap: boolean;
}) {
  return <Suspense fallback={<div aria-label={onChange ? "Loading editor" : "Loading file"} className="os-files-loading" role="status"><PhobosSpinner /></div>}>
    {onChange
      ? <PierreFileEditor documentId={documentId} filename={filename} initialViewState={initialViewState} key={documentId} label={label} onChange={onChange} onViewStateChange={onViewStateChange} value={value} wordWrap={wordWrap} />
      : <ReadonlyFileViewer documentId={documentId} filename={filename} key={documentId} label={label} value={value} wordWrap={wordWrap} />}
  </Suspense>;
}
