export interface NoirExample {
  id: string;
  name: string;
  description: string;
  code: string;
  inputs: Record<string, string>;
}

export const noirExamples: NoirExample[] = [
  {
    id: "basic-types",
    name: "Basic Types",
    description: "Simple function with Field, u32, and boolean parameters",
    code: `pub fn main(x: Field, y: pub Field, z: u32, flag: bool) -> pub Field {
    x + y + z as Field
}`,
    inputs: {
      x: "42",
      y: "100", 
      z: "25",
      flag: "1"
    }
  },
  {
    id: "array-types",
    name: "Array Types", 
    description: "Working with arrays of different types",
    code: `pub fn main(data: [Field; 4], pub_array: pub [u32; 8], indices: [bool; 3]) -> pub Field {
    data[0] + pub_array[0] as Field
}`,
    inputs: {
      data: "[10, 20, 30, 40]",
      pub_array: "[1, 2, 3, 4, 5, 6, 7, 8]",
      indices: "[1, 0, 1]"
    }
  },
  {
    id: "mixed-types",
    name: "Mixed Types",
    description: "Complex function with various parameter types and assertions", 
    code: `pub fn main(
    private_key: Field,
    public_input: pub u64,
    message: [Field; 32],
    signature: pub [Field; 2],
    verify_flag: bool
) -> pub Field {
    let result = private_key + public_input as Field;
    assert(verify_flag);
    result
}`,
    inputs: {
      private_key: "123456789",
      public_input: "987654321",
      message: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]",
      signature: "[111111, 222222]",
      verify_flag: "1"
    }
  },
  {
    id: "cryptographic",
    name: "Cryptographic Example",
    description: "Pedersen hash and merkle path verification",
    code: `pub fn main(
    secret: Field,
    nonce: u32,
    merkle_path: [Field; 8],
    pub_root: pub Field
) -> pub Field {
    // Compute hash of secret and nonce
    let computed_hash = std::hash::pedersen_hash([secret, nonce as Field]);
    
    // Simple merkle path verification (compute hash with first element)
    let path_hash = std::hash::pedersen_hash([computed_hash, merkle_path[0]]);
    
    // Basic constraints
    assert(secret != 0);
    assert(path_hash != 0);
    
    // Return the computed hash as proof
    computed_hash
}`,
    inputs: {
      secret: "777888999",
      nonce: "12345", 
      merkle_path: "[1, 2, 3, 4, 5, 6, 7, 8]",
      pub_root: "999888777"
    }
  },
  {
    id: "complex-structures",
    name: "Complex Data Structures",
    description: "Multiple arrays and complex data types",
    code: `pub fn main(
    balance: u64,
    transactions: [Field; 16],
    pub_total: pub u128,
    valid_txs: [bool; 16],
    timestamp: u32
) -> pub Field {
    let sum = balance as Field + pub_total as Field;
    sum
}`,
    inputs: {
      balance: "1000000",
      transactions: "[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600]",
      pub_total: "5000000",
      valid_txs: "[1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1]",
      timestamp: "1640995200"
    }
  },
  {
    id: "current-example",
    name: "Current Example",
    description: "The default playground example with assertions",
    code: `pub fn main(x: Field, y: pub Field) -> pub Field {
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
    inputs: {
      x: "10",
      y: "25"
    }
  }
];