# 📱 네이티브 앱 빌드 가이드

이 가이드는 Capacitor를 사용하여 웹앱을 iOS 및 Android 네이티브 앱으로 변환하는 방법을 설명합니다.

---

## 🎯 개요

**Capacitor**는 웹 코드를 거의 수정 없이 네이티브 앱으로 변환할 수 있는 도구입니다.
- ✅ 기존 웹앱 코드 재사용
- ✅ iOS 및 Android 동시 지원
- ✅ 네이티브 기능 접근 가능

---

## 📋 사전 준비사항

### Android 앱 빌드:
- ✅ **Android Studio** 설치 필요
- ✅ **JDK 11 이상** 설치
- ✅ **Android SDK** 설치

### iOS 앱 빌드:
- ✅ **macOS** 필수
- ✅ **Xcode** 설치 필요
- ✅ **CocoaPods** 설치 (`sudo gem install cocoapods`)

---

## 🚀 빌드 과정

### 1️⃣ Android 앱 빌드

#### Step 1: Android Studio 열기
```bash
npm run cap:open:android
```

#### Step 2: Android Studio에서 빌드
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. 빌드 완료 후 `app/build/outputs/apk/debug/app-debug.apk` 생성

#### Step 3: APK 설치
- USB로 기기 연결
- Android Studio에서 **Run** 클릭
- 또는 APK 파일을 기기로 전송하여 설치

---

### 2️⃣ iOS 앱 빌드 (macOS 전용)

#### Step 1: Xcode 열기
```bash
npm run cap:open:ios
```

#### Step 2: Xcode에서 빌드
1. **Product** → **Archive**
2. App Store Connect에 업로드 또는 TestFlight 배포

---

## 🔧 개발 모드

### 로컬 서버 연결 (개발 중)

개발 중에는 로컬 서버를 앱에 연결할 수 있습니다:

**`capacitor.config.json` 수정:**
```json
{
  "server": {
    "url": "http://YOUR_LOCAL_IP:3000",
    "cleartext": true
  }
}
```

**서버 시작 및 앱 동기화:**
```bash
# 서버 시작
npm start

# 앱 동기화
npm run cap:sync

# Android Studio 열기
npm run cap:open:android
```

---

## 📦 프로덕션 빌드

### 프로덕션 서버 URL 설정

**`capacitor.config.json`:**
```json
{
  "server": {
    "url": "https://your-production-url.com"
  }
}
```

### Android Release APK 생성

1. **키 저장소 생성:**
```bash
cd android
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **`android/gradle.properties` 수정:**
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_password
MYAPP_RELEASE_KEY_PASSWORD=your_password
```

3. **Release APK 빌드:**
```bash
cd android
./gradlew assembleRelease
```

출력: `app/build/outputs/apk/release/app-release.apk`

---

## 🏪 스토어 배포

### Google Play Store (Android)

1. **Google Play Console** 접속: https://play.google.com/console
2. **Create App** 클릭
3. **앱 정보 입력**:
   - 앱 이름: "고객 관리 시스템"
   - 카테고리: Business
   - 언어: Korean
4. **Release** → **Production** → **Create new release**
5. APK/AAB 파일 업로드
6. **Review and rollout** 클릭

### Apple App Store (iOS)

1. **App Store Connect** 접속: https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. **앱 정보 입력**
4. **TestFlight** → 내부 테스트 배포
5. 검토 통과 후 정식 배포

---

## 🎨 앱 아이콘 및 스플래시 설정

### 아이콘 생성

**필요한 크기:**
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**온라인 도구 사용:**
- https://www.appicon.co
- https://icon.kitchen

### 스플래시 스크린

**`capacitor.config.json`에 설정:**
```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#3B82F6",
      "showSpinner": true,
      "spinnerColor": "#FFFFFF"
    }
  }
}
```

---

## 📱 네이티브 기능 추가 (선택사항)

### 카메라 플러그인 추가
```bash
npm install @capacitor/camera
npx cap sync
```

### 위치 정보 플러그인 추가
```bash
npm install @capacitor/geolocation
npx cap sync
```

### 푸시 알림 플러그인 추가
```bash
npm install @capacitor/push-notifications
npx cap sync
```

---

## 🔍 문제 해결

### Android 빌드 오류
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### iOS 빌드 오류
```bash
cd ios/App
pod install --repo-update
```

### 웹 자산 동기화
```bash
npm run cap:sync
```

---

## 📚 유용한 명령어

```bash
# 웹 자산 동기화
npm run cap:sync

# Android 동기화
npm run cap:sync:android

# iOS 동기화
npm run cap:sync:ios

# Android Studio 열기
npm run cap:open:android

# Xcode 열기
npm run cap:open:ios

# Android 디버그 빌드
npm run cap:build:android

# Android 기기에서 실행
npm run cap:run:android
```

---

## 🎯 현재 프로젝트 상태

**✅ 완료:**
- Capacitor 설치 및 초기화
- Android 플랫폼 추가
- iOS 플랫폼 추가 (빌드는 macOS 필요)
- index.html 생성
- 설정 파일 작성

**📋 다음 단계:**
1. Android Studio 설치
2. 앱 아이콘 및 스플래시 스크린 디자인
3. Debug APK 빌드 및 테스트
4. Release APK 생성
5. Google Play Store 업로드

---

## 📞 지원

문제가 발생하면 다음 리소스를 참고하세요:
- Capacitor 공식 문서: https://capacitorjs.com/docs
- Android Studio 가이드: https://developer.android.com/studio/intro
- Xcode 가이드: https://developer.apple.com/xcode/
