#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --version
npm --version
python3 --version
# 외부 패키지가 없어 인터넷이나 비밀 키 없이 환경을 준비할 수 있습니다.
node -e "if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 이상을 선택하세요.');"
npm run check
npm test
npm run build
