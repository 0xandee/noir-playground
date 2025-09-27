import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ProfilingService } from "./profiling.service";
import { ProfileOpcodesDto } from "./dto/profile-opcodes.dto";
import { ProfilingResult } from "./interfaces/profiling-result.interface";

@Controller("profile")
export class ProfilingController {
  constructor(private readonly profilingService: ProfilingService) {}

  @Post("opcodes")
  @HttpCode(HttpStatus.OK)
  async profileOpcodes(
    @Body() dto: ProfileOpcodesDto,
  ): Promise<ProfilingResult> {
    return this.profilingService.profileOpcodes(dto);
  }

  @Get("check-profiler")
  async checkProfiler() {
    return this.profilingService.checkProfilerAvailability();
  }
}
