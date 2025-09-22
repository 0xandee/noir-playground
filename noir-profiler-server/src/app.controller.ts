import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  getHealth(): { status: string; message: string; timestamp: string } {
    return {
      status: "OK",
      message: "Noir Playground Server is running",
      timestamp: new Date().toISOString(),
    };
  }
}
