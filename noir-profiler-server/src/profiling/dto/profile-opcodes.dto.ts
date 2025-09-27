import { IsObject, IsString, IsOptional } from "class-validator";

export class ProfileOpcodesDto {
  @IsObject()
  artifact: any; // Circuit artifact object

  @IsString()
  sourceCode: string; // Noir source code

  @IsString()
  @IsOptional()
  cargoToml?: string; // Cargo.toml content (optional)
}
