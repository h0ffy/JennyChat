#!/bin/bash
## Llama CPP

echo "Run server Llama in /opt/llama-cpp/bin/llama-server"

cd /opt/llama-cpp

bin/llama-server -m jemma2.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 4096 \
  --threads $(nproc) \
  --chat-template chatml \

