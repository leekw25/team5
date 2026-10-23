# 핏로그 안드로이드 앱 (TWA)

배포된 PWA(https://fitlog-team5.vercel.app)를 그대로 담은 안드로이드 앱. 화면·기능을 바꾸면 웹만 다시 배포하면 앱에도 바로 반영된다.
APK를 다시 만들어야 하는 건 앱 이름·아이콘·패키지 설정을 바꿀 때뿐이다.

- 패키지 이름: `com.markany.fitlog`, 최소 안드로이드 7.0(SDK 24)
- 설정: `twa-manifest.json` (이것만 git에 올리고, 안드로이드 프로젝트는 이걸로 다시 만든다)
- 서명 키: `twa/.local/fitlog.keystore`, 비밀번호 `twa/.local/keystore-password.env` — **git에 올리지 않는다. 잃어버리면 같은 앱으로 업데이트할 수 없으니 따로 백업한다.**
- 사이트 소유 확인: `public/.well-known/assetlinks.json` (서명 키 SHA-256과 같아야 주소창이 안 보인다)

## 다시 빌드하기 (Git Bash, team5/twa 폴더에서)

준비물: JDK 17, `~/.bubblewrap/android_sdk`(Android SDK), `~/.bubblewrap/config.json`.

```bash
set -a && . .local/keystore-password.env && set +a
npx -y @bubblewrap/cli@1.27.0 update --skipVersionUpgrade   # 안드로이드 프로젝트 생성/갱신 (버전 올릴 땐 옵션 빼기)
export JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.17.10-hotspot" ANDROID_HOME="$(cygpath -w ~/.bubblewrap/android_sdk)"
cmd //c "$(cygpath -w "$PWD/gradlew.bat")" assembleRelease
BT=~/.bubblewrap/android_sdk/build-tools/36.1.0
"$BT/zipalign.exe" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk aligned.apk
cmd //c "$(cygpath -w "$BT/apksigner.bat")" sign --ks .local/fitlog.keystore --ks-key-alias fitlog \
  --ks-pass env:BUBBLEWRAP_KEYSTORE_PASSWORD --key-pass env:BUBBLEWRAP_KEY_PASSWORD --out fitlog.apk aligned.apk
```

`bubblewrap build`를 쓰지 않는 이유: 이 PC 셸은 현재 폴더의 프로그램을 바로 실행하지 않게 설정돼 있어(`NoDefaultCurrentDirectoryInExePath`) bubblewrap 내부의 `gradlew.bat` 호출이 실패한다. 그래서 같은 단계를 전체 경로로 직접 실행한다.
