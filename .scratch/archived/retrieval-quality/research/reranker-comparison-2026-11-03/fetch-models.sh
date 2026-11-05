#!/bin/bash
# Downloads the cross-encoders compared in ../reranker-comparison-2026-11-03.md
# into $MODELS (default /tmp/rerank-models), one directory each, as
# model.onnx + tokenizer.json (the names Reranker::load expects), and checks
# every file against the sha256 Hugging Face publishes for it.
#
#   MODELS=~/rerank-models bash fetch-models.sh
set -u
MODELS="${MODELS:-/tmp/rerank-models}"
# repo | file inside the repo | local directory
while IFS='|' read -r repo remote dir; do
	d="$MODELS/$dir"; mkdir -p "$d"
	for pair in "$remote:model.onnx" "tokenizer.json:tokenizer.json"; do
		rf="${pair%%:*}"; lf="${pair##*:}"
		want=$(curl -s -m 30 "https://huggingface.co/api/models/$repo?blobs=true" | python3 -I -c "
import sys,json
for s in json.load(sys.stdin)['siblings']:
    if s['rfilename']=='$rf': print((s.get('lfs') or {}).get('sha256',''))
")
		echo "== $dir/$lf"
		curl -sL -m 1800 -o "$d/$lf" "https://huggingface.co/$repo/resolve/main/$rf"
		got=$(shasum -a 256 "$d/$lf" | cut -d' ' -f1)
		if [ -n "$want" ] && [ "$want" = "$got" ]; then echo "   OK sha256"; else echo "   CHECK got=$got want=$want"; fi
	done
done <<'LIST'
cross-encoder/mmarco-mMiniLMv2-L12-H384-v1|onnx/model_qint8_arm64.onnx|mmarco-mminilm-qint8
onnx-community/gte-multilingual-reranker-base|onnx/model_int8.onnx|gte-multilingual-int8
onnx-community/bge-reranker-v2-m3-ONNX|onnx/model_fp16.onnx|bge-m3-fp16
jinaai/jina-reranker-v2-base-multilingual|onnx/model_int8.onnx|jina-v2-int8
LIST
