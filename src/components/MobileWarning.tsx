import { Monitor, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MobileWarning = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Monitor className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Desktop Required</CardTitle>
          <CardDescription>
            This application is optimized for desktop use only
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Smartphone className="h-6 w-6 opacity-50" />
              <span className="text-xs">Mobile</span>
            </div>
            <div className="text-2xl">→</div>
            <div className="flex flex-col items-center gap-2">
              <Monitor className="h-6 w-6 text-primary" />
              <span className="text-xs">Desktop</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Please access this site from a desktop or laptop computer to use the Noir code playground with all its features.
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileWarning;