# 고객관리 시스템 (AS접수현황 관리)

AS 접수현황을 관리하는 지도 기반 웹 애플리케이션

---

## 🎉 **최신 안정 버전 (2026-02-03)**

### 📦 v1.2-kakao-complete
- **백업 날짜**: 2026-02-03
- **완성도**: 95%
- **Git 커밋**: `ede5e71` (Kakao Maps 완전 전환, GPS 펄스 마커, 위성 지도 토글)
- **백업 파일**: https://www.genspark.ai/api/files/s/NkRYmF41

### 🆕 주요 변경사항 (v1.2)
1. ✅ **Kakao Maps 완전 전환** - T Map에서 Kakao Maps로 완전 전환
2. ✅ **GPS 마커 시각적 개선** - 빨간색 펄스 애니메이션 (80px, 3단계 링)
3. ✅ **위성 지도 토글** - 버튼 클릭으로 일반 ↔ 위성 지도 전환
4. ✅ **고객 목록 기본 펼침** - 초기 로드 시 모든 고객 목록 표시
5. ✅ **고객명 실시간 검색** - 고객 목록 필터링 기능 추가
6. ✅ **버튼 텍스트 간소화** - "내 위치", "위성 지도"

### 🔄 이전 버전 백업

#### v1.1-ui-improved (2026-02-03)
- **Git 태그**: v1.1-ui-improved-2026-02-03
- **Git 커밋**: `d27baa3`
- **백업 파일**: https://www.genspark.ai/api/files/s/NkRYmF41
- **특징**: UI 개선, GPS 마커 초기 버전

#### v1.0-stable (2026-01-08)
- **Git 태그**: v1.0-stable-2026-01-08
- **Git 커밋**: `8ff7d44`
- **백업 파일**: https://www.genspark.ai/api/files/s/AFNsi47e
- **특징**: T Map 기반 안정 버전

### 🔄 백업 복원 방법

#### 방법 1: Git 태그로 복원
```bash
cd /home/user/webapp
git fetch --all --tags
git checkout v1.2-kakao-complete-2026-02-03
pm2 restart webapp
```

#### 방법 2: Git 커밋 해시로 복원
```bash
cd /home/user/webapp
git reset --hard ede5e71
pm2 restart webapp
```

#### 방법 3: 백업 파일로 복원
1. 백업 파일 다운로드: https://www.genspark.ai/api/files/s/NkRYmF41
2. 압축 해제:
```bash
cd /home/user
mv webapp webapp_old  # 기존 백업
tar -xzf webapp_backup.tar.gz
pm2 restart webapp
```

---

## 🌐 공개 URL

**웹 애플리케이션**: https://3000-irn3f4j2vutvnwvbf7bwh-cc2fbc16.sandbox.novita.ai

## 📋 프로젝트 개요

- **이름**: 고객관리 시스템 (AS접수현황 관리)
- **목표**: Kakao Maps 기반으로 AS 접수 고객 정보를 시각화하고 관리하는 웹 애플리케이션
- **기술 스택**: Hono + Node.js + **Kakao Maps API** + TailwindCSS + SheetJS

## ✨ 주요 기능

### 완료된 기능 (v1.2-kakao-complete)

1. **사용자 인증 시스템**
   - ✅ 로그인 화면 비밀번호 표시/숨김 토글 (👁️ 아이콘)
   - ✅ 관리자 계정: admin, master1, master2, master3
   - ✅ 사용자 계정: user, test1~test10
   - ✅ 세션 관리
   - ✅ 회원가입 기능 (관리자 승인 대기)

2. **관리자 대시보드**
   - ✅ AS 접수 통계 (전체 고객, 위치 등록, 오늘 등록)
   - ✅ AS 접수현황 테이블
   - ✅ Excel 파일 업로드 (.xlsx, .xls)
   - ✅ 데이터 검증 및 미리보기
   - ✅ 파일명 표시 기능
   - ✅ 고객 일괄 삭제
   - ✅ 중복/오류 데이터 감지
   - ✅ AS접수현황 템플릿 다운로드

3. **Excel 데이터 업로드**
   - ✅ **새 템플릿 구조**: 순번, 횟수, 접수일자, 업체, 구분, 고객명, 전화번호, 설치연월, 열원, 주소, AS접수내용, 설치팀, 지역, 접수자, AS결과
   - ✅ 파일 검증 (필수 필드, 형식 체크)
   - ✅ Excel 파일 파싱 (.xlsx, .xls)
   - ✅ 중복 데이터 감지 (메모리 DB 및 파일 내)
   - ✅ 업로드 전 미리보기 (파일명, 데이터 요약)
   - ✅ 유효한 데이터만 선택적 업로드
   - ✅ 자동 지오코딩 (주소 → 좌표 변환, Kakao Maps API)
   - ✅ 템플릿 파일 다운로드 기능

4. **사용자 지도 뷰 (Kakao Maps 완전 전환)**
   - ✅ **Kakao Maps 통합**: 실제 지도 렌더링
   - ✅ **위성 지도 토글**: 버튼 클릭으로 일반 ↔ 위성 지도 전환
   - ✅ **GPS 토글 버튼**: 좌측 상단 원형 버튼으로 GPS 활성화/비활성화
   - ✅ **GPS 마커**: 빨간색 펄스 애니메이션 (80px, 3단계 링)
   - ✅ **A/S 결과 입력 시스템**:
     - 📸 **사진 선택 시 미리보기** (즉시, Base64)
     - 📤 **'완료' 버튼 클릭 시 업로드** (Supabase Storage)
     - 🖼️ **사진 최대 10장** 업로드 가능
     - ✍️ 작업 내용 텍스트 입력
     - 💾 **재확인 시 사진 유지** (초록 체크 아이콘)
     - ✏️ **수정 기능**: 완료된 A/S 결과 수정 가능
       - 작업 내용(텍스트) 수정
       - 기존 사진 삭제 + 새 사진 추가
       - "수정" 버튼으로 완료 상태 재수정
     - ✅ 완료 시 마커 색상 변경 (연한 회색)
     - 🔄 **업로드 흐름**:
       1. 사진 선택 → 즉시 미리보기 생성 (1/10, 2/10, ...)
       2. 작업 내용 입력
       3. '완료' 버튼 클릭 → 백그라운드 업로드
       4. Supabase Storage에 저장 (`as-photos` 버킷)
       5. 메타데이터 DB 저장 (`as_photos` 테이블)
       6. 수정 시: PUT API로 기존 데이터 업데이트
   - ✅ AS 상태별 마커 색상 구분:
     - ⚪ **연한 회색**: A/S 작업 완료
     - 🟢 **초록색**: AS 완료 (수리 완료, 교체 완료 등)
     - 🟡 **노란색**: 점검/대기 중
     - 🔴 **빨간색**: 미완료/문제 있음
     - ⭐ **파란색**: 기본 상태 (AS결과 없음)
   - ✅ **고객 목록 기본 접기**: 초기 로드 시 접힌 상태
   - ✅ **고객명 실시간 검색**: 고객 목록 필터링
   - ✅ 고객 목록에 AS결과 및 상태 아이콘 표시
   - ✅ 거리 단위 표시 (m/km 자동 변환)
   - ✅ 고객 상세 정보 패널
   - ✅ **Kakao 길 안내** (Kakao Map 연동)
   - ✅ 핀포인트 클릭 상세 정보
   - ✅ 접수일자 형식 개선 (YYYY-MM-DD)

5. **데이터 구조 (Supabase 준비 완료)**
   - ✅ Supabase 스키마 정의 완료
   - ✅ Users: 사용자 계정 (bcrypt 암호화)
   - ✅ Customers: AS 접수 고객 정보, 위치 좌표, AS결과
   - ✅ AS_Records: A/S 작업 기록 및 텍스트
   - ✅ AS_Photos: A/S 사진 정보 (Supabase Storage)
   - ⏳ 환경 변수 설정 필요 (사용자가 Supabase 프로젝트 생성 후)

### 구현 대기 중인 기능

1. **A/S 결과 영구 저장**
   - Supabase 데이터베이스 연동 (설정 완료, 환경 변수 필요)
   - A/S 사진 Supabase Storage에 저장

2. **회원가입 승인 시스템**
   - 관리자 승인 페이지
   - SMS 발송 기능 실제 연동
   - 승인/반려 처리

3. **고급 필터링**
   - AS결과별 필터링
   - 지역별 필터링
   - 날짜 범위 검색

4. **통계 대시보드**
   - AS 완료율 차트
   - 지역별 통계
   - 팀별 실적

## 🗄️ 데이터베이스 설정 (Supabase)

### ✅ 설정 완료 항목
- ✅ Supabase 클라이언트 라이브러리 설치
- ✅ 데이터베이스 스키마 SQL 파일 작성
- ✅ 클라이언트 설정 파일 작성
- ✅ 설정 가이드 문서 작성
- ✅ **RLS (Row Level Security) 정책 설정**
- ✅ **Storage 버킷 정책 설정**
- ✅ **A/S 사진 업로드 기능 완료**

### 필요한 작업
1. **Supabase 프로젝트 생성** (사용자가 직접 수행)
   - https://supabase.com 에서 무료 프로젝트 생성
   - 자세한 가이드: `SUPABASE_SETUP.md` 참조

2. **환경 변수 설정**
   ```bash
   # .env 파일 생성
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **데이터베이스 스키마 생성**
   - Supabase SQL Editor에서 `supabase-schema.sql` 실행

4. **🔒 RLS (Row Level Security) 설정** ⭐ **중요!**
   ```sql
   -- 1️⃣ RLS 활성화
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.as_records ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.as_photos ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

   -- 2️⃣ authenticated 사용자 정책
   CREATE POLICY "Allow authenticated users to read customers" 
   ON public.customers FOR SELECT TO authenticated USING (true);

   CREATE POLICY "Allow authenticated users to update customers" 
   ON public.customers FOR UPDATE TO authenticated USING (true);

   CREATE POLICY "Allow authenticated users to insert as_records" 
   ON public.as_records FOR INSERT TO authenticated WITH CHECK (true);

   CREATE POLICY "Allow authenticated users to insert as_photos" 
   ON public.as_photos FOR INSERT TO authenticated WITH CHECK (true);

   -- 3️⃣ service_role 전체 권한
   CREATE POLICY "Allow service role full access to customers" 
   ON public.customers FOR ALL TO service_role USING (true);

   CREATE POLICY "Allow service role full access to as_records" 
   ON public.as_records FOR ALL TO service_role USING (true);

   CREATE POLICY "Allow service role full access to as_photos" 
   ON public.as_photos FOR ALL TO service_role USING (true);
   ```

5. **📦 Storage 버킷 생성 및 정책 설정**
   
   **버킷 생성:**
   - Supabase Dashboard → Storage → New Bucket
   - Name: `as-photos`
   - Public: ✅ **Enable (읽기만 공개)**
   - File size limit: `10485760` (10MB)

   **Storage 정책 설정:**
   ```sql
   -- 1️⃣ 읽기: 모두 허용 (Public)
   CREATE POLICY "Allow public read access" 
   ON storage.objects FOR SELECT TO public 
   USING (bucket_id = 'as-photos');

   -- 2️⃣ 업로드: authenticated 허용
   CREATE POLICY "Allow authenticated uploads" 
   ON storage.objects FOR INSERT TO authenticated 
   WITH CHECK (bucket_id = 'as-photos');

   -- 3️⃣ 삭제: authenticated 허용
   CREATE POLICY "Allow authenticated deletes" 
   ON storage.objects FOR DELETE TO authenticated 
   USING (bucket_id = 'as-photos');

   -- 4️⃣ Service Role: 모든 권한
   CREATE POLICY "Allow service role full access" 
   ON storage.objects FOR ALL TO service_role 
   USING (bucket_id = 'as-photos');
   ```

### 데이터베이스 구조
- **users**: 사용자 계정 (bcrypt 암호화)
- **customers**: AS 접수 고객 정보
- **as_records**: A/S 작업 기록
- **as_photos**: A/S 사진 정보 (Supabase Storage 연동)
- **upload_sessions**: Excel 업로드 이력

자세한 설정 가이드는 **`SUPABASE_SETUP.md`** 파일을 참조하세요.

## 📊 데이터 구조

### Customers (AS 접수현황)
```javascript
{
  id: INTEGER,              // 고유 ID
  sequence: INTEGER,        // 순번
  count: INTEGER,           // 횟수
  receipt_date: TEXT,       // 접수일자
  company: TEXT,            // 업체
  category: TEXT,           // 구분
  customer_name: TEXT,      // 고객명 (필수)
  phone: TEXT,              // 전화번호
  install_date: TEXT,       // 설치연,월
  heat_source: TEXT,        // 열원
  address: TEXT,            // 주소 (필수)
  as_content: TEXT,         // AS접수내용
  install_team: TEXT,       // 설치팀
  region: TEXT,             // 지역
  receptionist: TEXT,       // 접수자
  as_result: TEXT,          // AS결과 (마커 색상 결정)
  latitude: REAL,           // 위도
  longitude: REAL,          // 경도
  created_at: DATETIME,     // 생성일시
  updated_at: DATETIME      // 수정일시
}
```

## 🗺️ Kakao Maps API 정보

### Kakao Maps API 키
- **JavaScript Key**: `c933c69ba4e0228895438c6a8c327e74`
- **API 문서**: https://developers.kakao.com/

### Kakao Maps 기능:
1. **지도 렌더링**: JavaScript API로 지도 표시
2. **위성 지도**: ROADMAP ↔ HYBRID 전환
3. **마커 표시**: AS 상태별 색상 구분
4. **GPS 마커**: CustomOverlay로 펄스 애니메이션
5. **길찾기**: Kakao Map 연동

### 지도 타입
- **ROADMAP**: 일반 지도 (기본)
- **HYBRID**: 위성 지도 + 라벨 오버레이

## 🗺️ Kakao Maps 색상 매핑

| AS결과 키워드 | 마커 색상 | 아이콘 | 의미 | Kakao 이미지 |
|-------------|---------|-------|------|------------|
| 완료, 수리, 교체 | 🟢 초록색 | fa-check-circle | AS 완료 | marker_green.png |
| 점검, 대기, 예정 | 🟡 노란색 | fa-clock | 점검/대기 중 | marker_yellow.png |
| 기타 | 🔴 빨간색 | fa-exclamation-circle | 미완료/문제 | marker_red.png |
| (없음) | ⭐ 파란색 | fa-circle | 기본 상태 | markerStar.png |

## 🗄️ 스토리지 서비스

- **메모리 기반**: 현재 서버 재시작 시 데이터 초기화
- **향후 계획**: SQLite 또는 PostgreSQL 연결

## 📖 사용자 가이드

### 1. 로그인
- **관리자 계정**: 
  - `admin` / `admin123`
  - `master1` / `master1`
  - `master2` / `master2`
  - `master3` / `master3`
- **사용자 계정**: 
  - `user` / `user123`
  - `test1` / `test1` ~ `test10` / `test10`
- **비밀번호 표시/숨김**: 👁️ 아이콘 클릭

### 2. 관리자 모드
1. **AS 접수현황 확인**: 대시보드에서 전체 고객 통계 및 목록 확인
2. **Excel 업로드**: 
   - "Excel 업로드" 버튼 클릭
   - Excel 파일 선택 (.xlsx 또는 .xls)
   - **템플릿 다운로드**: "AS접수현황_템플릿.xlsx 다운로드" 버튼 클릭
   - 파일명 및 데이터 수 확인
   - 검증 결과 확인 (유효/오류/중복)
   - 유효한 데이터만 업로드
3. **고객 삭제**: 체크박스 선택 후 "선택 삭제" 버튼 클릭

### 3. 사용자 모드
1. **Kakao Maps 보기**: AS 접수 고객 위치를 지도에서 확인
2. **지도 타입 전환**: 우측 상단 "위성 지도" 버튼으로 일반 ↔ 위성 전환
3. **내 위치**: GPS 기반 현재 위치 표시 (빨간 펄스 애니메이션)
4. **고객 목록**: 하단 패널에서 모든 고객 목록 확인
5. **고객 검색**: 고객명으로 실시간 필터링
6. **상태 확인**: 마커 색상으로 AS 완료 여부 확인
7. **고객 상세**: 고객 항목 클릭하여 상세 정보 보기
8. **길찾기**: Kakao Map에서 길 안내

### 4. Excel 파일 형식
Excel 파일의 첫 번째 행은 헤더여야 합니다:

| 순번 | 횟수 | 접수일자 | 업체 | 구분 | 고객명 | 전화번호 | 설치연,월 | 열원 | 주소 | AS접수내용 | 설치팀 | 지역 | 접수자 | AS결과 |
|------|------|---------|------|------|--------|----------|-----------|------|------|-----------|--------|------|--------|--------|
| 1 | 1 | 2024-01-15 | 서울지사 | AS | 김철수 | 010-1234-5678 | 2023-12 | 가스 | 서울특별시 강남구 테헤란로 123 | 온수 온도 조절 불량 | 1팀 | 강남 | 홍길동 | 수리 완료 |

**필수 항목**: 고객명, 주소  
**중요 항목**: AS결과 (마커 색상 결정)  
**선택 항목**: 나머지 모든 필드

**템플릿 파일**: 관리자 대시보드의 "Excel 업로드" 모달에서 템플릿 파일을 다운로드할 수 있습니다.

## 🚀 배포 상태

- **플랫폼**: Node.js + PM2
- **상태**: ✅ 활성
- **최종 업데이트**: 2026-02-03
- **안정 버전**: v1.2-kakao-complete
- **주요 변경**: T Map → Kakao Maps 완전 전환

## 🛠️ 개발 환경 설정

### 로컬 실행
```bash
# 1. 의존성 설치
npm install

# 2. 포트 정리
fuser -k 3000/tcp || true

# 3. 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 4. 서비스 확인
curl http://localhost:3000/api/customers
```

### 유용한 명령어
```bash
# PM2 관리
pm2 list                    # 서비스 목록
pm2 logs webapp --nostream  # 로그 확인
pm2 restart webapp          # 재시작
pm2 delete webapp           # 중지 및 제거
pm2 status                  # 상태 확인

# Git
git status                  # 변경사항 확인
git add .                   # 모든 변경사항 스테이징
git commit -m "메시지"      # 커밋
git tag -l                  # 태그 목록
git checkout <태그명>       # 특정 태그로 이동

# 백업 복원
git checkout v1.0-stable-2026-01-08  # 안정 버전으로 복원
git reset --hard 8ff7d44             # 특정 커밋으로 복원
```

## 🔧 API 설정

### Kakao Maps API
- **JavaScript Key**: `c933c69ba4e0228895438c6a8c327e74`
- **API 문서**: https://developers.kakao.com/

### Kakao Maps API 기능:
1. **지도 렌더링**: JavaScript API로 지도 표시
2. **위성 지도 전환**: ROADMAP ↔ HYBRID
3. **마커 표시**: AS 상태별 색상 구분
4. **GPS CustomOverlay**: 펄스 애니메이션 마커
5. **길찾기**: Kakao Map 앱/웹 연동

## 📝 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입 (승인 대기)
- `GET /api/auth/pending` - 승인 대기 목록 (관리자 전용)

### 고객 관리 (AS 접수현황)
- `GET /api/customers` - 모든 고객 조회
- `GET /api/customers/:id` - 고객 상세 조회
- `POST /api/customers` - 고객 생성
- `PUT /api/customers/:id` - 고객 수정
- `DELETE /api/customers/:id` - 고객 삭제
- `POST /api/customers/batch-delete` - 고객 일괄 삭제
- `POST /api/customers/validate` - Excel 데이터 검증
- `POST /api/customers/batch-upload` - Excel 데이터 일괄 업로드
- `POST /api/customers/as-result` - A/S 결과 저장
- `PUT /api/customers/as-result/:recordId` - A/S 결과 수정 (작업 내용 + 사진)
- `GET /api/customers/:id/as-result` - A/S 결과 조회
- `POST /api/customers/as-photo/upload` - A/S 사진 업로드 (Supabase Storage)

### 지오코딩 (T Map API)
- `POST /api/geocode` - 주소를 좌표로 변환

## 🎯 다음 개발 단계

1. ✅ Kakao Maps 완전 전환
2. ✅ AS 상태별 마커 색상 구분
3. ✅ 실시간 지도 마커 렌더링
4. ✅ GPS 마커 펄스 애니메이션
5. ✅ 위성 지도 토글 기능
6. ✅ 고객 목록 기본 펼침 및 검색
7. ✅ 로그인 비밀번호 표시/숨김
8. ✅ 거리 단위 표시 (m/km)
9. ✅ 접수일자 형식 개선
10. ⏳ 회원가입 승인 시스템 완성
11. ⏳ 영구 데이터베이스 연결 (SQLite/PostgreSQL)
12. ⏳ 고객 필터링 및 검색 (AS결과, 지역, 날짜)
13. ⏳ 클러스터링 (많은 고객 핀포인트 그룹화)
14. ⏳ 통계 대시보드 (AS 완료율, 지역별, 팀별)
15. ⏳ 방문 일정 관리
16. ⏳ 모바일 반응형 최적화
17. ⏳ 비밀번호 암호화 (bcrypt)
18. ⏳ JWT 토큰 인증

## 🐛 문제 해결

### ⚠️ Supabase RLS 에러가 발생하는 경우
**증상**: Security Advisor에 "Policy Exists RLS Disabled" 경고

**원인**: Row Level Security(RLS)가 비활성화되어 있음

**해결 방법**:
1. Supabase Dashboard → SQL Editor
2. 다음 SQL 실행:
```sql
-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.as_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.as_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- 정책 추가 (위의 "데이터베이스 설정" 섹션 참조)
```
3. Security Advisor에서 경고 제거 확인

### 📸 사진 업로드가 실패하는 경우
**증상**: "사진 업로드 실패" 또는 "Storage 버킷이 없습니다" 메시지

**원인**: 
1. `as-photos` 버킷이 존재하지 않음
2. Storage 정책이 설정되지 않음
3. RLS가 활성화되지 않음

**해결 방법**:
1. **버킷 생성**:
   - Supabase Dashboard → Storage → New Bucket
   - Name: `as-photos`
   - Public: ✅ Enable
   - File size limit: `10485760` (10MB)

2. **Storage 정책 설정** (SQL Editor):
```sql
-- Public 읽기 허용
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'as-photos');

-- authenticated 업로드 허용
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'as-photos');

-- service_role 전체 권한
CREATE POLICY "Allow service role full access" 
ON storage.objects FOR ALL TO service_role 
USING (bucket_id = 'as-photos');
```

3. **RLS 활성화 확인** (위의 "Supabase RLS 에러" 참조)

4. **테스트**:
   - 로그인 → 마커 클릭 → A/S 결과
   - 사진 선택 → 미리보기 확인
   - '완료' 버튼 → 업로드 성공 확인
   - Supabase Storage에서 파일 확인

### 📷 사진 미리보기는 되지만 업로드가 안 되는 경우
**증상**: 사진 선택 시 미리보기는 표시되지만 '완료' 버튼 클릭 후 업로드 실패

**원인**:
1. SERVICE_ROLE_KEY가 설정되지 않음
2. Storage 정책이 누락됨

**해결 방법**:
1. `.env` 파일 확인:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ⭐ 필수!
```

2. 서버 재시작:
```bash
pm2 restart webapp
```

3. 콘솔 로그 확인:
   - "📤 사진 1/3 업로드 중..."
   - "✅ 사진 1 업로드 성공: storage/path"

### Kakao Maps가 표시되지 않는 경우
1. 브라우저 캐시 완전 삭제 (Ctrl + Shift + R)
2. 시크릿 모드로 접속
3. 개발자 도구 Console 탭에서 오류 확인
4. Kakao Maps API 키 확인

### GPS 마커가 표시되지 않는 경우
1. 위치 권한 허용 확인
2. 개발자 도구 Console 탭에서 GPS 로그 확인
3. "내 위치" 버튼 클릭

### 위성 지도가 전환되지 않는 경우
1. "위성 지도" 버튼 클릭
2. 개발자 도구 Console 탭에서 오류 확인
3. Kakao Maps API 키 확인

### 고객 목록이 보이지 않는 경우
1. Excel 파일 업로드 확인
2. 하단 패널 토글 버튼 (^) 클릭
3. 고객 데이터 유무 확인

### 마커가 표시되지 않는 경우
1. 고객 데이터에 latitude, longitude 값 확인
2. AS결과 필드 확인 (마커 색상 결정)
3. 개발자 도구 Console 탭에서 "마커 표시" 로그 확인

### Excel 업로드가 실패하는 경우
1. 템플릿 파일 다운로드 후 형식 확인
2. 필수 필드 (고객명, 주소) 입력 확인
3. 파일명에 한글 포함 가능
4. 검증 결과에서 오류 메시지 확인

### 길 안내가 작동하지 않는 경우
1. **모바일**: 앱 설치 확인 (Kakao Navi)
2. **데스크톱**: 팝업 차단 해제
3. 고객 데이터에 위도/경도 확인
4. 개발자 도구 Console 탭에서 오류 확인

## 📄 라이센스

MIT License

## 👤 작성자

GenSpark AI - AS 접수현황 관리 시스템

---

**참고**: 
- 📦 **최신 백업 (v1.2)**: https://www.genspark.ai/api/files/s/NkRYmF41
- 🔖 **Git 태그**: v1.2-kakao-complete-2026-02-03
- 📌 **커밋 해시**: ede5e71
- Kakao Maps API는 이미 설정되어 있으며 정상 작동합니다.
- GPS 마커는 빨간색 펄스 애니메이션으로 표시됩니다.
- 위성 지도는 버튼 클릭으로 전환 가능합니다.
- 데이터는 메모리 기반이므로 서버 재시작 시 초기화됩니다.
- 영구 데이터베이스 연결은 향후 추가될 예정입니다.
- 회원가입 승인 시스템은 개발 중입니다.
