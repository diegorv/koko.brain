use noted_lib::sync::noise_transport::{NoiseTransport, MAX_PAYLOAD_SIZE, NOISE_PATTERN};
use tokio::net::TcpListener;
use tokio::time::Duration;

/// Generates a test X25519 keypair via snow. Returns (public, private).
fn generate_keypair() -> ([u8; 32], [u8; 32]) {
	let builder = snow::Builder::new(NOISE_PATTERN.parse().unwrap());
	let kp = builder.generate_keypair().unwrap();
	let mut pub_key = [0u8; 32];
	let mut priv_key = [0u8; 32];
	pub_key.copy_from_slice(&kp.public);
	priv_key.copy_from_slice(&kp.private);
	(pub_key, priv_key)
}

#[tokio::test]
async fn noise_handshake_valid_passphrase() {
	let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
	let addr = listener.local_addr().unwrap();

	let psk = [42u8; 32];
	let (_, priv_a) = generate_keypair();
	let (_, priv_b) = generate_keypair();

	let accept = tokio::spawn({
		let psk = psk;
		let priv_b = priv_b;
		async move {
			let (stream, _) = listener.accept().await.unwrap();
			NoiseTransport::accept(stream, &psk, &priv_b).await
		}
	});

	let connect = tokio::spawn(async move {
		NoiseTransport::connect(addr, &psk, &priv_a).await
	});

	let (accept_res, connect_res) = tokio::join!(accept, connect);
	let mut server = accept_res.unwrap().unwrap();
	let mut client = connect_res.unwrap().unwrap();

	// Client -> Server
	client.send(1, b"hello from client").await.unwrap();
	let (msg_type, payload) = server.recv().await.unwrap();
	assert_eq!(msg_type, 1);
	assert_eq!(payload, b"hello from client");

	// Server -> Client
	server.send(2, b"hello from server").await.unwrap();
	let (msg_type, payload) = client.recv().await.unwrap();
	assert_eq!(msg_type, 2);
	assert_eq!(payload, b"hello from server");
}

#[tokio::test]
async fn noise_handshake_wrong_passphrase() {
	let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
	let addr = listener.local_addr().unwrap();

	let psk_a = [1u8; 32];
	let psk_b = [2u8; 32]; // Different!
	let (_, priv_a) = generate_keypair();
	let (_, priv_b) = generate_keypair();

	let accept = tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		NoiseTransport::accept(stream, &psk_b, &priv_b).await
	});

	let connect = tokio::spawn(async move {
		NoiseTransport::connect(addr, &psk_a, &priv_a).await
	});

	let (accept_res, connect_res) = tokio::join!(accept, connect);
	let accept_failed = accept_res.unwrap().is_err();
	let connect_failed = connect_res.unwrap().is_err();
	assert!(
		accept_failed || connect_failed,
		"Handshake should fail with mismatched PSK"
	);
}

#[tokio::test]
async fn noise_handshake_timeout() {
	let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
	let addr = listener.local_addr().unwrap();

	let psk = [42u8; 32];
	let (_, priv_a) = generate_keypair();

	// Accept the TCP connection but never perform the Noise handshake
	let _holder = tokio::spawn(async move {
		let (_stream, _) = listener.accept().await.unwrap();
		tokio::time::sleep(Duration::from_secs(10)).await;
	});

	// Use short handshake timeout for fast test
	let result = NoiseTransport::connect_with_timeouts(
		addr,
		&psk,
		&priv_a,
		Duration::from_secs(5),
		Duration::from_millis(200),
	)
	.await;

	assert!(result.is_err(), "Should timeout when peer doesn't respond");
}

#[tokio::test]
async fn message_size_limit() {
	let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
	let addr = listener.local_addr().unwrap();

	let psk = [42u8; 32];
	let (_, priv_a) = generate_keypair();
	let (_, priv_b) = generate_keypair();

	let accept = tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		NoiseTransport::accept(stream, &psk, &priv_b).await.unwrap()
	});

	let mut client = NoiseTransport::connect(addr, &psk, &priv_a)
		.await
		.unwrap();
	let _server = accept.await.unwrap();

	// Payload exceeding 50 MB should be rejected on sender side
	let huge = vec![0u8; MAX_PAYLOAD_SIZE + 1];
	let result = client.send(1, &huge).await;
	assert!(result.is_err(), "Should reject payload > 50MB");
	assert!(result.unwrap_err().contains("too large"));
}
