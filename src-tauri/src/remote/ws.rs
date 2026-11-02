//! The WebSocket subset the browser session needs (RFC 6455): the opening
//! handshake and unextended frames. No compression, no subprotocols. SHA-1
//! is written out here because only the handshake needs it and no crate in
//! the lockfile provides it.

use std::io::{self, Read, Write};

use base64::Engine;

/// GUID appended to the client key (RFC 6455 section 1.3).
const ACCEPT_GUID: &str = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/// Largest message accepted from a client.
pub const MAX_MESSAGE_BYTES: usize = 16 * 1024 * 1024;

/// Frame opcodes this module reads and writes.
pub mod opcode {
	/// Continuation of a fragmented message.
	pub const CONTINUATION: u8 = 0x0;
	/// UTF-8 text.
	pub const TEXT: u8 = 0x1;
	/// Binary data.
	pub const BINARY: u8 = 0x2;
	/// Connection close.
	pub const CLOSE: u8 = 0x8;
	/// Ping.
	pub const PING: u8 = 0x9;
	/// Pong.
	pub const PONG: u8 = 0xA;
}

/// One complete message as the session sees it.
#[derive(Debug, PartialEq, Eq)]
pub enum Message {
	/// A text message (fragments joined).
	Text(String),
	/// A ping with its payload.
	Ping(Vec<u8>),
	/// The peer closed, or sent something this module refuses.
	Close,
}

/// SHA-1 digest (FIPS 180-4). Used only for `Sec-WebSocket-Accept`.
pub fn sha1(data: &[u8]) -> [u8; 20] {
	let mut h: [u32; 5] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
	let mut msg = data.to_vec();
	let bit_len = (data.len() as u64).wrapping_mul(8);
	msg.push(0x80);
	while msg.len() % 64 != 56 {
		msg.push(0);
	}
	msg.extend_from_slice(&bit_len.to_be_bytes());
	for chunk in msg.chunks(64) {
		let mut w = [0u32; 80];
		for i in 0..16 {
			w[i] = u32::from_be_bytes([chunk[4 * i], chunk[4 * i + 1], chunk[4 * i + 2], chunk[4 * i + 3]]);
		}
		for i in 16..80 {
			w[i] = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]).rotate_left(1);
		}
		let [mut a, mut b, mut c, mut d, mut e] = h;
		for (i, wi) in w.iter().enumerate() {
			let (f, k) = match i {
				0..=19 => ((b & c) | (!b & d), 0x5A827999),
				20..=39 => (b ^ c ^ d, 0x6ED9EBA1),
				40..=59 => ((b & c) | (b & d) | (c & d), 0x8F1BBCDC),
				_ => (b ^ c ^ d, 0xCA62C1D6),
			};
			let temp = a.rotate_left(5).wrapping_add(f).wrapping_add(e).wrapping_add(k).wrapping_add(*wi);
			e = d;
			d = c;
			c = b.rotate_left(30);
			b = a;
			a = temp;
		}
		for (slot, v) in h.iter_mut().zip([a, b, c, d, e]) {
			*slot = slot.wrapping_add(v);
		}
	}
	let mut out = [0u8; 20];
	for (i, v) in h.iter().enumerate() {
		out[4 * i..4 * i + 4].copy_from_slice(&v.to_be_bytes());
	}
	out
}

/// The `Sec-WebSocket-Accept` value for a client's `Sec-WebSocket-Key`.
pub fn accept_key(client_key: &str) -> String {
	let digest = sha1(format!("{}{}", client_key.trim(), ACCEPT_GUID).as_bytes());
	base64::engine::general_purpose::STANDARD.encode(digest)
}

/// Writes one unfragmented frame. `mask` is for clients (tests); the server
/// never masks.
pub fn write_frame(w: &mut impl Write, op: u8, payload: &[u8], mask: Option<[u8; 4]>) -> io::Result<()> {
	let mut head = vec![0x80 | op];
	let mask_bit = if mask.is_some() { 0x80 } else { 0 };
	match payload.len() {
		n if n < 126 => head.push(mask_bit | n as u8),
		n if n <= u16::MAX as usize => {
			head.push(mask_bit | 126);
			head.extend_from_slice(&(n as u16).to_be_bytes());
		}
		n => {
			head.push(mask_bit | 127);
			head.extend_from_slice(&(n as u64).to_be_bytes());
		}
	}
	let mut body = payload.to_vec();
	if let Some(key) = mask {
		head.extend_from_slice(&key);
		for (i, b) in body.iter_mut().enumerate() {
			*b ^= key[i % 4];
		}
	}
	head.extend_from_slice(&body);
	w.write_all(&head)?;
	w.flush()
}

/// One raw frame: `(fin, opcode, unmasked payload)`.
pub fn read_frame(r: &mut impl Read) -> io::Result<(bool, u8, Vec<u8>)> {
	let mut head = [0u8; 2];
	r.read_exact(&mut head)?;
	let fin = head[0] & 0x80 != 0;
	if head[0] & 0x70 != 0 {
		return Err(io::Error::new(io::ErrorKind::InvalidData, "reserved bits set"));
	}
	let op = head[0] & 0x0F;
	let masked = head[1] & 0x80 != 0;
	let len = match head[1] & 0x7F {
		126 => {
			let mut b = [0u8; 2];
			r.read_exact(&mut b)?;
			u16::from_be_bytes(b) as usize
		}
		127 => {
			let mut b = [0u8; 8];
			r.read_exact(&mut b)?;
			usize::try_from(u64::from_be_bytes(b)).unwrap_or(usize::MAX)
		}
		n => n as usize,
	};
	if len > MAX_MESSAGE_BYTES {
		return Err(io::Error::new(io::ErrorKind::InvalidData, "frame too large"));
	}
	let mut key = [0u8; 4];
	if masked {
		r.read_exact(&mut key)?;
	}
	let mut payload = vec![0u8; len];
	r.read_exact(&mut payload)?;
	if masked {
		for (i, b) in payload.iter_mut().enumerate() {
			*b ^= key[i % 4];
		}
	}
	Ok((fin, op, payload))
}

/// Reads the next message from a client. A binary message, invalid UTF-8,
/// a stray continuation or an oversized message ends the session as
/// `Close`. Pongs are skipped.
pub fn read_client_message(r: &mut impl Read) -> io::Result<Message> {
	let mut text: Vec<u8> = Vec::new();
	let mut in_text = false;
	loop {
		let (fin, op, payload) = read_frame(r)?;
		match op {
			opcode::PING => return Ok(Message::Ping(payload)),
			opcode::PONG => continue,
			opcode::CLOSE | opcode::BINARY => return Ok(Message::Close),
			opcode::TEXT if !in_text => {
				text = payload;
				in_text = true;
			}
			opcode::CONTINUATION if in_text => text.extend_from_slice(&payload),
			_ => return Ok(Message::Close),
		}
		if text.len() > MAX_MESSAGE_BYTES {
			return Ok(Message::Close);
		}
		if fin {
			return Ok(String::from_utf8(text).map(Message::Text).unwrap_or(Message::Close));
		}
	}
}
