#!/usr/bin/env node

/**
 * Simple test script for the Noir Playground Server
 * Run with: node test-server.js
 */

const BASE_URL = 'http://localhost:4000';

async function testServer() {

    try {
        // Test 1: Health check
        const healthResponse = await fetch(`${BASE_URL}/api/health`);
        const health = await healthResponse.json();

        // Test 2: Check profiler availability
        const profilerResponse = await fetch(`${BASE_URL}/api/profile/check-profiler`);
        const profilerStatus = await profilerResponse.json();

        // Test 3: Test profiling with JSON artifact

        const sampleArtifact = { "noir_version": "1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68", "hash": "13406761233232836770", "abi": { "parameters": [{ "name": "x", "type": { "kind": "field" }, "visibility": "private" }, { "name": "y", "type": { "kind": "field" }, "visibility": "public" }], "return_type": { "abi_type": { "kind": "field" }, "visibility": "public" }, "error_types": {} }, "bytecode": "H4sIAAAAAAAA/9VZbXKiQBBtBI2KH6uCrh5iixFQ+LW5SsziMfdsu8TpqsmAWoTXBrsq1RNGm/6afg906CK7/3+/9NrT2qGq8LVXraN2ooC2ItNfV9Jh17gR242jQ5IUx32hYvUW7fNTlkZJejpkKlNplv7ZZ3FcZEl2zE/5McpVEhfqnObxWRt+ZNIdkkm6J+mwJ5T00naPqtIDx9DVAtaE/lXbyr5g5rWv9YAbxNW63PhrXRsYTrB47ZyrOCtVkIZNGVlNqfqEa/AByTSKfTja+omM+eVGzE1tmz35ovu0yaRG5gURC8tQ0uEh3Z+eTe8zJNxhHQHjlcrhiO6jaNP7jAg7DNAoP9Bxt0Xe+F0V0dvhPTpfBFnvMTCH5nAp7f6my3C5xki6zL1r3BVhEb7WE04IJ7DcsFnEhKoswm3nXMVZ01Zb5PcJ16gTeg7kR8Y8JRnkn9Ljkd8nGeSfSTo8Izzyzwh3WOfUbeQvczgnPPLPqdvIP9Fxo5EfWe8fJIP8pd17yI8eusDHQtUCaCpIXxO6CItYaL0k+swYlnT/vUNXk9+WfSyAMS6FmgI9cBe4WkSPpO7P+AJwpXXACeFDV27Y1D0geeqOfGm3IlxTBiRTXDSKIGMOSYa6h/R46r4Cx8KylnR4TXjqvibcYd0A45XK4Ybw1H1D2GGARqJAx42m7sh6/wTm0Bwupd1npu4tgObbqPtW6x03MxdjR89F3QPCsY8tMMadUFOgB+6WsIORxQX7ibQFpP2qR9ihWMewHEPz2jzMvB5ZOjS+5wJjZvuBjP2Pn55tCY11YMVp5uIV5APb4z7uU1V61h5/dmj55+D9U7Yvbs29WD49MmoJr/g6NuwAa7pn+76M/dqeGRtr39rj2nk133Ou/N+z9K3P3npCmtbssU2ulekvx/EPSjcifmYoAAA=", "debug_symbols": "pZPBjoMgFEX/hbULeaBgf2UyaailDQlBQ7XJpOm/zytXO51Fk4mzeUfAc4kPuYmjP8znfUin4SJ2HzdxyCHGcN7HoXdTGBLP3u6VWIf7KXvPU+Jlna3RZZ8msUtzjJW4ujiXly6jS4WTy7xaV8KnI5MDTyH6x9O9+rHr96qszSJLqZ5683efnr7a4pPsFp9Ib/HVuj9ps8Vv1uZRY/+3/zbfNqvfbeqfoTf+J49cH/KvP07UfFCVkKUSS5VQpWqx05VoSm1LNaXaUrtSZQ1IgAAFIEByAn+QbAEDWKAroBqQAAEK0ABSiFNahgEs0BUoTuHOKwkQoAANNEALGMACXYFGiuYUyyBAAZzyONGry8Edol8u7GlO/cv9nb7GdWW94WMeen+cs390vqzxWXwD", "file_map": { "50": { "source": "pub fn main(x: Field, y: pub Field) -> pub Field {\n    // Verify that x and y are both non-zero\n    assert(x != 0);\n    assert(y != 0);\n    \n    // Compute the sum and verify it's greater than both inputs\n    let sum = x + y;\n    assert(sum as u64 > x as u64);\n    assert(sum as u64 > y as u64);\n    \n    // Return the sum as proof output\n    sum\n}", "path": "/Users/ted/SuperData/working/research/aztec/hello_world/src/main.nr" } }, "names": ["main"], "brillig_names": ["directive_invert", "directive_integer_quotient"] };

        try {
                  const profileResponse = await fetch(`${BASE_URL}/api/profile/opcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact: sampleArtifact,
          sourceCode: `pub fn main(x: Field, y: pub Field) -> pub Field {
    // Verify that x and y are both non-zero
    assert(x != 0);
    assert(y != 0);
    
    // Compute the sum and verify it's greater than both inputs
    let sum = x + y;
    assert(sum as u64 > x as u64);
    assert(sum as u64 > y as u64);
    
    // Return the sum as proof output
    sum
}`,
          cargoToml: `[package]
name = "hello_world"
version = "0.1.0"
type = "bin"

[dependencies]
noir_std = { git = "https://github.com/noir-lang/noir", tag = "v0.25.0" }`
        })
      });

            const result = await profileResponse.json();

                  if (result.success) {
        // Profiling successful
      } else {
        // Profiling failed
      }
        } catch (error) {
            // Profiling error
        }

    } catch (error) {
        // Server test failed
    }
}

// Run tests
async function main() {
    await testServer();
    // Test completed
}

main();
