//! A minimal WebSocket client for the `/ws` tests: handshake, masked
//! frames out, frames in.

#![allow(dead_code)]

use std::io::{Read, Write};
use std::net::{Ipv4Addr, TcpStream};
use std::time::Duration;

use kokobrain_lib::remote::ws::{opcode, read_frame, write_frame};
use serde_json::{json, Value};

/// A client connected to `/ws` past the 101.
pub struct WsClient {
	stream: TcpStream,
}

impl WsClient {
	/// Opens `/ws` with the Host and Origin the server expects.
	pub fn open(port: u16) -> Self {
		let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).expect("connect");
		stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
		let req = format!(
			"GET /ws HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nOrigin: http://127.0.0.1:{port}\r\n\
			 Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\
			 Sec-WebSocket-Version: 13\r\n\r\n"
		);
		stream.write_all(req.as_bytes()).unwrap();
		let mut head = Vec::new();
		let mut byte = [0u8; 1];
		while !head.ends_with(b"\r\n\r\n") {
			stream.read_exact(&mut byte).expect("101 head");
			head.push(byte[0]);
		}
		let head = String::from_utf8(head).unwrap();
		assert!(head.starts_with("HTTP/1.1 101"), "{head}");
		assert!(head.contains("Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo="), "{head}");
		Self { stream }
	}

	/// Sends one JSON text message, masked as a browser does.
	pub fn send(&mut self, value: &Value) {
		write_frame(&mut self.stream, opcode::TEXT, value.to_string().as_bytes(), Some([1, 2, 3, 4])).unwrap();
	}

	/// `send` that reports a failed write instead of panicking.
	pub fn try_send(&mut self, value: &Value) -> bool {
		write_frame(&mut self.stream, opcode::TEXT, value.to_string().as_bytes(), Some([1, 2, 3, 4])).is_ok()
	}

	/// The next text message, `None` on close or a closed socket.
	pub fn recv_raw(&mut self) -> Option<Value> {
		loop {
			let (_, op, payload) = read_frame(&mut self.stream).ok()?;
			match op {
				opcode::TEXT => return serde_json::from_slice(&payload).ok(),
				opcode::CLOSE => return None,
				_ => continue,
			}
		}
	}

	/// The next text message; panics when there is none.
	pub fn recv(&mut self) -> Value {
		self.recv_raw().expect("a message")
	}

	/// Sends an `invoke` and returns its reply (skipping notifications).
	pub fn invoke(&mut self, id: u64, cmd: &str, args: Value) -> Value {
		self.invoke_with(id, cmd, args, Value::Null)
	}

	/// `invoke` with `headers`.
	pub fn invoke_with(&mut self, id: u64, cmd: &str, args: Value, headers: Value) -> Value {
		self.send(&json!({
			"jsonrpc": "2.0", "id": id, "method": "invoke",
			"params": { "cmd": cmd, "args": args, "headers": headers },
		}));
		loop {
			let reply = self.recv();
			if reply["id"] == id {
				return reply;
			}
		}
	}
}

/// Opens `/ws`, sends hello and returns the client with the welcome.
pub fn connect_session(port: u16) -> (WsClient, Value) {
	let mut client = WsClient::open(port);
	client.send(&json!({ "jsonrpc": "2.0", "method": "hello", "params": { "proto": 1 } }));
	let welcome = client.recv();
	(client, welcome)
}
