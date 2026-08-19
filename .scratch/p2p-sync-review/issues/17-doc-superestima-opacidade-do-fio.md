# Issue 17: A documentação promete mais opacidade do que o fio entrega

Status: ready-for-agent
Severity: menor (só documentação)
Source: Cripto e protocolo - REPORT.md

## What

O prefixo de 4 bytes fica fora da criptografia (`protocol.rs:81-83`) e
`frame_len = plaintext_len + 16` exatamente (`noise.rs:52-54`). Um observador passivo lê o
tamanho exato de cada arquivo transferido, o comprimento do path pedido, e a assinatura fixa
de abertura 0x30 / 0x60 / 0x40 das três mensagens do XXpsk3. Como `MAX_FRAME_LEN` é 65535, os
bytes 2 e 3 de todo prefixo são sempre 0x00, o que dados aleatórios não têm.

Nenhum conteúdo de nota é exposto, e não existe correção de código em escopo: prefixo de
tamanho fora do AEAD é inerente a qualquer stream cifrado delimitado por tamanho (TLS, SSH e o
próprio Noise Socket vazam o mesmo). Só padding por frame removeria o canal.

O defeito real é de redação: três lugares afirmam opacidade total.

## How

Ajustar o texto em `docs/SYNC.md:3`, `docs/SYNC.md:96` e no doc comment de
`src-tauri/src/sync/noise.rs:7`, trocando "indistinguível de dados aleatórios" por algo como
"o conteúdo é opaco, mas tamanhos e fronteiras de frame são visíveis a um observador da LAN".

Nenhuma mudança de comportamento, nenhum teste novo.
