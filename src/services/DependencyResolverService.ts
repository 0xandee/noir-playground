import { parse } from 'smol-toml';

export interface GitDependency {
  name: string;
  git: string;
  tag: string;
  directory?: string;
}

export interface DependencyResolutionResult {
  success: boolean;
  dependencies: GitDependency[];
  totalResolved?: number;
  error?: string;
}

interface GitHubFile {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

/**
 * Service for resolving and fetching git dependencies from Nargo.toml
 */
export class DependencyResolverService {
  /**
   * Parse Nargo.toml and extract git dependencies
   */
  parseDependencies(cargoToml: string): GitDependency[] {
    try {
      const parsed = parse(cargoToml) as any;
      const dependencies: GitDependency[] = [];

      if (!parsed.dependencies) {
        return dependencies;
      }

      for (const [name, config] of Object.entries(parsed.dependencies)) {
        if (typeof config === 'object' && config !== null) {
          const depConfig = config as any;

          // Only process git dependencies
          if (depConfig.git && depConfig.tag) {
            dependencies.push({
              name,
              git: depConfig.git,
              tag: depConfig.tag,
              directory: depConfig.directory
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error('Failed to parse Nargo.toml:', error);
      return [];
    }
  }

  /**
   * Extract GitHub repo owner and name from git URL
   */
  private parseGitHubUrl(gitUrl: string): { owner: string; repo: string } | null {
    // Support both HTTPS and git@ URLs
    const httpsMatch = gitUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);

    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2]
      };
    }

    return null;
  }

  /**
   * Fetch file tree from GitHub API for a specific tag
   */
  private async fetchGitHubTree(owner: string, repo: string, tag: string): Promise<GitHubFile[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${tag}?recursive=1`;

    try {
      const response = await window.fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.tree || [];
    } catch (error) {
      throw new Error(`Failed to fetch file tree for ${owner}/${repo}@${tag}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch raw file content from GitHub
   */
  private async fetchFileContent(owner: string, repo: string, tag: string, filePath: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${filePath}`;

    try {
      const response = await window.fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      throw new Error(`Failed to fetch file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filter files to only include relevant source files for the dependency
   */
  private filterDependencyFiles(files: GitHubFile[], directory?: string): GitHubFile[] {
    // Filter to only include .nr files and Nargo.toml
    let filtered = files.filter(file =>
      file.type === 'blob' &&
      (file.path.endsWith('.nr') || file.path.endsWith('Nargo.toml'))
    );

    // If a directory is specified, filter to only files in that directory
    if (directory) {
      const dirPrefix = directory.endsWith('/') ? directory : directory + '/';
      filtered = filtered.filter(file => file.path.startsWith(dirPrefix));
    }

    return filtered;
  }

  /**
   * Convert Nargo.toml git dependencies to path dependencies
   */
  private convertGitToPathDependencies(cargoToml: string, dependencies: GitDependency[]): string {
    try {
      const parsed = parse(cargoToml) as any;

      if (!parsed.dependencies) {
        return cargoToml;
      }

      // Replace git dependencies with path dependencies
      for (const dep of dependencies) {
        if (parsed.dependencies[dep.name]) {
          parsed.dependencies[dep.name] = { path: `../${dep.name}` };
        }
      }

      // Reconstruct the TOML manually to preserve formatting
      let result = '';

      // Copy everything before [dependencies] section
      const beforeMatch = cargoToml.match(/([\s\S]*?)\[dependencies\]/);
      if (beforeMatch) {
        result = beforeMatch[1] + '[dependencies]';
      } else {
        result = cargoToml.split('[dependencies]')[0] + '[dependencies]';
      }

      // Add the modified dependencies
      result += '\n';
      for (const [key, value] of Object.entries(parsed.dependencies)) {
        if (typeof value === 'object' && value !== null) {
          const depObj = value as any;
          if (depObj.path) {
            result += `${key} = { path = "${depObj.path}" }\n`;
          } else {
            // Keep non-git dependencies as-is
            result += `${key} = ${JSON.stringify(value)}\n`;
          }
        } else {
          result += `${key} = ${JSON.stringify(value)}\n`;
        }
      }

      return result;
    } catch (error) {
      console.warn('Failed to convert git to path dependencies, using simpler approach:', error);

      // Fallback: simple regex replacement
      let modified = cargoToml;
      for (const dep of dependencies) {
        // Match the dependency line more flexibly
        const depPattern = new RegExp(
          `(${dep.name}\\s*=\\s*\\{)[^}]*(\\})`,
          'gm'
        );
        modified = modified.replace(depPattern, `$1 path = "../${dep.name}" $2`);
      }
      return modified;
    }
  }

  /**
   * Resolve a single dependency recursively (including its transitive dependencies)
   */
  private async resolveDependency(
    dep: GitDependency,
    fileManager: any,
    resolved: Set<string>,
    onProgress?: (message: string) => void
  ): Promise<void> {
    // Skip if already resolved
    if (resolved.has(dep.name)) {
      return;
    }

    resolved.add(dep.name);

    onProgress?.(`Fetching ${dep.name} from ${dep.git}@${dep.tag}...`);

    const repoInfo = this.parseGitHubUrl(dep.git);
    if (!repoInfo) {
      throw new Error(`Invalid GitHub URL: ${dep.git}`);
    }

    // Fetch file tree
    const files = await this.fetchGitHubTree(repoInfo.owner, repoInfo.repo, dep.tag);
    const relevantFiles = this.filterDependencyFiles(files, dep.directory);

    onProgress?.(`Downloading ${relevantFiles.length} files for ${dep.name}...`);

    // Fetch and write each file, and find the Nargo.toml
    let depCargoToml: string | null = null;

    for (const file of relevantFiles) {
      const content = await this.fetchFileContent(
        repoInfo.owner,
        repoInfo.repo,
        dep.tag,
        file.path
      );

      // Determine the write path in the virtual filesystem
      let writePath = file.path;

      // If a subdirectory is specified, strip it from the path
      if (dep.directory) {
        const dirPrefix = dep.directory.endsWith('/') ? dep.directory : dep.directory + '/';
        writePath = file.path.replace(dirPrefix, '');
      }

      // Store Nargo.toml content for parsing transitive dependencies
      if (writePath.endsWith('Nargo.toml')) {
        depCargoToml = content;
      }

      // Write dependencies at the root level, parallel to noir_project
      const fullPath = `${dep.name}/${writePath}`;

      // Convert content to stream
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content));
          controller.close();
        }
      });

