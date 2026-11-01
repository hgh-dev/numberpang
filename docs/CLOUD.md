# Codex Cloud에서 이어서 개발하기

저장소: https://github.com/hgh-dev/numberpang

## 환경 설정값

- 저장소: `hgh-dev/numberpang`
- 기본 브랜치: `main`
- Node.js: 22 이상 (`.nvmrc`: 22)
- Python: 3
- 수동 설정 스크립트: `bash scripts/cloud-setup.sh`
- 유지보수 스크립트: `bash scripts/cloud-setup.sh`
- 환경 변수·비밀 키: 없음
- 외부 패키지: 없음. 테스트와 빌드에 인터넷이 필요하지 않습니다.

환경에서 저장소를 선택하고 위 명령을 설정 스크립트에 입력하세요. 파일만 저장한다고 Cloud 계정에 환경이 자동 등록되는 것은 아닙니다. 환경 등록은 웹의 환경 만들기에서 진행합니다.

설정 스크립트는 버전 확인, 문법 검사, 엔진 테스트 14개, 배포용 dist 생성을 수행합니다. 검증 명령과 게임 규칙은 루트 AGENTS.md에도 있습니다.

## 수정 요청 예시

“AGENTS.md를 읽고, 게임 규칙은 유지하면서 숫자판의 글자를 조금 더 크게 해줘. npm run check, npm test, npm run build를 실행하고 PR을 만들어줘.”

수정 결과를 확인하고 PR을 main에 병합하면 GitHub Actions가 자동 검증·배포합니다. 배포에는 저장소 Settings → Pages → Source를 GitHub Actions로 설정해야 합니다. 이 설정은 최초 한 번만 필요합니다.

## 미리보기

`npm run dev`는 0.0.0.0:4173에서 실행됩니다. 클라우드 환경이 제공하는 포트 미리보기 기능으로 접근하세요. 외부에서 클라우드 컨테이너의 localhost 주소로 직접 접속할 수는 없습니다.

## 공식 설명

https://learn.chatgpt.com/docs/environments/cloud-environment
