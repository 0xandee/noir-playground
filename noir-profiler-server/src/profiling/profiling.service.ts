import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import {
  writeFile,
  mkdir,
  readdir,
  readFile,
  unlink,
  rmdir,
} from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { ProfileOpcodesDto } from "./dto/profile-opcodes.dto";
import {
  ProfilingResult,
  SvgResult,
  CircuitMetrics,
  CircuitFunctionMetrics,
} from "./interfaces/profiling-result.interface";
import { ConfigService } from "@nestjs/config";

const execAsync = promisify(exec);

@Injectable()
export class ProfilingService {
  private readonly logger = new Logger(ProfilingService.name);
  private readonly baseDataPath: string;
  private readonly backendPath: string;

  constructor(private configService: ConfigService) {
    this.baseDataPath = this.configService.getOrThrow<string>("noir.dataPath");
    this.backendPath =
      this.configService.getOrThrow<string>("noir.backendPath");
  }

  async profileOpcodes(dto: ProfileOpcodesDto): Promise<ProfilingResult> {
    let artifactPath: string | null = null;
    let requestDir: string | null = null;

    try {
      this.logger.log("Artifact JSON parsed successfully");

      // Create unique request directory
      const requestId = randomUUID();
      requestDir = join(this.baseDataPath, requestId);
      const outputPath = join(requestDir, "output");
      artifactPath = join(requestDir, "circuit.json");

      // Create directories
      await mkdir(requestDir, { recursive: true });
      await mkdir(outputPath, { recursive: true });

      // Write the artifact object as JSON to the temporary file
      await writeFile(artifactPath, JSON.stringify(dto.artifact), "utf-8");

      // Write source code to a temporary file
      const sourceCodePath = join(requestDir, "src", "main.nr");
      await mkdir(join(requestDir, "src"), { recursive: true });
      await writeFile(sourceCodePath, dto.sourceCode, "utf-8");

      // Write Cargo.toml if provided
      let cargoTomlPath: string | null = null;
      if (dto.cargoToml) {
        cargoTomlPath = join(requestDir, "Nargo.toml");
        await writeFile(cargoTomlPath, dto.cargoToml, "utf-8");
      }

      this.logger.log(
        `Created temporary files: artifact=${artifactPath}, source=${sourceCodePath}${cargoTomlPath ? `, cargo=${cargoTomlPath}` : ""}`,
      );

      // Execute noir-profiler opcodes command with source code
      const opcodesCommand = `noir-profiler opcodes --artifact-path "${artifactPath}" --output "${outputPath}"`;
      this.logger.log(`Executing opcodes command: ${opcodesCommand}`);
      await execAsync(opcodesCommand);

      // Execute noir-profiler gates command with source code and backend path
      const gatesCommand = `noir-profiler gates --artifact-path "${artifactPath}" --backend-path "${this.backendPath}" --output "${outputPath}" -- --include_gates_per_opcode`;
      this.logger.log(`Executing gates command: ${gatesCommand}`);
      const gatesOutput = await execAsync(gatesCommand);

      // Parse gates output to extract total gates count
      const totalGates = this.parseGatesOutput(gatesOutput.stdout);

      // Run nargo info to get circuit statistics
      this.logger.log("Running nargo info to get circuit statistics...");
      const circuitMetrics = await this.getCircuitMetrics(requestDir);

      // Update circuitMetrics with total gates from gates profiling
      circuitMetrics.totalGates = totalGates;

      // Look for all generated SVG files
      const files = await readdir(outputPath);
      const svgFiles = files.filter((file) => file.endsWith(".svg"));

      if (svgFiles.length === 0) {
        return {
          success: false,
          error: "No SVG files generated",
        };
      }

      // Process all SVG files
      const svgs: SvgResult[] = [];
      for (const svgFile of svgFiles) {
        const svgPath = join(outputPath, svgFile);
        const svgContent = await readFile(svgPath, "utf-8");

        // Extract function name and type from filename
        const functionMatch = svgFile.match(
          /^(.+?)_(?:acir_opcodes|brillig_opcodes|gates)\.svg$/,
        );
        const functionName = functionMatch ? functionMatch[1] : "unknown";

        let type = "unknown";
        if (svgFile.includes("acir_opcodes")) type = "acir_opcodes";
        else if (svgFile.includes("brillig_opcodes")) type = "brillig_opcodes";
        else if (svgFile.includes("gates")) type = "gates";

        svgs.push({
          content: svgContent,
          filename: svgFile,
          function: functionName,
          type,
        });
      }

      return {
        success: true,
        svgs,
        circuitMetrics,
      };
    } catch (error) {
      this.logger.error("Profiling error:", error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Clean up entire request directory (including all SVGs, artifacts, and generated files)
      this.logger.log(`Cleaning up request directory: ${requestDir}`);
      await this.cleanupRequestDir(requestDir);
    }
  }

  async checkProfilerAvailability(): Promise<{
    available: boolean;
    version?: string;
    message: string;
  }> {
    try {
      const { stdout } = await execAsync("noir-profiler --version");
      return {
        available: true,
        version: stdout.trim(),
        message: "Noir profiler is available",
      };
    } catch (error) {
      return {
        available: false,
        message:
          "Noir profiler is not available. Make sure it's installed and in PATH.",
      };
    }
  }

  private async cleanupRequestDir(requestDir: string | null): Promise<void> {
    if (requestDir) {
      try {
        // Remove the entire request directory and all its contents
        await this.removeDirectoryRecursive(requestDir);
        this.logger.log("Cleaned up request directory");
      } catch (error) {
        this.logger.warn("Failed to cleanup request directory:", error.message);
      }
    }
  }

  private async removeDirectoryRecursive(dirPath: string): Promise<void> {
    try {
      const files = await readdir(dirPath);
      for (const file of files) {
        const filePath = join(dirPath, file);
        try {
          await unlink(filePath);
        } catch {
          // If it's a directory, remove it recursively
          await this.removeDirectoryRecursive(filePath);
        }
      }
      await rmdir(dirPath);
    } catch (error) {
      this.logger.warn(`Failed to remove directory ${dirPath}:`, error.message);
    }
  }

  private async getCircuitMetrics(projectDir: string): Promise<CircuitMetrics> {
    try {
      // Change to the project directory and run nargo info
      const nargoCommand = `cd "${projectDir}" && nargo info`;
      this.logger.log(`Executing nargo info command: ${nargoCommand}`);

      const { stdout } = await execAsync(nargoCommand);

      return this.parseCircuitMetricsOutput(stdout);
    } catch (error) {
      this.logger.warn("Failed to get nargo info:", error.message);
      return {
        totalAcirOpcodes: 0,
        totalBrilligOpcodes: 0,
        totalGates: 0,
        functions: [],
      };
    }
  }

  private parseCircuitMetricsOutput(output: string): CircuitMetrics {
    try {
      const lines = output.trim().split("\n");
      const functions: CircuitFunctionMetrics[] = [];
      let totalAcirOpcodes = 0;
      let totalBrilligOpcodes = 0;

      // Skip header lines (first 2 lines)
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes("+---")) continue;

        // Parse table row: | package | function | expression_width | acir_opcodes | brillig_opcodes |
        const parts = line
          .split("|")
          .map((part) => part.trim())
          .filter((part) => part);

        if (parts.length >= 5) {
          const packageName = parts[0];
          const functionName = parts[1];
          const expressionWidth = parts[2];
          const acirOpcodes = parseInt(parts[3]) || 0;
          const brilligOpcodes = parseInt(parts[4]) || 0;

          functions.push({
            package: packageName,
            function: functionName,
            expressionWidth,
            acirOpcodes,
            brilligOpcodes,
          });

          totalAcirOpcodes += acirOpcodes;
          totalBrilligOpcodes += brilligOpcodes;
        }
      }

      return {
        totalAcirOpcodes,
        totalBrilligOpcodes,
        totalGates: 0, // Will be updated by parseGatesOutput
        functions,
      };
    } catch (error) {
      this.logger.warn("Failed to parse nargo info output:", error.message);
      return {
        totalAcirOpcodes: 0,
        totalBrilligOpcodes: 0,
        totalGates: 0,
        functions: [],
      };
    }
  }

  private parseGatesOutput(output: string): number {
    try {
      // Parse output like: "Opcode count: 46, Total gates by opcodes: 2902, Circuit size: 2923"
      const match = output.match(/Total gates by opcodes:\s*(\d+)/);
      if (match && match[1]) {
        const totalGates = parseInt(match[1]);
        this.logger.log(`Parsed total gates: ${totalGates}`);
        return totalGates;
      }

      // Fallback: try to parse "Circuit size: 2923"
      const circuitSizeMatch = output.match(/Circuit size:\s*(\d+)/);
      if (circuitSizeMatch && circuitSizeMatch[1]) {
        const totalGates = parseInt(circuitSizeMatch[1]);
        this.logger.log(`Parsed total gates from circuit size: ${totalGates}`);
        return totalGates;
      }

      this.logger.warn("Could not parse gates output, using 0");
      return 0;
    } catch (error) {
      this.logger.warn("Failed to parse gates output:", error.message);
      return 0;
    }
  }
}
