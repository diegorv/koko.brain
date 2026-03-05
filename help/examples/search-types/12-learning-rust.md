---
tags: [learning, programming, rust]
date: 2025-01-07
---

# Rust Learning Notes

## Ownership & Borrowing
The ownership system is Rust's most unique feature. Every value has a single owner, and when the owner goes out of scope, the value is dropped.

```rust
let s1 = String::from("hello");
let s2 = s1; // s1 is MOVED to s2, s1 is no longer valid
// println!("{s1}"); // This would fail to compile!
```

### Borrowing rules
1. You can have **either** one mutable reference OR any number of immutable references
2. References must always be valid (no dangling pointers)

```rust
let mut s = String::from("hello");
let r1 = &s;     // OK: immutable borrow
let r2 = &s;     // OK: another immutable borrow
// let r3 = &mut s; // ERROR: can't borrow as mutable while immutable borrows exist
```

## Error Handling
Rust doesn't have exceptions. Instead it uses `Result<T, E>` for recoverable errors and `panic!` for unrecoverable ones.

```rust
use std::fs::File;

fn read_config() -> Result<String, std::io::Error> {
    let content = std::fs::read_to_string("config.toml")?; // ? propagates errors
    Ok(content)
}
```

## Pattern Matching
`match` is exhaustive — you must handle every possible case.

```rust
enum Command {
    Quit,
    Echo(String),
    Move { x: i32, y: i32 },
}

match command {
    Command::Quit => println!("Quitting"),
    Command::Echo(msg) => println!("{msg}"),
    Command::Move { x, y } => println!("Moving to ({x}, {y})"),
}
```

## What I find hard
- Lifetimes annotation syntax (`'a`) — when do I actually need them?
- The borrow checker fighting me on tree/graph data structures
- Async Rust is significantly more complex than sync code
