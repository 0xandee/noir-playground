import { Module } from "@nestjs/common";
import { ProfilingController } from "./profiling.controller";
import { ProfilingService } from "./profiling.service";

@Module({
  controllers: [ProfilingController],
  providers: [ProfilingService],
  exports: [ProfilingService],
})
export class ProfilingModule {}
