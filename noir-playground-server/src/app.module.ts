import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ProfilingModule } from "./profiling/profiling.module";
import { AppConfigModule } from "./config/config.module";

@Module({
  imports: [AppConfigModule, ProfilingModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