      await fileManager.writeFile(fullPath, stream);
    }

    onProgress?.(`✓ ${dep.name} installed`);

    // Recursively resolve transitive dependencies
    if (depCargoToml) {
      const transitiveDeps = this.parseDependencies(depCargoToml);

      if (transitiveDeps.length > 0) {
        onProgress?.(`Resolving ${transitiveDeps.length} ${transitiveDeps.length === 1 ? 'dependency' : 'dependencies'} of ${dep.name}...`);

        // Resolve each transitive dependency recursively
        for (const transitiveDep of transitiveDeps) {
          await this.resolveDependency(transitiveDep, fileManager, resolved, onProgress);
        }

        // Convert this dependency's Nargo.toml to use path dependencies
        const modifiedDepCargoToml = this.convertGitToPathDependencies(depCargoToml, transitiveDeps);

        const cargoStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(modifiedDepCargoToml));
            controller.close();
          }
        });

        await fileManager.writeFile(`${dep.name}/Nargo.toml`, cargoStream);
      }
    }
  }

  /**
   * Resolve and fetch all dependencies recursively, writing them to the file manager
   */
  async resolveDependencies(
    cargoToml: string,
    fileManager: any,
    onProgress?: (message: string) => void
  ): Promise<DependencyResolutionResult> {
    try {
      const dependencies = this.parseDependencies(cargoToml);

      if (dependencies.length === 0) {
        return {
          success: true,
          dependencies: []
        };
      }

      onProgress?.(`Found ${dependencies.length} git ${dependencies.length === 1 ? 'dependency' : 'dependencies'}`);

      // Track all resolved dependencies (including transitive ones)
      const resolved = new Set<string>();
      const allDeps: GitDependency[] = [];

      // Resolve each dependency recursively
      for (const dep of dependencies) {
        await this.resolveDependency(dep, fileManager, resolved, onProgress);
        allDeps.push(dep);
      }

      onProgress?.(`All ${resolved.size} ${resolved.size === 1 ? 'dependency' : 'dependencies'} resolved`);


      // Convert git dependencies to path dependencies in Nargo.toml
      const modifiedCargoToml = this.convertGitToPathDependencies(cargoToml, dependencies);

      // Re-write the Nargo.toml with path dependencies
      const cargoStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(modifiedCargoToml));
          controller.close();
        }
      });

      await fileManager.writeFile(`noir_project/Nargo.toml`, cargoStream);

      return {
        success: true,
        dependencies: allDeps,
        totalResolved: resolved.size
      };
    } catch (error) {
      return {
        success: false,
        dependencies: [],
        error: error instanceof Error ? error.message : 'Unknown error resolving dependencies'
      };
    }
  }
}

export const dependencyResolverService = new DependencyResolverService();
