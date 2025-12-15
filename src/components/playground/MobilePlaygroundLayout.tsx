import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorPanel } from "./EditorPanel";
import { ConsolePanel } from "./ConsolePanel";
import { ToolsPanel } from "./ToolsPanel";

interface MobilePlaygroundLayoutProps {
    editorProps: React.ComponentProps<typeof EditorPanel>;
    consoleProps: React.ComponentProps<typeof ConsolePanel>;
    toolsProps: React.ComponentProps<typeof ToolsPanel>;
}

export const MobilePlaygroundLayout: React.FC<MobilePlaygroundLayoutProps> = ({
    editorProps,
    consoleProps,
    toolsProps
}) => {
    return (
        <div className="h-full flex flex-col safe-area-inset-top safe-area-inset-bottom w-full max-w-[100vw] overflow-hidden m-0 p-0">
            <Tabs defaultValue="editor" className="h-full flex flex-col w-full m-0 p-0">
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0 h-[48px] shrink-0 sticky top-0 z-10 m-0">
                    <TabsTrigger
                        value="editor"
                        className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background h-full text-base m-0"
                    >
                        Code
                    </TabsTrigger>
                    <TabsTrigger
                        value="console"
                        className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background h-full text-base m-0"
                    >
                        Console
                    </TabsTrigger>
                    <TabsTrigger
                        value="tools"
                        className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background h-full text-base m-0"
                    >
                        Tools
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="editor" forceMount className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden h-full overflow-hidden w-full m-0 p-0">
                    <EditorPanel {...editorProps} />
                </TabsContent>

                <TabsContent value="console" forceMount className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden h-full overflow-hidden w-full m-0 p-0">
                    <ConsolePanel {...consoleProps} isMobile={true} />
                </TabsContent>

                <TabsContent value="tools" forceMount className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden h-full overflow-hidden w-full m-0 p-0">
                    <ToolsPanel {...toolsProps} />
                </TabsContent>
            </Tabs>
        </div>
    );
};
