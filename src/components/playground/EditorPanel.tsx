import React from "react";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { NoirEditor } from "../NoirEditor";
import { NoirEditorWithHover } from "../NoirEditorWithHover";
import * as monaco from 'monaco-editor';
import { MetricType, CircuitComplexityReport } from "@/types/circuitMetrics";
import { getFileLanguage } from "@/lib/utils";

interface EditorPanelProps {
  files: Record<string, string>;
  activeFile: string;
  setActiveFile: (file: string) => void;
  handleFileChange: (filename: string, content: string) => void;
  handleMainFileChange: (content: string) => void;
  handleShareClick: () => void;
  isRunning: boolean;
  monacoEditorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  enableHeatmap: boolean;
  heatmapMetricType: MetricType;
  setComplexityReport: (report: CircuitComplexityReport | null) => void;
  isMobile?: boolean;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  files,
  activeFile,
  setActiveFile,
  handleFileChange,
  handleMainFileChange,
  handleShareClick,
  isRunning,
  monacoEditorRef,
  enableHeatmap,
  heatmapMetricType,
  setComplexityReport,
  isMobile = false
}) => {
  return (
    <section className="h-full flex flex-col" aria-label="Code Editor">
      {/* Code Editor Header with File Tabs */}
      <header className="" style={{ backgroundColor: 'rgb(30, 30, 30)' }}>
        {/* File Tabs */}
        <div className="flex items-center justify-between px-4 py-2 h-[49px] border-b border-border">
          <div className="flex items-stretch h-8 overflow-x-auto rounded-sm tab-scrollbar" style={{ backgroundColor: '#191819' }}>
            {Object.keys(files).map((filename) => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${activeFile === filename
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                style={{ fontSize: '13px' }}
              >
                {filename}
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <Button
              onClick={handleShareClick}
              variant="ghost"
              size="sm"
              title="Share"
              className="flex items-center gap-1 h-7 px-2"
            >
              <Link2 className="h-4 w-4" />
              {!isMobile && <span className="select-none" style={{ fontSize: '13px' }}>Share</span>}
            </Button>
          </div>
        </div>
      </header>

      {/* Code Editor */}
      <div className="flex-1">
        {activeFile === 'main.nr' ? (
          <NoirEditorWithHover
            ref={monacoEditorRef}
            value={files[activeFile]}
            onChange={(content) => {
              handleMainFileChange(content);
            }}
            disabled={isRunning}
            language={getFileLanguage(activeFile)}
            cargoToml={files["Nargo.toml"]}
            enableHeatmap={enableHeatmap}
            heatmapMetricType={heatmapMetricType}
            onComplexityReport={setComplexityReport}
          />
        ) : (
          <NoirEditor
            ref={monacoEditorRef}
            value={files[activeFile] || ''}
            onChange={(content) => {
              handleFileChange(activeFile, content);
            }}
            disabled={isRunning}
            language={getFileLanguage(activeFile)}
          />
        )}
      </div>
    </section>
  );
};

