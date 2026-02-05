// ============================================
// 전역 상태 관리
// ============================================
const state = {
  currentUser: null,
  customers: [],
  currentView: 'login',
  map: null,
  markers: [],
  selectedCustomer: null,
  uploadPreviewData: null,
  userLocation: null,  // GPS 위치
  userLocationMarker: null,  // GPS 마커
  mapType: 'normal',  // 'normal' 또는 'satellite'
  sortedCustomers: null,  // 거리순 정렬된 고객 목록
  asPhotos: [],  // A/S 사진 배열
  currentASCustomerId: null,  // 현재 A/S 작업 중인 고객 ID
  gpsEnabled: true  // GPS 활성화 상태 (기본값: 활성화)
}

// ============================================
// 유틸리티 함수
// ============================================
function saveSession(user) {
  sessionStorage.setItem('user', JSON.stringify(user))
  state.currentUser = user
}

function loadSession() {
  const userStr = sessionStorage.getItem('user')
  if (userStr) {
    state.currentUser = JSON.parse(userStr)
    return true
  }
  return false
}

function clearSession() {
  sessionStorage.removeItem('user')
  state.currentUser = null
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  }`
  toast.textContent = message
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// ============================================
// API 호출 함수
// ============================================
async function login(username, password) {
  try {
    const response = await axios.post('/api/auth/login', { username, password })
    if (response.data.success) {
      saveSession(response.data.user)
      return true
    } else {
      showToast(response.data.message, 'error')
      return false
    }
  } catch (error) {
    showToast('로그인 중 오류가 발생했습니다', 'error')
    return false
  }
}

async function loadCustomers() {
  try {
    const response = await axios.get('/api/customers')
    if (response.data.success) {
      state.customers = response.data.customers
      return true
    }
    return false
  } catch (error) {
    showToast('고객 목록 조회 중 오류가 발생했습니다', 'error')
    return false
  }
}

async function deleteCustomer(id) {
  try {
    const response = await axios.delete(`/api/customers/${id}`)
    if (response.data.success) {
      showToast('고객이 삭제되었습니다', 'success')
      await loadCustomers()
      return true
    }
    return false
  } catch (error) {
    showToast('고객 삭제 중 오류가 발생했습니다', 'error')
    return false
  }
}

async function batchDeleteCustomers(ids) {
  try {
    const response = await axios.post('/api/customers/batch-delete', { ids })
    if (response.data.success) {
      showToast(`${response.data.deleted}명의 고객이 삭제되었습니다`, 'success')
      await loadCustomers()
      return true
    }
    return false
  } catch (error) {
    showToast('고객 일괄 삭제 중 오류가 발생했습니다', 'error')
    return false
  }
}

async function validateCustomerData(data) {
  try {
    const response = await axios.post('/api/customers/validate', { data })
    return response.data
  } catch (error) {
    showToast('데이터 검증 중 오류가 발생했습니다', 'error')
    return null
  }
}

async function batchUploadCustomers(data) {
  try {
    const response = await axios.post('/api/customers/batch-upload', {
      data,
      userId: state.currentUser.id
    })
    if (response.data.success) {
      showToast(`${response.data.summary.success}명의 고객이 등록되었습니다`, 'success')
      await loadCustomers()
      return true
    }
    return false
  } catch (error) {
    showToast('고객 업로드 중 오류가 발생했습니다', 'error')
    return false
  }
}

// Kakao Maps Geocoder를 사용한 주소 → 좌표 변환
async function geocodeAddress(address) {
  return new Promise((resolve) => {
    if (!address || address.trim() === '') {
      resolve({ latitude: 37.5665, longitude: 126.9780 })
      return
    }
    
    // Kakao Maps API 사용 가능 여부 확인
    if (typeof kakao === 'undefined' || !kakao.maps || !kakao.maps.services) {
      console.warn('⚠️ Kakao Maps API 사용 불가, 기본 좌표 사용:', address)
      resolve({ latitude: 37.5665, longitude: 126.9780 })
      return
    }
    
    // Kakao Maps Geocoder 생성
    const geocoder = new kakao.maps.services.Geocoder()
    
    // 주소로 좌표 검색
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result && result.length > 0) {
        const coords = {
          latitude: parseFloat(result[0].y),
          longitude: parseFloat(result[0].x),
          address: result[0].address_name || address
        }
        console.log(`✅ 지오코딩 성공: ${address} → (${coords.latitude}, ${coords.longitude})`)
        resolve(coords)
      } else {
        console.warn(`⚠️ 지오코딩 실패: ${address}, 기본 좌표 사용`)
        resolve({ latitude: 37.5665, longitude: 126.9780, address })
      }
    })
  })
}

// ============================================
// Excel 파싱 함수
// ============================================
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // 첫 번째 시트 가져오기
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // 시트를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,  // 배열 형태로 반환
          defval: ''  // 빈 셀은 빈 문자열로
        })
        
        if (jsonData.length < 2) {
          reject(new Error('파일에 데이터가 없습니다'))
          return
        }
        
        // Excel 헤더 → DB 필드 매핑
        const headerMap = {
          '순번': 'sequence',
          '횟수': 'count',
          '접수일자': 'receipt_date',
          '업체': 'company',
          '구분': 'category',
          '고객명': 'customer_name',
          '전화번호': 'phone',
          '설치연월': 'install_date',
          '설치연,월': 'install_date',  // 쉼표 포함 버전
          '열원': 'heat_source',
          '주소': 'address',
          'A/S접수내용': 'as_content',
          'AS접수내용': 'as_content',  // A/S 없이도 매칭
          '설치팀': 'install_team',
          '지역': 'region',
          '접수자': 'receptionist',
          'AS결과': 'as_result',
          'A/S결과': 'as_result'  // A/S 있는 버전도 매칭
        }
        
        // 헤더 정규화 함수: 줄바꿈, 공백, 특수문자 제거
        const normalizeHeader = (header) => {
          if (!header) return ''
          return String(header)
            .replace(/[\r\n\t]/g, '')  // 줄바꿈, 탭 제거
            .replace(/\s+/g, '')        // 공백 제거
            .trim()
        }
        
        // 헤더와 데이터 분리
        const rawHeaders = jsonData[0]
        const normalizedHeaders = rawHeaders.map(h => normalizeHeader(h))
        
        console.log('📋 원본 헤더:', rawHeaders)
        console.log('📋 정규화된 헤더:', normalizedHeaders)
        
        const rows = []
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = {}
          let hasData = false
          
          normalizedHeaders.forEach((header, index) => {
            const value = jsonData[i][index]
            
            // 헤더 매핑 (정규화된 헤더로 찾기)
            let mappedKey = headerMap[header]
            
            // 매핑이 없으면 원본 헤더로 다시 시도
            if (!mappedKey && rawHeaders[index]) {
              mappedKey = headerMap[rawHeaders[index]]
            }
            
            // 여전히 없으면 정규화된 헤더를 그대로 사용
            if (!mappedKey) {
              mappedKey = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
            }
            
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              row[mappedKey] = String(value).trim()
              hasData = true
            }
          })
          
          // 빈 행 제외
          if (hasData && row.customer_name) {  // 최소한 고객명은 있어야 함
            rows.push(row)
          }
        }
        
        console.log(`📊 Excel 파싱 완료: ${rows.length}개 행`)
        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// ============================================
// 렌더링 함수
// ============================================

// 비밀번호 표시/숨김 토글
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId)
  const icon = document.getElementById(iconId)
  
  if (input.type === 'password') {
    input.type = 'text'
    icon.classList.remove('fa-eye-slash')
    icon.classList.add('fa-eye')
  } else {
    input.type = 'password'
    icon.classList.remove('fa-eye')
    icon.classList.add('fa-eye-slash')
  }
}

// 로그인 화면
function renderLogin() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div class="text-center mb-8">
          <i class="fas fa-map-marked-alt text-5xl text-blue-600 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-800">고객관리 시스템</h1>
          <p class="text-gray-600 mt-2">지도 기반 고객 관리 솔루션</p>
        </div>
        
        <form id="loginForm" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-user mr-2"></i>아이디
            </label>
            <input 
              type="text" 
              id="username" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="아이디를 입력하세요"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-lock mr-2"></i>비밀번호
            </label>
            <div class="relative">
              <input 
                type="password" 
                id="password" 
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
                required
              />
              <button
                type="button"
                onclick="togglePasswordVisibility('password', 'togglePasswordIcon')"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i id="togglePasswordIcon" class="fas fa-eye-slash"></i>
              </button>
            </div>
          </div>
          
          <!-- 아이디 저장 & 자동 로그인 -->
          <div class="space-y-2">
            <label class="flex items-center text-sm text-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                id="saveUsername" 
                class="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>아이디 저장</span>
            </label>
            <label class="flex items-center text-sm text-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                id="autoLogin" 
                class="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>자동 로그인</span>
            </label>
          </div>
          
          <button 
            type="submit" 
            class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            <i class="fas fa-sign-in-alt mr-2"></i>로그인
          </button>
        </form>
        
        <button 
          onclick="renderRegister()" 
          class="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
        >
          <i class="fas fa-user-plus mr-2"></i>회원가입
        </button>
        
        <div class="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 text-center">
          <p class="text-xs">계정이 없으신가요? 회원가입 후 관리자 승인이 필요합니다.</p>
        </div>
      </div>
    </div>
  `
  
  // 저장된 아이디 불러오기
  const savedUsername = localStorage.getItem('savedUsername')
  const saveUsernameChecked = localStorage.getItem('saveUsernameChecked') === 'true'
  const autoLoginChecked = localStorage.getItem('autoLoginChecked') === 'true'
  
  if (savedUsername) {
    document.getElementById('username').value = savedUsername
  }
  
  if (saveUsernameChecked) {
    document.getElementById('saveUsername').checked = true
  }
  
  if (autoLoginChecked) {
    document.getElementById('autoLogin').checked = true
  }
  
  // 자동 로그인 체크
  if (autoLoginChecked && savedUsername) {
    const savedPassword = localStorage.getItem('savedPassword')
    if (savedPassword) {
      console.log('🔄 자동 로그인 시도 중...')
      setTimeout(async () => {
        const success = await login(savedUsername, savedPassword)
        if (success) {
          showToast('자동 로그인 성공!', 'success')
          if (state.currentUser.role === 'admin') {
            renderAdminDashboard()
          } else {
            renderUserMap()
          }
        } else {
          // 자동 로그인 실패 시 저장된 비밀번호 삭제
          localStorage.removeItem('savedPassword')
          localStorage.removeItem('autoLoginChecked')
          document.getElementById('autoLogin').checked = false
          showToast('자동 로그인 실패. 다시 로그인해주세요.', 'warning')
        }
      }, 500)
    }
  }
  
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    const saveUsername = document.getElementById('saveUsername').checked
    const autoLogin = document.getElementById('autoLogin').checked
    
    const success = await login(username, password)
    if (success) {
      // 아이디 저장 처리
      if (saveUsername) {
        localStorage.setItem('savedUsername', username)
        localStorage.setItem('saveUsernameChecked', 'true')
      } else {
        localStorage.removeItem('savedUsername')
        localStorage.removeItem('saveUsernameChecked')
      }
      
      // 자동 로그인 처리
      if (autoLogin) {
        localStorage.setItem('savedPassword', password)
        localStorage.setItem('autoLoginChecked', 'true')
      } else {
        localStorage.removeItem('savedPassword')
        localStorage.removeItem('autoLoginChecked')
      }
      
      showToast('로그인 성공!', 'success')
      if (state.currentUser.role === 'admin') {
        renderAdminDashboard()
      } else {
        renderUserMap()
      }
    }
  })
}

// 비밀번호 표시/숨김 토글 함수
// 회원가입 화면
function renderRegister() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 p-4">
      <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div class="text-center mb-8">
          <i class="fas fa-user-plus text-5xl text-green-600 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-800">회원가입</h1>
          <p class="text-gray-600 mt-2">관리자 승인 후 이용 가능합니다</p>
        </div>
        
        <form id="registerForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-user mr-2"></i>성명 *
            </label>
            <input 
              type="text" 
              id="registerName" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="이름을 입력하세요"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-phone mr-2"></i>연락처 *
            </label>
            <input 
              type="tel" 
              id="registerPhone" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="01012345678"
              pattern="[0-9]{11}"
              maxlength="11"
              required
            />
            <p class="text-xs text-gray-500 mt-1">숫자만 11자리 입력 (예: 01012345678)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-id-card mr-2"></i>아이디 *
            </label>
            <input 
              type="text" 
              id="registerUsername" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="abc123"
              pattern="[a-zA-Z0-9]{4,}"
              minlength="4"
              required
            />
            <p class="text-xs text-gray-500 mt-1">영어+숫자 조합 4자 이상 (예: hong123)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-lock mr-2"></i>비밀번호 *
            </label>
            <div class="relative">
              <input 
                type="password" 
                id="registerPassword" 
                class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="abc123"
                minlength="6"
                required
              />
              <button 
                type="button"
                onclick="togglePasswordVisibility('registerPassword', 'togglePasswordIcon1')"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i id="togglePasswordIcon1" class="fas fa-eye"></i>
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">영어+숫자 조합 6자 이상 (예: pass1234)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-lock mr-2"></i>비밀번호 확인 *
            </label>
            <div class="relative">
              <input 
                type="password" 
                id="registerPasswordConfirm" 
                class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="비밀번호를 다시 입력하세요"
                required
              />
              <button 
                type="button"
                onclick="togglePasswordVisibility('registerPasswordConfirm', 'togglePasswordIcon2')"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i id="togglePasswordIcon2" class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div class="pt-4">
            <button 
              type="submit" 
              class="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              <i class="fas fa-user-plus mr-2"></i>가입 신청
            </button>
          </div>
        </form>
        
        <button 
          onclick="renderLogin()" 
          class="w-full mt-4 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
        >
          <i class="fas fa-arrow-left mr-2"></i>로그인으로 돌아가기
        </button>
        
        <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <p class="font-semibold text-yellow-800 mb-2">
            <i class="fas fa-info-circle mr-1"></i>안내사항
          </p>
          <ul class="text-yellow-700 space-y-1 text-xs">
            <li>• 회원가입 신청 시 관리자에게 SMS가 발송됩니다</li>
            <li>• 관리자 승인 후 로그인 가능합니다</li>
            <li>• 승인 여부는 SMS로 안내됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  `
  
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = document.getElementById('registerName').value.trim()
    const phone = document.getElementById('registerPhone').value.trim()
    const username = document.getElementById('registerUsername').value.trim()
    const password = document.getElementById('registerPassword').value
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value
    
    // 연락처 검증: 숫자만 11자리
    const phoneRegex = /^010[0-9]{8}$/
    if (!phoneRegex.test(phone)) {
      showToast('연락처는 010으로 시작하는 11자리 숫자만 입력해주세요', 'error')
      return
    }
    
    // 아이디 검증: 영어+숫자 조합 4자 이상
    const usernameRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{4,}$/
    if (!usernameRegex.test(username)) {
      showToast('아이디는 영어와 숫자를 포함하여 4자 이상 입력해주세요', 'error')
      return
    }
    
    // 비밀번호 검증: 영어+숫자 조합 6자 이상
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{6,}$/
    if (!passwordRegex.test(password)) {
      showToast('비밀번호는 영어와 숫자를 포함하여 6자 이상 입력해주세요', 'error')
      return
    }
    
    // 비밀번호 확인
    if (password !== passwordConfirm) {
      showToast('비밀번호가 일치하지 않습니다', 'error')
      return
    }
    
    try {
      console.log('📤 회원가입 요청:', { name, phone, username, password: '***' })
      
      const response = await axios.post('/api/auth/register', {
        name,
        phone,
        username,
        password
      })
      
      console.log('📥 회원가입 응답:', response.data)
      
      if (response.data.success) {
        showToast(response.data.message, 'success')
        setTimeout(() => {
          renderLogin()
        }, 2000)
      } else {
        showToast(response.data.message, 'error')
      }
    } catch (error) {
      console.error('❌ 회원가입 오류:', error)
      console.error('❌ 오류 상세:', error.response?.data)
      
      if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error')
      } else {
        showToast('회원가입 중 오류가 발생했습니다. 입력 정보를 다시 확인해주세요.', 'error')
      }
    }
  })
}

// 관리자 대시보드
function renderAdminDashboard() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- 헤더 -->
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <i class="fas fa-user-shield text-2xl text-blue-600"></i>
            <div>
              <h1 class="text-xl font-bold text-gray-800">관리자 대시보드</h1>
              <p class="text-sm text-gray-600">${state.currentUser.name}님 환영합니다</p>
            </div>
          </div>
          <div class="flex space-x-3">
            <button onclick="switchToUserView()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <i class="fas fa-map mr-2"></i>지도 보기
            </button>
            <button onclick="logout()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
            </button>
          </div>
        </div>
      </header>
      
      <!-- 메인 컨텐츠 -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- 통계 카드 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-xl shadow-sm border">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm">전체 고객</p>
                <p class="text-3xl font-bold text-gray-800 mt-2" id="totalCustomers">0</p>
              </div>
              <div class="bg-blue-100 p-4 rounded-full">
                <i class="fas fa-users text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>
          
          <div class="bg-white p-6 rounded-xl shadow-sm border">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm">위치 등록</p>
                <p class="text-3xl font-bold text-gray-800 mt-2" id="geoCodedCustomers">0</p>
              </div>
              <div class="bg-green-100 p-4 rounded-full">
                <i class="fas fa-map-marker-alt text-2xl text-green-600"></i>
              </div>
            </div>
          </div>
          
          <div class="bg-white p-6 rounded-xl shadow-sm border">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm">오늘 등록</p>
                <p class="text-3xl font-bold text-gray-800 mt-2" id="todayCustomers">0</p>
              </div>
              <div class="bg-purple-100 p-4 rounded-full">
                <i class="fas fa-calendar-day text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 고객 관리 섹션 -->
        <div class="bg-white rounded-xl shadow-sm border p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">
              <i class="fas fa-list mr-2"></i>고객 목록
            </h2>
            <div class="flex space-x-3">
              <button onclick="downloadASResults()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-file-download mr-2"></i>A/S 결과 다운로드
              </button>
              <button onclick="openUploadModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-file-excel mr-2"></i>Excel 업로드
              </button>
              <button onclick="deleteSelectedCustomers()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                <i class="fas fa-trash mr-2"></i>선택 삭제
              </button>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left">
                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)" class="rounded">
                  </th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">고객명</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">전화번호</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">주소</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">위치</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">등록일</th>
                </tr>
              </thead>
              <tbody id="customerTableBody" class="divide-y divide-gray-200">
                <tr>
                  <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>고객 데이터를 불러오는 중...</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
    
    <!-- Excel 업로드 모달 -->
    <div id="uploadModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-file-excel mr-2 text-green-600"></i>Excel 파일 업로드
          </h3>
          <button onclick="closeUploadModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 140px)">
          <div id="uploadStep1" class="space-y-4">
            <!-- 메일 첨부 형식 UI -->
            <div class="bg-white border border-gray-300 rounded-lg">
              <!-- 파일 첨부 영역 -->
              <div class="p-4 border-b border-gray-200">
                <div class="flex items-center gap-3">
                  <label class="text-sm font-medium text-gray-700 w-20">파일 첨부:</label>
                  <div class="flex-1">
                    <input type="file" id="excelFile" accept=".xlsx,.xls" class="hidden" onchange="handleFileSelect(event)">
                    <button onclick="document.getElementById('excelFile').click()" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                      <i class="fas fa-paperclip mr-2"></i>파일 선택
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 첨부된 파일 목록 -->
              <div id="attachedFilesList" class="p-4 bg-gray-50 min-h-[100px]">
                <p class="text-sm text-gray-500 text-center py-8">
                  <i class="fas fa-inbox text-3xl text-gray-300 mb-2"></i><br>
                  첨부된 파일이 없습니다
                </p>
              </div>
            </div>
            
            <!-- 샘플 파일 다운로드 -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold text-blue-900 mb-1">
                    <i class="fas fa-info-circle mr-2"></i>템플릿 파일
                  </p>
                  <p class="text-xs text-blue-700">
                    A/S접수현황 Excel 템플릿을 다운로드하여 작성하세요
                  </p>
                </div>
                <button onclick="downloadSampleExcel()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                  <i class="fas fa-download mr-2"></i>다운로드
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  loadCustomers().then(() => {
    updateDashboardStats()
    renderCustomerTable()
  })
}

// 사용자 지도 화면
function renderUserMap() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="h-screen flex flex-col">
      <!-- 헤더 (모바일 최적화) -->
      <header class="bg-white shadow-sm border-b flex-shrink-0">
        <div class="px-3 py-3 flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <i class="fas fa-map-marked-alt text-xl text-blue-600"></i>
            <div>
              <h1 class="text-base font-bold text-gray-800">고객 지도</h1>
              <p class="text-xs text-gray-600">${state.currentUser.name}님</p>
            </div>
          </div>
          <div class="flex space-x-2">
            ${state.currentUser.role === 'admin' ? `
            <button onclick="renderAdminDashboard()" class="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              <i class="fas fa-user-shield sm:mr-2"></i><span class="hidden sm:inline">관리자</span>
            </button>
            ` : ''}
            <button onclick="logout()" class="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              <i class="fas fa-sign-out-alt sm:mr-2"></i><span class="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>
      
      <!-- 지도/목록 컨테이너 -->
      <div class="flex-1 relative">
        <div id="map" class="w-full h-full"></div>
        
        <!-- GPS 토글 버튼 (좌측 상단) -->
        <button 
          onclick="toggleGPS()" 
          id="gpsToggleBtn"
          class="absolute top-4 left-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition z-20"
          title="GPS 활성화/비활성화"
        >
          <i class="fas fa-crosshairs text-xl" id="gpsIcon"></i>
        </button>
        
        
        <!-- 고객 상세 정보 패널 (모바일 최적화: 전체 화면 모달) -->
        <div id="customerDetailPanel" class="hidden fixed inset-0 bg-white z-30 overflow-y-auto md:absolute md:top-4 md:right-4 md:left-auto md:bottom-auto md:rounded-xl md:shadow-xl md:w-80 md:max-h-[calc(100vh-120px)]">
          <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <h3 class="text-lg font-bold text-gray-800">고객 상세 정보</h3>
            <button onclick="closeCustomerDetail()" class="p-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-full">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div id="customerDetailContent" class="p-4"></div>
        </div>
        
        <!-- A/S 결과 입력 모달 -->
        <div id="asResultModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 class="text-lg font-bold text-gray-800">A/S 결과 입력</h3>
              <button onclick="closeASResultModal()" class="p-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-full">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div class="p-6 space-y-6">
              <!-- 고객 정보 요약 -->
              <div class="bg-blue-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600 mb-1">고객명</p>
                <p id="asModalCustomerName" class="text-lg font-semibold text-gray-800"></p>
              </div>
              
              <!-- 사진 업로드 섹션 -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">
                  <i class="fas fa-camera mr-2"></i>사진 촬영/업로드 (최대 10장)
                </label>
                
                <!-- 사진 업로드 버튼 -->
                <div class="flex gap-2 mb-4">
                  <label class="flex-1 cursor-pointer">
                    <input type="file" id="asPhotoInput" accept="image/*" capture="environment" multiple class="hidden" onchange="handleASPhotoUpload(event)">
                    <div class="px-4 py-3 bg-blue-500 text-white text-center rounded-lg hover:bg-blue-600 transition">
                      <i class="fas fa-camera mr-2"></i>사진 촬영
                    </div>
                  </label>
                  <label class="flex-1 cursor-pointer">
                    <input type="file" id="asGalleryInput" accept="image/*" multiple class="hidden" onchange="handleASPhotoUpload(event)">
                    <div class="px-4 py-3 bg-green-500 text-white text-center rounded-lg hover:bg-green-600 transition">
                      <i class="fas fa-images mr-2"></i>갤러리
                    </div>
                  </label>
                </div>
                
                <!-- 사진 미리보기 그리드 -->
                <div id="asPhotoPreview" class="grid grid-cols-3 gap-3"></div>
              </div>
              
              <!-- 텍스트 입력 -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  <i class="fas fa-edit mr-2"></i>작업 내용
                </label>
                <textarea 
                  id="asResultText" 
                  rows="6" 
                  placeholder="A/S 작업 내용을 입력하세요..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>
              
              <!-- 버튼 -->
              <div class="flex gap-3">
                <button onclick="resetASResultForm()" class="flex-1 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 active:bg-gray-700 transition">
                  <i class="fas fa-file-alt mr-2"></i>새로 작성
                </button>
                <button onclick="completeASResult()" class="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 active:bg-green-700 transition">
                  <i class="fas fa-check-circle mr-2"></i>완료
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 고객 목록 하단 패널 (모바일 최적화) -->
        <div id="customerSidePanel" class="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 transition-all duration-300" style="max-height: 60vh;">
          <div class="p-4">
            <!-- 타이틀 헤더 (항상 표시) -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex-1">
                <div class="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
                <h3 class="text-base font-bold text-gray-800 flex items-center">
                  <i class="fas fa-users mr-2"></i>고객 목록
                  <span class="ml-2 text-sm font-normal text-gray-500">
                    (<span id="totalCustomerCount">0</span>명)
                  </span>
                </h3>
              </div>
              <!-- 접기/펼치기 버튼 -->
              <button onclick="toggleCustomerPanel()" class="text-blue-600 hover:text-blue-800 transition p-2">
                <i id="panelToggleIcon" class="fas fa-chevron-down text-xl"></i>
              </button>
            </div>
            
            <!-- 고객명 검색 -->
            <div class="mb-3">
              <div class="relative">
                <input 
                  type="text" 
                  id="customerSearchInput" 
                  placeholder="고객명 검색..." 
                  class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  oninput="filterCustomersByName()"
                />
                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            
            <!-- 고객 목록 콘텐츠 (항상 표시) -->
            <div id="customerListContent" class="overflow-y-auto" style="max-height: calc(100vh - 200px);">
              <div id="customerList"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // 먼저 고객 데이터 로드
  loadCustomers().then(() => {
    // 전체 고객 수 표시
    const totalCountEl = document.getElementById('totalCustomerCount')
    if (totalCountEl) {
      totalCountEl.textContent = state.customers.length
    }
    
    // 초기에 모든 고객 목록 표시 (펼침 상태로 시작)
    const listEl = document.getElementById('customerList')
    if (listEl && state.customers.length > 0) {
      // 모든 고객을 거리순이 아닌 기본 순서로 표시
      listEl.innerHTML = state.customers.map(customer => {
        const markerColor = getMarkerColorByStatus(customer.as_result)
        let statusColor = 'gray'
        let statusIcon = 'fa-circle'
        
        if (markerColor === 'g') {
          statusColor = 'green'
          statusIcon = 'fa-check-circle'
        } else if (markerColor === 'y') {
          statusColor = 'yellow'
          statusIcon = 'fa-clock'
        } else if (markerColor === 'r') {
          statusColor = 'red'
          statusIcon = 'fa-exclamation-circle'
        } else {
          statusColor = 'blue'
          statusIcon = 'fa-circle'
        }
        
        return `
        <div class="p-2 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition mb-1 border border-gray-200" onclick="showCustomerDetail('${customer.id}')">
          <div class="flex items-center justify-between gap-2">
            <span class="text-${statusColor}-500"><i class="fas ${statusIcon} text-xs"></i></span>
            <p class="font-medium text-gray-800 text-sm flex-1">${customer.customer_name}</p>
          </div>
        </div>
        `
      }).join('')
    } else if (listEl) {
      listEl.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">등록된 고객이 없습니다</p>'
    }
    
    // 고객 목록 패널 기본값: 접기
    setTimeout(() => {
      const content = document.getElementById('customerListContent')
      const panel = document.getElementById('customerSidePanel')
      const icon = document.getElementById('panelToggleIcon')
      
      if (content && panel && icon) {
        content.style.display = 'none'  // 접기 상태
        panel.style.maxHeight = '80px'
        icon.className = 'fas fa-chevron-up text-xl'  // 위 화살표
      }
    }, 100)
    
    // DOM이 완전히 렌더링될 때까지 대기
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // T Map API 로드 시도
        const mapDiv = document.getElementById('map')
        if (!mapDiv) {
          console.error('❌ 지도 컨테이너를 찾을 수 없습니다')
          showMapFallback()
          return
        }
        
        if (typeof kakao !== 'undefined' && kakao.maps) {
          console.log('✅ Kakao Maps API 로드됨, 지도 초기화 시작...')
          initKakaoMap()
        } else {
          console.warn('⚠️ Kakao Maps API를 사용할 수 없습니다')
          showMapFallback()
        }
      })
    })
  }).catch(error => {
    console.error('고객 데이터 로드 실패:', error)
    showMapFallback()
  })
}

// 두 좌표 간 거리 계산 (미터)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c) // 미터 단위로 반올림
}

// 거리 포맷 함수 (1000m 이상은 km로 표시)
function formatDistance(meters) {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1)
    return `${km}km`
  }
  return `${meters}m`
}

// 날짜 포맷 함수 (YYYY-MM-DD 형식으로 변환)
function formatDate(dateStr) {
  if (!dateStr) return '-'
  
  try {
    const date = new Date(dateStr)
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      // 이미 YYYY-MM-DD 형식인 경우 그대로 반환
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr
      }
      return '-'
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    return '-'
  }
}

// 주변 고객 목록 표시 (거리순)
function showNearbyCustomers(centerLat, centerLng) {
  // 모든 고객에 대해 거리 계산 (제한 없이 전체 표시)
  const customersWithDistance = state.customers
    .filter(c => c.latitude && c.longitude)
    .map(customer => ({
      ...customer,
      distance: calculateDistance(centerLat, centerLng, customer.latitude, customer.longitude)
    }))
    .sort((a, b) => a.distance - b.distance) // 거리순 정렬
  
  // 정렬된 고객 목록 저장
  state.sortedCustomers = customersWithDistance
  
  // 고객 목록 렌더링
  renderCustomerList()
  
  // 전체 고객 수 업데이트
  const totalCountEl = document.getElementById('totalCustomerCount')
  if (totalCountEl) {
    totalCountEl.textContent = state.customers.length
  }
  
  // 고객 목록 패널 초기 상태: 접기
  const content = document.getElementById('customerListContent')
  const panel = document.getElementById('customerSidePanel')
  const icon = document.getElementById('panelToggleIcon')
  
  if (content && panel && icon) {
    content.style.display = 'none'
    panel.style.maxHeight = '80px'
    icon.className = 'fas fa-chevron-up text-xl'
  }
}

// 고객 목록 렌더링 (지도 뷰용)
function renderCustomerList() {
  const listEl = document.getElementById('customerList')
  if (!listEl) return
  
  if (state.customers.length === 0) {
    listEl.innerHTML = '<p class="text-gray-500 text-center py-4">등록된 고객이 없습니다</p>'
    return
  }
  
  // 거리순 정렬 옵션이 있으면 사용, 없으면 모든 고객 표시
  const displayCustomers = state.sortedCustomers || state.customers
  
  listEl.innerHTML = displayCustomers.map(customer => {
    // AS결과에 따라 상태 색상 결정
    const markerColor = getMarkerColorByStatus(customer.as_result)
    let statusColor = 'gray'
    let statusIcon = 'fa-circle'
    
    if (markerColor === 'g') {
      statusColor = 'green'
      statusIcon = 'fa-check-circle'
    } else if (markerColor === 'y') {
      statusColor = 'yellow'
      statusIcon = 'fa-clock'
    } else if (markerColor === 'r') {
      statusColor = 'red'
      statusIcon = 'fa-exclamation-circle'
    } else {
      statusColor = 'blue'
      statusIcon = 'fa-circle'
    }
    
    // 간소화된 고객명만 표시
    return `
    <div class="p-2 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition mb-1 border border-gray-200" onclick="showCustomerDetail('${customer.id}')">
      <div class="flex items-center justify-between gap-2">
        <span class="text-${statusColor}-500"><i class="fas ${statusIcon} text-xs"></i></span>
        <p class="font-medium text-gray-800 text-sm flex-1">${customer.customer_name}</p>
        ${customer.distance ? `<span class="text-xs text-gray-500">${formatDistance(customer.distance)}</span>` : ''}
      </div>
    </div>
    `
  }).join('')
}

// 지도 로드 실패시 대체 UI
function showMapFallback() {
  const mapDiv = document.getElementById('map')
  if (!mapDiv) return
  
  mapDiv.innerHTML = `
    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div class="text-center p-8 max-w-md">
        <div class="mb-6">
          <i class="fas fa-map-marked-alt text-6xl text-blue-400 mb-4"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-3">Kakao Maps 로딩 중</h2>
        <p class="text-gray-600 mb-4">
          Kakao Maps API를 불러오는 중입니다. 잠시만 기다려주세요.
        </p>
        <div class="bg-white rounded-lg p-4 mb-4 text-left shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-2">Kakao Maps API 상태:</p>
          <p class="text-xs text-gray-600">
            페이지를 새로고침하면 지도가 표시됩니다.
          </p>
        </div>
        <p class="text-sm text-gray-500 mb-4">
          좌측 고객 목록에서 고객을 선택하여 상세 정보를 확인하고 길안내를 이용할 수 있습니다.
        </p>
        <button onclick="location.reload()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <i class="fas fa-sync-alt mr-2"></i>새로고침
        </button>
      </div>
    </div>
  `
}

// AS결과에 따라 마커 색상 결정
function getMarkerColorByStatus(asResult) {
  if (!asResult) return 'b' // 기본 파란색
  
  const result = String(asResult).trim().toLowerCase()
  
  // "completed" 상태 (A/S 완료) - 연한 회색
  if (result === 'completed') {
    return 'gray' // 완료된 A/S
  }
  // "완료" 키워드 포함 시 초록색
  else if (result.includes('완료') || result.includes('수리') || result.includes('교체')) {
    return 'g' // green - 완료된 AS
  }
  // "점검" 또는 "대기" 키워드 포함 시 노란색
  else if (result.includes('점검') || result.includes('대기') || result.includes('예정')) {
    return 'y' // yellow - 점검/대기
  }
  // "취소" 또는 "불가" 키워드 포함 시 회색
  else if (result.includes('취소') || result.includes('불가') || result.includes('보류')) {
    return 'b' // blue(neutral) - 보류/취소
  }
  // 기타는 빨간색 (미완료/문제 있음)
  else {
    return 'r' // red - 미완료/문제
  }
}

// 마커 색상 → 배경색 변환
function getMarkerBgColor(markerColor) {
  const colors = {
    'g': '#10B981',  // 초록색
    'y': '#F59E0B',  // 노란색
    'r': '#EF4444',  // 빨간색
    'b': '#3B82F6'   // 파란색
  }
  return colors[markerColor] || colors['b']
}

// 네이버 지도 초기화
function initKakaoMap() {
  console.log('🗺️ Kakao Maps 초기화 시작...')
  
  const mapDiv = document.getElementById('map')
  if (!mapDiv) {
    console.error('❌ 지도 컨테이너를 찾을 수 없습니다')
    return
  }
  
  // Kakao Maps API 로드 확인
  if (typeof kakao === 'undefined' || !kakao.maps) {
    console.error('❌ Kakao Maps API가 로드되지 않았습니다')
    showMapFallback()
    return
  }
  
  // 기존 맵 제거 (중복 초기화 방지)
  if (state.map) {
    console.log('🔄 기존 지도 제거 중...')
    state.markers.forEach(marker => marker.setMap(null))
    state.markers = []
    state.map = null
  }
  
  try {
    console.log('🗺️ Kakao Maps 지도 초기화 시작...')
    
    // 서울 중심 좌표 (기본값)
    const defaultCenterLat = 37.5665
    const defaultCenterLng = 126.9780
    
    // 고객 좌표의 중심점 계산 (가장 밀집된 지역 찾기)
    const validCustomers = state.customers.filter(c => c.latitude && c.longitude)
    console.log(`📍 표시할 고객 수: ${validCustomers.length}`)
    
    let centerLat, centerLng, level
    
    // 지도 중심 결정 우선순위: 1) 가장 밀집된 고객 지역 2) 서울 중심
    
    // 1순위: 가장 밀집된 고객 지역
    if (validCustomers.length > 0) {
      // 가장 밀집된 지역 찾기 (각 고객 주변 반경 5km 내 고객 수 계산)
      let maxDensityCustomer = validCustomers[0]
      let maxDensity = 0
      
      validCustomers.forEach(customer => {
        let nearbyCount = 0
        validCustomers.forEach(other => {
          const distance = calculateDistance(
            customer.latitude, customer.longitude,
            other.latitude, other.longitude
          )
          if (distance <= 5000) { // 5km 반경
            nearbyCount++
          }
        })
        
        if (nearbyCount > maxDensity) {
          maxDensity = nearbyCount
          maxDensityCustomer = customer
        }
      })
      
      console.log(`🎯 가장 밀집된 지역: ${maxDensityCustomer.customer_name} 주변 (${maxDensity}명)`)
      centerLat = maxDensityCustomer.latitude
      centerLng = maxDensityCustomer.longitude
      level = 8  // Kakao Maps level (낮을수록 확대)
    } else {
      // 3순위: 서울 중심 (기본값)
      centerLat = defaultCenterLat
      centerLng = defaultCenterLng
      level = 9
    }
    
    // Kakao Maps 생성
    const mapOption = {
      center: new kakao.maps.LatLng(centerLat, centerLng),
      level: level
    }
    
    state.map = new kakao.maps.Map(mapDiv, mapOption)
    
    // 지도 타입 컨트롤 추가 (일반/위성 전환)
    const mapTypeControl = new kakao.maps.MapTypeControl()
    state.map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT)
    
    // 줌 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl()
    state.map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT)
    
    console.log('✅ Kakao Maps 객체 생성 완료')
    console.log('🗺️ 지도 중심:', centerLat, centerLng, 'Level:', level)
    
    // 고객 마커 추가
    console.log(`📍 마커 생성 시작 - 고객 수: ${validCustomers.length}`)
    
    validCustomers.forEach((customer, index) => {
      try {
        // AS결과에 따라 마커 색상 및 아이콘 결정
        const markerColor = getMarkerColorByStatus(customer.as_result)
        
        let bgColor, iconColor, iconClass, statusText
        if (markerColor === 'gray') {
          bgColor = '#D1D5DB'  // 연한 회색 (A/S 완료)
          iconColor = '#6B7280'
          iconClass = 'fa-check-circle'
          statusText = 'A/S 완료'
        } else if (markerColor === 'g') {
          bgColor = '#10B981'  // 초록색 (완료)
          iconColor = '#FFFFFF'
          iconClass = 'fa-check-circle'
          statusText = '완료'
        } else if (markerColor === 'y') {
          bgColor = '#F59E0B'  // 노란색 (대기)
          iconColor = '#FFFFFF'
          iconClass = 'fa-clock'
          statusText = '대기'
        } else if (markerColor === 'r') {
          bgColor = '#EF4444'  // 빨간색 (미완료)
          iconColor = '#FFFFFF'
          iconClass = 'fa-exclamation-circle'
          statusText = '미완료'
        } else {
          bgColor = '#3B82F6'  // 파란색 (기본)
          iconColor = '#FFFFFF'
          iconClass = 'fa-map-marker-alt'
          statusText = '기본'
        }
        
        // 고객명 짧게 표시 (최대 4글자)
        const shortName = customer.customer_name.length > 4 
          ? customer.customer_name.substring(0, 4) 
          : customer.customer_name
        
        // 각 마커에 고유 ID 생성 (customer.id만 사용)
        const uniqueMarkerId = `marker-cid-${customer.id}`
        
        // CustomOverlay로 핀포인트 말풍선 마커 생성
        // onclick을 인라인으로 직접 추가 (CustomOverlay는 이 방식만 작동)
        const markerContent = `
          <div onclick="handleMarkerClick('${customer.id}')" class="custom-marker" id="${uniqueMarkerId}" data-customer-id="${customer.id}" style="position: relative; cursor: pointer; transform: translate(-50%, -100%);">
            <!-- 핀포인트 말풍선 컨테이너 -->
            <div style="position: relative;">
              <!-- 상단 원형 부분 -->
              <div style="
                width: 48px;
                height: 48px;
                background: ${bgColor};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
              ">
                <!-- 아이콘 (회전 보정) -->
                <i class="fas ${iconClass}" style="
                  color: ${iconColor};
                  font-size: 20px;
                  transform: rotate(45deg);
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(45deg);
                "></i>
              </div>
              <!-- 하단 꼬리 부분 -->
              <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 12px solid ${bgColor};
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
              "></div>
            </div>
          </div>
        `
        
        const customOverlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(customer.latitude, customer.longitude),
          content: markerContent,
          zIndex: 100
        })
        
        customOverlay.setMap(state.map)
        
        state.markers.push(customOverlay)
        console.log(`✅ 마커 ${index + 1} 생성 완료: ${customer.customer_name} (${statusText})`)
      } catch (error) {
        console.error(`❌ 마커 ${index + 1} 생성 실패:`, error)
      }
    })
    
    console.log(`✅ Kakao Maps 초기화 완료: ${validCustomers.length}개의 마커 생성 시도, ${state.markers.length}개 성공`)
    
    showToast('지도가 로드되었습니다', 'success')
    
    // GPS 버튼 초기 상태 설정
    updateGPSButtonStyle()
    
    // 지도 초기화 완료 후 GPS 위치 요청 (GPS 활성화 상태일 때만)
    if (state.gpsEnabled) {
      requestUserLocation()
    }
    
  } catch (error) {
    console.error('❌ Kakao Maps 초기화 실패:', error)
    showMapFallback()
    showToast('지도 로드 실패: Kakao Maps API를 확인해주세요', 'error')
  }
}

// GPS 버튼 스타일 업데이트
function updateGPSButtonStyle() {
  const gpsIcon = document.getElementById('gpsIcon')
  const gpsBtn = document.getElementById('gpsToggleBtn')
  
  if (!gpsIcon || !gpsBtn) {
    console.log('⚠️ GPS 버튼 요소를 찾을 수 없습니다')
    return
  }
  
  if (state.gpsEnabled) {
    gpsIcon.style.color = '#3B82F6'  // 파란색
    gpsBtn.style.backgroundColor = '#EFF6FF'  // 연한 파란색 배경
    console.log('✅ GPS 버튼 활성화 스타일 적용')
  } else {
    gpsIcon.style.color = '#6B7280'  // 회색
    gpsBtn.style.backgroundColor = '#FFFFFF'  // 흰색 배경
    console.log('⭕ GPS 버튼 비활성화 스타일 적용')
  }
}

// GPS 위치 요청
function requestUserLocation() {
  if (!navigator.geolocation) {
    console.log('⚠️ GPS를 지원하지 않는 브라우저입니다')
    return
  }
  
  if (state.userLocation) {
    console.log('✅ GPS 위치 이미 존재:', state.userLocation)
    addUserLocationMarker()
    return
  }
  
  console.log('📍 GPS 위치 요청 중...')
  showToast('GPS 위치를 가져오는 중...', 'info')
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      console.log(`✅ GPS 위치 확인: ${state.userLocation.lat}, ${state.userLocation.lng}`)
      
      // GPS 위치로 지도 중심 이동
      if (state.map) {
        state.map.setCenter(new kakao.maps.LatLng(state.userLocation.lat, state.userLocation.lng))
        state.map.setLevel(4)  // Kakao Maps level (낮을수록 확대)
        showToast('현재 위치로 이동했습니다', 'success')
      }
      
      // GPS 마커 추가
      addUserLocationMarker()
    },
    (error) => {
      console.log('⚠️ GPS 위치 가져오기 실패:', error.message)
      console.log('오류 코드:', error.code, '| PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3')
      
      let errorMsg = '위치 정보를 가져올 수 없습니다'
      if (error.code === 1) errorMsg = '위치 권한이 필요합니다'
      else if (error.code === 2) errorMsg = '위치 정보를 사용할 수 없습니다'
      else if (error.code === 3) errorMsg = '위치 요청 시간이 초과되었습니다'
      
      showToast(errorMsg, 'warning')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

// GPS 위치 마커 추가
function addUserLocationMarker() {
  if (!state.map || !state.userLocation) {
    console.log('⚠️ GPS 마커 생성 불가:', !state.map ? '지도 없음' : '위치 없음')
    return
  }
  
  try {
    // 기존 GPS 마커 제거
    if (state.userLocationMarker) {
      state.userLocationMarker.setMap(null)
      state.userLocationMarker = null
    }
    
    console.log('📍 GPS 마커 생성 시작:', state.userLocation.lat, state.userLocation.lng)
    
    // Kakao CustomOverlay로 펄스 애니메이션 마커 생성
    const markerContent = `
      <div style="position: relative; width: 80px; height: 80px; transform: translate(-50%, -50%);">
        <!-- 펄스 애니메이션 외부 링 -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(255, 0, 0, 0.3); border-radius: 50%; animation: pulse-gps 2s infinite;"></div>
        <!-- 중간 링 -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(255, 0, 0, 0.5); border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(255,0,0,0.5);"></div>
        <!-- 내부 점 -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: #FF0000; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10;"></div>
      </div>
      <style>
        @keyframes pulse-gps {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.9;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.9;
          }
        }
      </style>
    `
    
    const customOverlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(state.userLocation.lat, state.userLocation.lng),
      content: markerContent,
      zIndex: 999
    })
    
    customOverlay.setMap(state.map)
    state.userLocationMarker = customOverlay
    
    console.log('✅ GPS 마커 추가 완료 (빨간색 펄스 애니메이션)')
    
  } catch (error) {
    console.error('❌ GPS 마커 생성 실패:', error)
  }
}

// 대시보드 통계 업데이트
function updateDashboardStats() {
  const totalEl = document.getElementById('totalCustomers')
  const geoEl = document.getElementById('geoCodedCustomers')
  const todayEl = document.getElementById('todayCustomers')
  
  if (totalEl) totalEl.textContent = state.customers.length
  
  if (geoEl) {
    const geoCodedCount = state.customers.filter(c => c.latitude && c.longitude).length
    geoEl.textContent = geoCodedCount
  }
  
  if (todayEl) {
    const today = new Date().toISOString().split('T')[0]
    const todayCount = state.customers.filter(c => c.created_at.startsWith(today)).length
    todayEl.textContent = todayCount
  }
}

// 고객 테이블 렌더링
function renderCustomerTable() {
  const tbody = document.getElementById('customerTableBody')
  if (!tbody) return
  
  if (state.customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2"></i>
          <p>등록된 고객이 없습니다</p>
        </td>
      </tr>
    `
    return
  }
  
  tbody.innerHTML = state.customers.map(customer => `
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-3">
        <input type="checkbox" class="customer-checkbox rounded" value="${customer.id}">
      </td>
      <td class="px-4 py-3 text-sm text-gray-900">${customer.customer_name}</td>
      <td class="px-4 py-3 text-sm text-gray-600">${customer.phone || '-'}</td>
      <td class="px-4 py-3 text-sm text-gray-600">${customer.address}</td>
      <td class="px-4 py-3 text-sm">
        ${customer.latitude && customer.longitude 
          ? '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>등록됨</span>' 
          : '<span class="text-gray-400"><i class="fas fa-times-circle mr-1"></i>미등록</span>'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-600">${new Date(customer.created_at).toLocaleDateString('ko-KR')}</td>
    </tr>
  `).join('')
}

// ============================================
// 이벤트 핸들러
// ============================================

function logout() {
  clearSession()
  // 자동 로그인 해제 (아이디 저장은 유지)
  localStorage.removeItem('savedPassword')
  localStorage.removeItem('autoLoginChecked')
  showToast('로그아웃 되었습니다', 'info')
  renderLogin()
}

function switchToUserView() {
  renderUserMap()
}

// A/S 결과 Excel 다운로드
async function downloadASResults() {
  try {
    console.log('📊 A/S 결과 다운로드 시작...')
    showToast('Excel 파일을 생성 중입니다...', 'info')
    
    // 서버에서 Excel 파일 다운로드
    const response = await fetch('/api/as-results/export')
    
    if (!response.ok) {
      throw new Error('Excel 파일 생성 실패')
    }
    
    // Blob으로 변환
    const blob = await response.blob()
    
    // 파일명 추출 (Content-Disposition 헤더에서)
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'AS결과.xlsx'
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/)
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1])
      }
    }
    
    // 다운로드 링크 생성 및 클릭
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    
    // 정리
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    console.log('✅ Excel 다운로드 완료:', filename)
    showToast('Excel 파일이 다운로드되었습니다', 'success')
  } catch (error) {
    console.error('❌ Excel 다운로드 오류:', error)
    showToast('Excel 다운로드 중 오류가 발생했습니다', 'error')
  }
}

function toggleSelectAll(checkbox) {
  const checkboxes = document.querySelectorAll('.customer-checkbox')
  checkboxes.forEach(cb => cb.checked = checkbox.checked)
}

async function deleteSelectedCustomers() {
  const checkboxes = document.querySelectorAll('.customer-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => cb.value)  // UUID를 그대로 사용
  
  if (ids.length === 0) {
    showToast('삭제할 고객을 선택해주세요', 'error')
    return
  }
  
  if (!confirm(`선택한 ${ids.length}명의 고객을 삭제하시겠습니까?`)) {
    return
  }
  
  console.log('🗑️ 삭제 시도:', ids)
  await batchDeleteCustomers(ids)
  updateDashboardStats()
  renderCustomerTable()
}

function openUploadModal() {
  const modal = document.getElementById('uploadModal')
  const step1 = document.getElementById('uploadStep1')
  
  if (modal) {
    modal.classList.remove('hidden')
  }
  
  if (step1) {
    step1.classList.remove('hidden')
  }
  
  // uploadStep2는 더 이상 사용하지 않으므로 제거
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.add('hidden')
  state.uploadFile = null
  state.uploadFileName = null
  
  // 첨부 파일 목록 초기화
  const listEl = document.getElementById('attachedFilesList')
  if (listEl) {
    listEl.innerHTML = `
      <p class="text-sm text-gray-500 text-center py-8">
        <i class="fas fa-inbox text-3xl text-gray-300 mb-2"></i><br>
        첨부된 파일이 없습니다
      </p>
    `
  }
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // 파일 확장자 확인
  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    showToast('Excel 파일(.xlsx, .xls)만 업로드 가능합니다', 'error')
    event.target.value = ''
    return
  }
  
  try {
    // 파일명 저장
    state.uploadFileName = file.name
    state.uploadFile = file
    
    // 첨부 파일 목록에 표시
    renderAttachedFile(file)
    
    showToast('파일이 첨부되었습니다. "파일 열기"로 내용을 확인하세요', 'success')
  } catch (error) {
    console.error('파일 첨부 오류:', error)
    showToast('파일을 첨부할 수 없습니다: ' + error.message, 'error')
  }
  
  // 파일 입력 초기화
  event.target.value = ''
}

// 첨부 파일 표시 (메일 형식)
function renderAttachedFile(file) {
  const listEl = document.getElementById('attachedFilesList')
  const fileSize = (file.size / 1024).toFixed(2) // KB
  
  listEl.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-lg p-3">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3 flex-1">
          <i class="fas fa-file-excel text-green-600 text-2xl"></i>
          <div class="flex-1 min-w-0">
            <a href="#" onclick="previewAttachedFile(); return false;" class="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium">
              ${file.name}
            </a>
            <p class="text-xs text-gray-500 mt-1">${fileSize} KB</p>
          </div>
        </div>
        <button onclick="removeAttachedFile()" class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="flex justify-end">
        <button onclick="validateAttachedFile()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          <i class="fas fa-upload mr-2"></i>업로드
        </button>
      </div>
    </div>
  `
}

// 첨부 파일 열기 (새 탭에서)
function previewAttachedFile() {
  if (!state.uploadFile) {
    showToast('첨부된 파일이 없습니다', 'error')
    return
  }
  
  try {
    // Blob URL 생성
    const url = URL.createObjectURL(state.uploadFile)
    
    // 다운로드 링크 생성 및 클릭 (Excel에서 바로 열기)
    const link = document.createElement('a')
    link.href = url
    link.download = state.uploadFileName || 'file.xlsx'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToast('Excel 파일을 다운로드했습니다. Excel에서 열어주세요', 'success')
    
    // URL 해제
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  } catch (error) {
    console.error('파일 열기 오류:', error)
    showToast('파일을 열 수 없습니다: ' + error.message, 'error')
  }
}

// 파일 검증 (업로드 전)
async function validateAttachedFile() {
  if (!state.uploadFile) {
    showToast('첨부된 파일이 없습니다', 'error')
    return
  }
  
  try {
    // 업로드 확인
    const confirmed = confirm(`${state.uploadFileName} 파일을 업로드하시겠습니까?`)
    if (!confirmed) return
    
    // 로딩 토스트
    showToast('파일을 업로드하는 중...', 'info')
    
    // Excel 파일 파싱
    const data = await parseExcel(state.uploadFile)
    
    if (data.length === 0) {
      showToast('파일에 데이터가 없습니다', 'error')
      return
    }
    
    console.log('📊 파싱된 데이터:', data)
    
    // 지오코딩 (주소 → 좌표 변환)
    showToast('주소를 좌표로 변환하는 중...', 'info')
    
    const dataWithGeo = await Promise.all(
      data.map(async (row) => {
        // 주소가 있으면 지오코딩
        if (row.address && row.address.trim() !== '') {
          const geoData = await geocodeAddress(row.address)
          return {
            ...row,
            latitude: geoData?.latitude,
            longitude: geoData?.longitude
          }
        }
        return row
      })
    )
    
    console.log('🗺️ 지오코딩 완료:', dataWithGeo)
    
    // 서버에 업로드
    const response = await axios.post('/api/customers/batch-upload', {
      data: dataWithGeo,
      userId: state.currentUser.id
    })
    
    if (response.data.success) {
      showToast(`✅ ${response.data.summary.success}건의 고객 데이터가 업로드되었습니다`, 'success')
      closeUploadModal()
      
      // 고객 목록 새로고침
      await loadCustomers()
      updateDashboardStats()
      renderCustomerTable()
    } else {
      showToast('업로드 실패: ' + response.data.message, 'error')
    }
  } catch (error) {
    console.error('파일 업로드 오류:', error)
    showToast('파일을 업로드할 수 없습니다: ' + error.message, 'error')
  }
}

// 첨부 파일 제거
function removeAttachedFile() {
  state.uploadFile = null
  state.uploadFileName = null
  state.uploadRawData = null
  state.uploadPreviewData = null
  
  const listEl = document.getElementById('attachedFilesList')
  listEl.innerHTML = `
    <p class="text-sm text-gray-500 text-center py-8">
      <i class="fas fa-inbox text-3xl text-gray-300 mb-2"></i><br>
      첨부된 파일이 없습니다
    </p>
  `
  
  showToast('파일이 제거되었습니다', 'success')
}

// 샘플 Excel 파일 다운로드
function downloadSampleExcel() {
  // 샘플 데이터 생성 (실제 업무 양식)
  const sampleData = [
    ['순번', '횟수', '접수일자', '업체', '구분', '고객명', '전화번호', '설치연,월', '열원', '주소', 'A/S접수내용', '설치팀', '지역', '접수자', 'AS결과'],
    [1, 1, '2024-01-15', '서울지사', 'AS', '김철수', '010-1234-5678', '2023-12', '가스', '서울특별시 강남구 테헤란로 123', '온수 온도 조절 불량', '1팀', '강남', '홍길동', '수리 완료'],
    [2, 1, '2024-01-16', '서울지사', 'AS', '이영희', '010-2345-6789', '2023-11', '전기', '서울특별시 서초구 서초대로 78길 22', '난방 작동 불량', '2팀', '서초', '김영희', '부품 교체 완료'],
    [3, 2, '2024-01-17', '서울지사', 'AS', '박민수', '010-3456-7890', '2023-10', '가스', '서울특별시 송파구 올림픽로 300', '보일러 소음 발생', '1팀', '송파', '홍길동', '점검 완료']
  ]
  
  // 워크북 생성
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sampleData)
  
  // 열 너비 설정
  ws['!cols'] = [
    { wch: 8 },   // 순번
    { wch: 8 },   // 횟수
    { wch: 12 },  // 접수일자
    { wch: 12 },  // 업체
    { wch: 8 },   // 구분
    { wch: 12 },  // 고객명
    { wch: 15 },  // 전화번호
    { wch: 12 },  // 설치연,월
    { wch: 8 },   // 열원
    { wch: 40 },  // 주소
    { wch: 30 },  // A/S접수내용
    { wch: 10 },  // 설치팀
    { wch: 10 },  // 지역
    { wch: 10 },  // 접수자
    { wch: 20 }   // AS결과
  ]
  
  XLSX.utils.book_append_sheet(wb, ws, 'A/S접수현황')
  
  // 파일 다운로드
  XLSX.writeFile(wb, 'A/S접수현황_템플릿.xlsx')
  showToast('템플릿 파일이 다운로드되었습니다', 'success')
}

// 파일 정보 표시
function renderFileInfo() {
  const fileInfoEl = document.getElementById('fileInfo')
  if (!fileInfoEl) return
  
  fileInfoEl.innerHTML = `
    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
      <div class="flex items-center">
        <i class="fas fa-file-excel text-blue-600 text-2xl mr-3"></i>
        <div class="flex-1">
          <p class="font-semibold">
            <a href="#" onclick="previewAttachedFile(); return false;" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">
              ${state.uploadFileName || '파일명 없음'}
            </a>
          </p>
          <p class="text-sm text-blue-700">총 ${state.uploadRawData?.length || 0}개의 데이터</p>
        </div>
      </div>
    </div>
  `
}

function renderValidationSummary(validation) {
  const summaryEl = document.getElementById('validationSummary')
  summaryEl.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-blue-700">${validation.summary.total}</p>
        <p class="text-sm text-blue-600">전체</p>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-green-700">${validation.summary.valid}</p>
        <p class="text-sm text-green-600">유효</p>
      </div>
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-red-700">${validation.summary.invalid}</p>
        <p class="text-sm text-red-600">오류</p>
      </div>
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-yellow-700">${validation.summary.duplicates}</p>
        <p class="text-sm text-yellow-600">중복</p>
      </div>
    </div>
    
    <div class="flex justify-end space-x-3">
      <button onclick="closeUploadModal()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
        취소
      </button>
      ${validation.summary.valid > 0 ? `
      <button onclick="confirmUpload()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
        ${validation.summary.valid}건 업로드
      </button>
      ` : ''}
    </div>
  `
}

function renderDataPreview(validation) {
  const previewEl = document.getElementById('dataPreview')
  
  let html = ''
  
  // 유효한 데이터 - 간단한 요약만 표시
  if (validation.validRows.length > 0) {
    html += `
      <div class="mb-6">
        <h4 class="font-semibold text-green-700 mb-3">
          <i class="fas fa-check-circle mr-2"></i>유효한 데이터 (${validation.validRows.length}건)
        </h4>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm text-green-800">
            <i class="fas fa-info-circle mr-2"></i>
            ${validation.validRows.length}건의 고객 데이터가 업로드 준비되었습니다.
          </p>
          <p class="text-xs text-green-700 mt-2">
            파일을 확인하려면 Excel 프로그램에서 직접 열어보세요.
          </p>
        </div>
      </div>
    `
  }
  
  // 오류 데이터
  if (validation.invalidRows.length > 0) {
    html += `
      <div class="mb-6">
        <h4 class="font-semibold text-red-700 mb-3">
          <i class="fas fa-exclamation-triangle mr-2"></i>오류 데이터 (${validation.invalidRows.length}건)
        </h4>
        <div class="overflow-x-auto max-h-60 overflow-y-auto border rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-red-50 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">No</th>
                <th class="px-3 py-2 text-left">고객명</th>
                <th class="px-3 py-2 text-left">주소</th>
                <th class="px-3 py-2 text-left">오류</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              ${validation.invalidRows.map(row => `
                <tr>
                  <td class="px-3 py-2">${row.rowIndex}</td>
                  <td class="px-3 py-2">${row.customer_name || '-'}</td>
                  <td class="px-3 py-2">${row.address || '-'}</td>
                  <td class="px-3 py-2 text-red-600">${row.errors.join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }
  
  // 중복 데이터
  if (validation.duplicates && validation.duplicates.length > 0) {
    html += `
      <div class="mb-6">
        <h4 class="font-semibold text-yellow-700 mb-3">
          <i class="fas fa-copy mr-2"></i>중복 데이터 (${validation.duplicates.length}건)
        </h4>
        <div class="overflow-x-auto max-h-60 overflow-y-auto border rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-yellow-50 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">No</th>
                <th class="px-3 py-2 text-left">고객명</th>
                <th class="px-3 py-2 text-left">주소</th>
                <th class="px-3 py-2 text-left">사유</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              ${validation.duplicates.map(row => `
                <tr>
                  <td class="px-3 py-2">${row.rowIndex}</td>
                  <td class="px-3 py-2">${row.customer_name || '-'}</td>
                  <td class="px-3 py-2">${row.address || '-'}</td>
                  <td class="px-3 py-2 text-yellow-700">${row.reason || '중복된 주소'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }
  
  previewEl.innerHTML = html
}

async function confirmUpload() {
  if (!state.uploadPreviewData || !state.uploadPreviewData.validRows.length) {
    showToast('업로드할 데이터가 없습니다', 'error')
    return
  }
  
  try {
    // 즉시 로딩 화면으로 전환
    const summaryEl = document.getElementById('validationSummary')
    const previewEl = document.getElementById('dataPreview')
    
    summaryEl.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600 text-lg font-semibold">고객 데이터를 업로드하는 중...</p>
          <p class="text-gray-500 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    `
    previewEl.innerHTML = ''
    
    // 주소를 좌표로 변환 (병렬 처리로 속도 향상)
    const geocodePromises = state.uploadPreviewData.validRows.map(async (row) => {
      const geoData = await geocodeAddress(row.address)
      return {
        ...row,
        latitude: geoData?.latitude,
        longitude: geoData?.longitude
      }
    })
    
    const validRowsWithGeo = await Promise.all(geocodePromises)
    
    // 데이터 업로드
    await batchUploadCustomers(validRowsWithGeo)
    
    // 완료 후 모달 닫기
    closeUploadModal()
    showToast('고객 데이터가 성공적으로 업로드되었습니다', 'success')
    
    // 대시보드 업데이트
    updateDashboardStats()
    renderCustomerTable()
  } catch (error) {
    console.error('업로드 오류:', error)
    showToast('업로드 중 오류가 발생했습니다: ' + error.message, 'error')
  }
}

function showCustomerDetail(customerId) {
  console.log('📋 showCustomerDetail 호출됨 | customerId:', customerId, '| Type:', typeof customerId)
  
  const customer = state.customers.find(c => String(c.id) === String(customerId))
  
  if (!customer) {
    console.error('❌ 고객을 찾을 수 없습니다 | ID:', customerId)
    console.log('현재 state.customers 첫 5개:', state.customers.slice(0, 5).map(c => ({ id: c.id, name: c.customer_name })))
    showToast('고객 정보를 찾을 수 없습니다', 'error')
    return
  }
  
  console.log('✅ 고객 정보 찾음:', customer.customer_name)
  
  const panel = document.getElementById('customerDetailPanel')
  const content = document.getElementById('customerDetailContent')
  
  if (!panel) {
    console.error('❌ customerDetailPanel 요소를 찾을 수 없습니다')
    return
  }
  
  if (!content) {
    console.error('❌ customerDetailContent 요소를 찾을 수 없습니다')
    return
  }
  
  console.log('✅ 패널 요소 찾음, HTML 렌더링 시작...')
  
  content.innerHTML = `
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-sm text-gray-600">고객명</p>
          <button onclick="openASResultModal('${customer.id}')" class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition">
            <i class="fas fa-clipboard-check mr-1"></i>A/S 결과
          </button>
        </div>
        <p class="text-lg font-semibold text-gray-800">${customer.customer_name}</p>
      </div>
      
      <div>
        <p class="text-sm text-gray-600">전화번호</p>
        <div class="flex items-center gap-3">
          <p class="text-gray-800 flex-1">${customer.phone || '-'}</p>
          ${customer.phone ? `
          <a href="tel:${customer.phone}" class="px-4 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 active:bg-green-700 transition touch-action-manipulation">
            <i class="fas fa-phone mr-1"></i>통화연결
          </a>
          ` : ''}
        </div>
      </div>
      
      <div>
        <p class="text-sm text-gray-600">주소</p>
        <p class="text-gray-800">${customer.address}</p>
      </div>
      
      <div>
        <p class="text-sm text-gray-600">지역</p>
        <p class="text-gray-800">${customer.region || '-'}</p>
      </div>
      
      <div>
        <p class="text-sm text-gray-600">A/S접수내용</p>
        <p class="text-gray-800">${customer.as_content || '-'}</p>
      </div>
      
      ${customer.as_result ? `
      <div>
        <p class="text-sm text-gray-600">AS결과</p>
        <p class="text-gray-800">${customer.as_result}</p>
      </div>
      ` : ''}
      
      ${customer.install_team ? `
      <div>
        <p class="text-sm text-gray-600">설치팀</p>
        <p class="text-gray-800">${customer.install_team}</p>
      </div>
      ` : ''}
      
      <div>
        <p class="text-sm text-gray-600">접수일자</p>
        <p class="text-gray-800">${formatDate(customer.receipt_date || customer.created_at)}</p>
      </div>
      
      <div class="pt-4 border-t space-y-3">
        ${customer.latitude && customer.longitude ? `
        <button onclick="openNavigation(${customer.latitude}, ${customer.longitude}, '${customer.customer_name.replace(/'/g, "\\'")}')" class="w-full px-6 py-4 text-lg font-semibold bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 active:bg-yellow-700 transition touch-action-manipulation">
          <i class="fas fa-location-arrow mr-2"></i>Kakao Map에서 길 안내
        </button>
        <button onclick="openTMapNavigation(${customer.latitude}, ${customer.longitude}, '${customer.customer_name.replace(/'/g, "\\'")}')" class="w-full px-6 py-4 text-lg font-semibold bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:bg-blue-700 transition touch-action-manipulation">
          <i class="fas fa-map-marked-alt mr-2"></i>T Map에서 길 안내
        </button>
        ` : ''}
      </div>
    </div>
  `
  
  console.log('✅ HTML 렌더링 완료, 패널 표시...')
  panel.classList.remove('hidden')
  console.log('✅ 패널 hidden 클래스 제거 완료')
  
  // 지도가 있으면 고객 위치로 이동
  if (state.map && customer.latitude && customer.longitude) {
    state.map.setCenter(new kakao.maps.LatLng(customer.latitude, customer.longitude))
    state.map.setLevel(4)  // Kakao Maps level (낮을수록 확대)
    console.log('✅ 지도 중심 이동 완료:', customer.latitude, customer.longitude)
  }
  
  console.log('✅ showCustomerDetail 완료')
}

// 지도에서 고객 상세정보 표시 (마커 클릭시)
function showCustomerDetailOnMap(customer) {
  console.log('📋 showCustomerDetailOnMap 호출됨:', customer.customer_name, '| ID:', customer.id)
  
  // 지도 중심을 마커 위치로 이동
  if (state.map && customer.latitude && customer.longitude) {
    state.map.setCenter(new kakao.maps.LatLng(customer.latitude, customer.longitude))
    state.map.setLevel(4)  // 확대
    console.log('🗺️ 지도 중심 이동 완료:', customer.latitude, customer.longitude)
  }
  
  // 고객 상세 정보 표시
  showCustomerDetail(customer.id)
  console.log('✅ 고객 상세 정보 패널 표시 완료')
}

function closeCustomerDetail() {
  document.getElementById('customerDetailPanel').classList.add('hidden')
}

// 네이버 지도 길 안내 (내비게이션 모드)
function openNavigation(lat, lng, name) {
  // Kakao JavaScript API를 사용한 길 안내
  // JavaScript Key: c933c69ba4e0228895438c6a8c327e74
  
  try {
    if (typeof Kakao === 'undefined') {
      console.error('Kakao JavaScript SDK가 로드되지 않았습니다')
      // 폴백: 웹 URL 사용
      const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
      window.open(kakaoMapUrl, '_blank')
      showToast('카카오맵에서 길 안내를 시작합니다', 'success')
      return
    }
    
    // Kakao Navi 앱 URL 스킴
    const kakaoNaviUrl = `kakaonavi://navigate?destination=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`
    
    // Kakao Map 웹 URL (앱이 없을 경우 대체)
    const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
    
    // 모바일 환경 체크
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      // 모바일에서는 Kakao Navi 앱 스킴 시도
      window.location.href = kakaoNaviUrl
      
      // 1.5초 후에도 페이지가 그대로면 앱이 없는 것으로 판단
      setTimeout(() => {
        // 앱이 없으면 Kakao Map 웹으로 이동
        if (!document.hidden) {
          window.location.href = kakaoMapUrl
        }
      }, 1500)
    } else {
      // 데스크톱에서는 Kakao Map 웹으로 연결
      window.open(kakaoMapUrl, '_blank')
    }
    
    showToast('카카오내비로 길 안내를 시작합니다', 'success')
  } catch (error) {
    console.error('길 안내 오류:', error)
    showToast('길 안내를 실행할 수 없습니다', 'error')
  }
}

// T Map 길 안내
function openTMapNavigation(lat, lng, name) {
  // T Map App Key: vSWmSa8CcO4uvyc0EsAg46SWvxNVAKzL8KGbckPB
  
  try {
    // T Map 앱 URL 스킴
    const tmapAppUrl = `tmap://route?goalname=${encodeURIComponent(name)}&goalx=${lng}&goaly=${lat}`
    
    // T Map 웹 URL (앱이 없을 경우 대체)
    const tmapWebUrl = `https://apis.openapi.sk.com/tmap/app/routes?appKey=vSWmSa8CcO4uvyc0EsAg46SWvxNVAKzL8KGbckPB&name=${encodeURIComponent(name)}&lon=${lng}&lat=${lat}`
    
    // 모바일 환경 체크
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      // 모바일에서는 T Map 앱 스킴 시도
      window.location.href = tmapAppUrl
      
      // 1.5초 후에도 페이지가 그대로면 앱이 없는 것으로 판단
      setTimeout(() => {
        // 앱이 없으면 T Map 웹으로 이동
        if (!document.hidden) {
          window.location.href = tmapWebUrl
        }
      }, 1500)
    } else {
      // 데스크톱에서는 T Map 웹으로 연결
      window.open(tmapWebUrl, '_blank')
    }
    
    showToast('T Map으로 길 안내를 시작합니다', 'success')
  } catch (error) {
    console.error('T Map 길 안내 오류:', error)
    showToast('T Map 길 안내를 실행할 수 없습니다', 'error')
  }
}

// T Map에서 검색 (길찾기)
function openDirections(address) {
  // T Map 검색 URL
  const url = `https://www.tmap.co.kr/tmap2/mobile/search.jsp?name=${encodeURIComponent(address)}`
  window.open(url, '_blank')
  showToast('T Map에서 주소를 검색합니다', 'info')
}

// 고객 목록 패널 접기/펼치기
function toggleCustomerPanel() {
  const panel = document.getElementById('customerSidePanel')
  const content = document.getElementById('customerListContent')
  const icon = document.getElementById('panelToggleIcon')
  
  if (!panel || !content || !icon) return
  
  const isCollapsed = content.style.display === 'none'
  
  if (isCollapsed) {
    // 펼치기
    content.style.display = 'block'
    panel.style.maxHeight = '60vh'
    icon.className = 'fas fa-chevron-down text-xl'
  } else {
    // 접기
    content.style.display = 'none'
    panel.style.maxHeight = '80px'
    icon.className = 'fas fa-chevron-up text-xl'
  }
}

// 고객명으로 검색 필터링
function filterCustomersByName() {
  const searchInput = document.getElementById('customerSearchInput')
  if (!searchInput) return
  
  const searchText = searchInput.value.trim().toLowerCase()
  
  // 검색어가 없으면 전체 고객 표시
  if (!searchText) {
    renderCustomerList()
    return
  }
  
  // 현재 표시 중인 고객 목록에서 검색
  const displayCustomers = state.sortedCustomers || state.customers
  const filteredCustomers = displayCustomers.filter(customer => 
    customer.customer_name && customer.customer_name.toLowerCase().includes(searchText)
  )
  
  // 필터링된 고객 목록 렌더링
  const listEl = document.getElementById('customerList')
  if (!listEl) return
  
  if (filteredCustomers.length === 0) {
    listEl.innerHTML = '<p class="text-gray-500 text-center py-4">검색 결과가 없습니다</p>'
    return
  }
  
  listEl.innerHTML = filteredCustomers.map(customer => {
    // AS결과에 따라 상태 색상 결정
    const markerColor = getMarkerColorByStatus(customer.as_result)
    let statusColor = 'gray'
    let statusIcon = 'fa-circle'
    
    if (markerColor === 'g') {
      statusColor = 'green'
      statusIcon = 'fa-check-circle'
    } else if (markerColor === 'y') {
      statusColor = 'yellow'
      statusIcon = 'fa-clock'
    } else if (markerColor === 'r') {
      statusColor = 'red'
      statusIcon = 'fa-exclamation-circle'
    } else {
      statusColor = 'blue'
      statusIcon = 'fa-circle'
    }
    
    return `
    <div class="p-2 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition mb-1 border border-gray-200" onclick="showCustomerDetail('${customer.id}')">
      <div class="flex items-center justify-between gap-2">
        <span class="text-${statusColor}-500"><i class="fas ${statusIcon} text-xs"></i></span>
        <p class="font-medium text-gray-800 text-sm flex-1">${customer.customer_name}</p>
        ${customer.distance ? `<span class="text-xs text-gray-500">${formatDistance(customer.distance)}</span>` : ''}
      </div>
    </div>
    `
  }).join('')
}

// 위성 지도 보기 (Kakao Maps로 이동)
function toggleMapType() {
  if (!state.map) {
    showToast('지도를 먼저 로드해주세요', 'error')
    return
  }
  
  try {
    const mapTypeText = document.getElementById('mapTypeText')
    const mapTypeIcon = document.getElementById('mapTypeIcon')
    
    if (state.mapType === 'normal') {
      // 위성 지도로 전환
      state.map.setMapTypeId(kakao.maps.MapTypeId.HYBRID)
      state.mapType = 'satellite'
      if (mapTypeText) mapTypeText.textContent = '일반 지도'
      if (mapTypeIcon) mapTypeIcon.className = 'fas fa-map'
      showToast('위성 지도로 전환되었습니다', 'success')
    } else {
      // 일반 지도로 전환
      state.map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP)
      state.mapType = 'normal'
      if (mapTypeText) mapTypeText.textContent = '위성 지도'
      if (mapTypeIcon) mapTypeIcon.className = 'fas fa-satellite'
      showToast('일반 지도로 전환되었습니다', 'success')
    }
    
    console.log('✅ 지도 타입 전환 완료:', state.mapType)
  } catch (error) {
    console.error('❌ 지도 타입 전환 실패:', error)
    showToast('지도 타입 전환에 실패했습니다', 'error')
  }
}


// 내 위치로 이동
function moveToUserLocation() {
  if (!state.map) {
    showToast('지도를 먼저 로드해주세요', 'error')
    return
  }
  
  if (state.userLocation) {
    // 저장된 GPS 위치로 이동
    const moveLatLon = new kakao.maps.LatLng(state.userLocation.lat, state.userLocation.lng)
    state.map.setCenter(moveLatLon)
    state.map.setLevel(4)  // Kakao Maps level (낮을수록 확대)
    
    // GPS 마커 업데이트
    addUserLocationMarker()
    
    showToast('현재 위치로 이동했습니다', 'success')
  } else {
    // GPS 위치 새로 요청
    if (!navigator.geolocation) {
      showToast('GPS를 지원하지 않는 브라우저입니다', 'error')
      return
    }
    
    showToast('GPS 위치를 가져오는 중...', 'info')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        console.log(`✅ GPS 위치: ${state.userLocation.lat}, ${state.userLocation.lng}`)
        
        // GPS 위치로 지도 중심 이동
        const moveLatLon = new kakao.maps.LatLng(state.userLocation.lat, state.userLocation.lng)
        state.map.setCenter(moveLatLon)
        state.map.setLevel(4)
        
        // GPS 마커 추가
        addUserLocationMarker()
        
        showToast('현재 위치로 이동했습니다', 'success')
      },
      (error) => {
        console.error('GPS 오류:', error)
        let errorMsg = '위치를 가져올 수 없습니다'
        if (error.code === 1) errorMsg = '위치 권한이 필요합니다'
        else if (error.code === 2) errorMsg = '위치 정보를 사용할 수 없습니다'
        else if (error.code === 3) errorMsg = '위치 요청 시간이 초과되었습니다'
        showToast(errorMsg, 'warning')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }
}

// GPS 토글 기능
function toggleGPS() {
  // GPS 상태 토글
  state.gpsEnabled = !state.gpsEnabled
  
  // 버튼 스타일 업데이트
  updateGPSButtonStyle()
  
  if (state.gpsEnabled) {
    // GPS 활성화
    console.log('✅ GPS 활성화')
    
    // GPS 위치 요청
    if (!navigator.geolocation) {
      showToast('GPS를 지원하지 않는 브라우저입니다', 'error')
      state.gpsEnabled = false
      updateGPSButtonStyle()
      return
    }
    
    showToast('GPS 위치를 가져오는 중...', 'info')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        console.log(`✅ GPS 위치: ${state.userLocation.lat}, ${state.userLocation.lng}`)
        
        // GPS 위치로 지도 중심 이동
        if (state.map) {
          const moveLatLon = new kakao.maps.LatLng(state.userLocation.lat, state.userLocation.lng)
          state.map.setCenter(moveLatLon)
          state.map.setLevel(4)
          
          // GPS 마커 추가
          addUserLocationMarker()
          
          showToast('GPS가 활성화되었습니다', 'success')
        }
      },
      (error) => {
        console.error('GPS 오류:', error)
        let errorMsg = '위치를 가져올 수 없습니다'
        if (error.code === 1) errorMsg = '위치 권한이 필요합니다'
        else if (error.code === 2) errorMsg = '위치 정보를 사용할 수 없습니다'
        else if (error.code === 3) errorMsg = '위치 요청 시간이 초과되었습니다'
        showToast(errorMsg, 'warning')
        state.gpsEnabled = false
        updateGPSButtonStyle()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  } else {
    // GPS 비활성화
    console.log('⭕ GPS 비활성화')
    
    // GPS 마커 제거
    if (state.userLocationMarker) {
      state.userLocationMarker.setMap(null)
      state.userLocationMarker = null
    }
    
    // GPS 위치 초기화
    state.userLocation = null
    
    showToast('GPS가 비활성화되었습니다', 'info')
  }
}

// 전역 함수로 등록
// 마커 클릭 핸들러 (전역 함수)
function handleMarkerClick(customerId) {
  console.log('🖱️ 마커 클릭됨 | Customer ID:', customerId, '| Type:', typeof customerId)
  
  // state.customers에서 고객 찾기 (타입 변환 고려)
  const customer = state.customers.find(c => String(c.id) === String(customerId))
  
  if (!customer) {
    console.error('❌ 고객을 찾을 수 없습니다:', customerId)
    console.log('현재 state.customers 첫 5개:', state.customers.slice(0, 5).map(c => ({ id: c.id, name: c.customer_name })))
    return
  }
  
  console.log('✅ 고객 정보 찾음:', customer.customer_name)
  
  // 고객 상세 정보 표시
  showCustomerDetailOnMap(customer)
  
  // 클릭한 위치 기준으로 거리순 고객 목록 표시
  if (customer.latitude && customer.longitude) {
    showNearbyCustomers(customer.latitude, customer.longitude)
  }
}

// 전역 함수로 등록
// ============================================
// A/S 결과 입력 기능
// ============================================

// A/S 결과 모달 열기
async function openASResultModal(customerId) {
  console.log('📋 A/S 결과 모달 열기 | Customer ID:', customerId)
  
  const customer = state.customers.find(c => String(c.id) === String(customerId))
  
  if (!customer) {
    console.error('❌ 고객을 찾을 수 없습니다:', customerId)
    showToast('고객 정보를 찾을 수 없습니다', 'error')
    return
  }
  
  // 현재 작업 중인 고객 ID 저장
  state.currentASCustomerId = customerId
  
  // 사진 초기화
  state.asPhotos = []
  
  // 모달 요소 찾기
  const modal = document.getElementById('asResultModal')
  const customerNameEl = document.getElementById('asModalCustomerName')
  const photoPreview = document.getElementById('asPhotoPreview')
  const textArea = document.getElementById('asResultText')
  
  // 현재 A/S 기록 ID 초기화
  state.currentASRecordId = null
  
  if (customerNameEl) {
    customerNameEl.textContent = customer.customer_name
  }
  
  // 모달 표시
  if (modal) {
    modal.classList.remove('hidden')
  }
  
  // 기존 A/S 결과가 있으면 자동으로 불러오기
  try {
    console.log('📥 기존 A/S 결과 확인 중...')
    const response = await axios.get(`/api/customers/${customerId}/as-result`)
    
    if (response.data.success && response.data.asRecords && response.data.asRecords.length > 0) {
      // 가장 최근 A/S 기록 가져오기
      const latestRecord = response.data.asRecords[0]
      
      console.log('✅ 기존 A/S 결과 발견 - 자동 로드:', latestRecord)
      
      // 현재 A/S 기록 ID 저장
      state.currentASRecordId = latestRecord.id
      
      // 텍스트 내용 설정
      if (textArea && latestRecord.result_text) {
        textArea.value = latestRecord.result_text
      }
      
      // 사진 미리보기 설정
      if (latestRecord.photos && latestRecord.photos.length > 0) {
        console.log('📸 기존 사진 자동 로드:', latestRecord.photos.length, '개')
        
        // state.asPhotos에 기존 사진 정보 저장
        state.asPhotos = latestRecord.photos.map((photo, index) => ({
          id: photo.id || Date.now() + index,
          url: photo.url,
          storagePath: photo.storage_path || photo.storagePath,
          filename: photo.filename || `photo_${index + 1}.jpg`,
          size: photo.file_size || photo.size || 0,
          type: photo.mime_type || photo.type || 'image/jpeg',
          isExisting: true  // 기존 사진 표시
        }))
        
        console.log('✅ 기존 사진 정보:', state.asPhotos)
        
        // 미리보기 업데이트
        updateASPhotoPreview()
      }
    } else {
      console.log('ℹ️ 기존 A/S 결과 없음 - 빈 상태')
      
      // 초기화
      if (photoPreview) {
        photoPreview.innerHTML = ''
      }
      
      if (textArea) {
        textArea.value = ''
      }
    }
  } catch (error) {
    console.error('❌ A/S 결과 확인 오류:', error)
    
    // 오류가 있어도 모달은 열리도록 함
    if (photoPreview) {
      photoPreview.innerHTML = ''
    }
    
    if (textArea) {
      textArea.value = ''
    }
  }
  
  console.log('✅ A/S 결과 모달 표시 완료')
}

// A/S 결과 새로 작성 (초기화)
function resetASResultForm() {
  console.log('🔄 A/S 결과 양식 초기화...')
  
  const textArea = document.getElementById('asResultText')
  const photoPreview = document.getElementById('asPhotoPreview')
  
  // 사진 초기화
  state.asPhotos = []
  
  // 텍스트 초기화
  if (textArea) {
    textArea.value = ''
  }
  
  // 미리보기 초기화
  if (photoPreview) {
    photoPreview.innerHTML = ''
  }
  
  // 기록 ID 초기화 (신규 작성 모드)
  state.currentASRecordId = null
  
  showToast('새로운 A/S 결과를 작성할 수 있습니다', 'info')
  console.log('✅ 양식 초기화 완료')
}


// A/S 결과 모달 닫기
function closeASResultModal() {
  const modal = document.getElementById('asResultModal')
  if (modal) {
    modal.classList.add('hidden')
  }
  
  // 상태 초기화
  state.currentASCustomerId = null
  state.asPhotos = []
}

// A/S 사진 업로드 처리 (미리보기만, 실제 업로드는 완료 시)
async function handleASPhotoUpload(event) {
  const files = event.target.files
  
  if (!files || files.length === 0) {
    return
  }
  
  // 현재 사진 개수 확인
  const currentCount = state.asPhotos.length
  const remainingSlots = 10 - currentCount
  
  if (files.length > remainingSlots) {
    showToast(`사진은 최대 10장까지 업로드 가능합니다 (현재: ${currentCount}장)`, 'error')
    return
  }
  
  console.log(`📷 사진 ${files.length}개 선택됨 (미리보기 생성 중...)`)
  
  // 각 파일을 Base64로 변환하여 미리보기만 생성
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    if (!file.type.startsWith('image/')) {
      console.warn('⚠️ 이미지 파일이 아닙니다:', file.name)
      continue
    }
    
    try {
      console.log(`📤 사진 ${i + 1}/${files.length} 미리보기 생성 중: ${file.name}`)
      
      // FileReader로 Base64 변환
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      console.log(`✅ 사진 ${i + 1} 미리보기 준비 완료 (${file.size} bytes)`)
      
      // state.asPhotos에 추가 (Base64 저장, 완료 시 업로드)
      const photoData = {
        id: Date.now() + i,
        dataUrl: dataUrl,  // Base64 데이터
        filename: file.name,
        size: file.size,
        type: file.type,
        isExisting: false  // 새로 추가된 사진
      }
      
      state.asPhotos.push(photoData)
      
      // 미리보기 업데이트
      updateASPhotoPreview()
      
    } catch (error) {
      console.error(`❌ 사진 ${i + 1} 처리 오류:`, error)
      showToast(`사진 처리 실패: ${file.name}`, 'error')
    }
  }
  
  if (state.asPhotos.length > currentCount) {
    const addedCount = state.asPhotos.length - currentCount
    showToast(`사진 ${addedCount}개가 추가되었습니다`, 'success')
  }
  
  // input 초기화
  event.target.value = ''
}

// A/S 사진 미리보기 업데이트
function updateASPhotoPreview() {
  const photoPreview = document.getElementById('asPhotoPreview')
  
  if (!photoPreview) {
    return
  }
  
  photoPreview.innerHTML = state.asPhotos.map((photo, index) => {
    // 기존 사진 (URL)과 새 사진 (dataUrl) 구분
    const imageUrl = photo.url || photo.dataUrl
    const isExisting = photo.isExisting || false
    
    return `
    <div class="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
      <img src="${imageUrl}" alt="사진 ${index + 1}" class="w-full h-full object-cover">
      ${isExisting ? `
      <div class="absolute top-1 right-1 bg-green-500 text-white rounded-full px-2 py-1 text-xs">
        <i class="fas fa-check"></i>
      </div>
      ` : ''}
      <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">
        ${index + 1}/10
      </div>
    </div>
    `
  }).join('')
  
  console.log(`📷 미리보기 업데이트: ${state.asPhotos.length}장`)
}

// A/S 사진 제거
function removeASPhoto(photoId) {
  const index = state.asPhotos.findIndex(p => p.id === photoId)
  
  if (index !== -1) {
    state.asPhotos.splice(index, 1)
    updateASPhotoPreview()
    showToast('사진이 삭제되었습니다', 'success')
  }
}

// A/S 결과 완료 (신규 + 수정 통합)
async function completeASResult() {
  if (!state.currentASCustomerId) {
    showToast('고객 정보를 찾을 수 없습니다', 'error')
    return
  }
  
  const textArea = document.getElementById('asResultText')
  const resultText = textArea ? textArea.value.trim() : ''
  
  if (!resultText && state.asPhotos.length === 0) {
    showToast('작업 내용 또는 사진을 입력해주세요', 'error')
    return
  }
  
  // 수정 모드인지 신규 모드인지 확인
  const isEditMode = !!state.currentASRecordId
  const confirmMessage = isEditMode 
    ? 'A/S 작업 내용을 수정하시겠습니까?'
    : 'A/S 작업을 완료하시겠습니까?\n완료하면 마커가 회색으로 변경됩니다.'
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  console.log(isEditMode ? '✏️ A/S 결과 수정 처리...' : '✅ A/S 결과 완료 처리...')
  console.log('- 고객 ID:', state.currentASCustomerId)
  console.log('- 기록 ID:', state.currentASRecordId || '신규')
  console.log('- 사진 개수:', state.asPhotos.length)
  console.log('- 텍스트:', resultText)
  
  // ⭐ 중요: 모달 닫기 전에 사진 데이터를 로컬 변수에 복사
  const photosToUpload = [...state.asPhotos]
  console.log('📸 업로드할 사진 복사:', photosToUpload.length, '개')
  
  // 즉시 UI 업데이트
  const customerId = state.currentASCustomerId
  const recordId = state.currentASRecordId
  
  // 고객 정보 업데이트
  const customer = state.customers.find(c => String(c.id) === String(customerId))
  if (customer) {
    customer.as_result_text = resultText
    customer.as_result_photos = [...photosToUpload]
    customer.as_result = 'completed'
    customer.as_result_status = 'completed'
    customer.as_completed_at = new Date().toISOString()
  }
  
  // 마커 색상 업데이트 (즉시 반영)
  updateMarkerColor(customerId, 'completed')
  
  // 모달 닫기 (즉시)
  closeASResultModal()
  
  // 고객 상세 정보 패널도 닫기
  closeCustomerDetail()
  
  // 성공 메시지 (즉시)
  showToast(isEditMode ? 'A/S 작업 수정 중...' : 'A/S 작업 저장 중...', 'info')
  
  // 백그라운드에서 사진 업로드 + 메타데이터 저장 (비동기 처리)
  setTimeout(async () => {
    try {
      console.log('📤 백그라운드에서 사진 업로드 및 메타데이터 저장 중...')
      console.log('📸 처리할 사진 개수:', photosToUpload.length)
      
      // 1️⃣ 사진 업로드 (병렬 처리로 속도 개선!)
      const uploadedPhotos = []
      const uploadPromises = []
      
      for (let i = 0; i < photosToUpload.length; i++) {
        const photo = photosToUpload[i]
        
        // 이미 업로드된 사진 (url이 있고 dataUrl 없음)
        if (photo.url && !photo.dataUrl) {
          uploadedPhotos.push({
            id: photo.id,
            storagePath: photo.storagePath,
            url: photo.url,
            filename: photo.filename,
            size: photo.size,
            type: photo.type
          })
          console.log(`✅ 기존 사진 ${i + 1}: ${photo.filename}`)
          continue
        }
        
        // 새로 추가된 사진 (dataUrl이 있음) - 병렬 업로드
        if (photo.dataUrl) {
          console.log(`📤 사진 ${i + 1}/${photosToUpload.length} 업로드 준비: ${photo.filename}`)
          
          const uploadPromise = fetch('/api/customers/as-photo/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customerId: customerId,
              photo: {
                dataUrl: photo.dataUrl,
                filename: photo.filename,
                size: photo.size,
                type: photo.type
              }
            })
          })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              console.log(`✅ 사진 ${i + 1} 업로드 성공:`, result.storagePath)
              return {
                storagePath: result.storagePath,
                url: result.url,
                filename: result.filename,
                size: result.size,
                type: result.type
              }
            } else {
              console.error(`❌ 사진 ${i + 1} 업로드 실패:`, result)
              showToast(`사진 업로드 실패: ${photo.filename}`, 'error')
              return null
            }
          })
          .catch(error => {
            console.error(`❌ 사진 ${i + 1} 업로드 오류:`, error)
            showToast(`사진 업로드 실패: ${photo.filename}`, 'error')
            return null
          })
          
          uploadPromises.push(uploadPromise)
        }
      }
      
      // 모든 사진 병렬 업로드 대기 (속도 개선!)
      console.log(`⚡ ${uploadPromises.length}개 사진 병렬 업로드 시작...`)
      const uploadResults = await Promise.all(uploadPromises)
      
      // 성공한 업로드만 추가
      uploadResults.forEach(result => {
        if (result) {
          uploadedPhotos.push(result)
        }
      })
      
      console.log(`📸 업로드 완료된 사진: ${uploadedPhotos.length}개`)
      
      // 2️⃣ 서버에 메타데이터 저장 또는 수정
      let response
      
      if (isEditMode && recordId) {
        // 수정 모드
        response = await fetch(`/api/customers/as-result/${recordId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerId: customerId,
            resultText: resultText,
            uploadedPhotos: uploadedPhotos,
            updatedAt: new Date().toISOString()
          })
        })
      } else {
        // 신규 모드
        response = await fetch('/api/customers/as-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerId: customerId,
            resultText: resultText,
            uploadedPhotos: uploadedPhotos,
            completedAt: new Date().toISOString()
          })
        })
      }
      
      if (!response.ok) {
        throw new Error('A/S 결과 저장 실패')
      }
      
      const data = await response.json()
      console.log('✅ 메타데이터 저장 성공:', data)
      
      showToast(isEditMode ? 'A/S 작업이 수정되었습니다' : 'A/S 작업이 완료되었습니다', 'success')
      
    } catch (error) {
      console.error('❌ 백그라운드 저장 실패:', error)
      showToast('메타데이터 저장 중 오류가 발생했습니다', 'error')
    }
  }, 100)  // 100ms 후 백그라운드 저장 시작
}


// 마커 색상 업데이트
function updateMarkerColor(customerId, status) {
  console.log('🎨 마커 색상 업데이트:', customerId, status)
  
  // 고객 정보 업데이트
  const customer = state.customers.find(c => String(c.id) === String(customerId))
  if (customer && status === 'completed') {
    customer.as_result = 'completed'
  }
  
  // 지도가 있으면 마커 재생성 (색상 반영)
  if (state.map) {
    console.log('🗺️ 지도 마커 재생성 중...')
    
    // 기존 마커 모두 제거
    state.markers.forEach(marker => marker.setMap(null))
    state.markers = []
    
    // 유효한 고객만 필터링
    const validCustomers = state.customers.filter(c => c.latitude && c.longitude)
    
    // 마커 재생성
    validCustomers.forEach((cust) => {
      const markerColor = getMarkerColorByStatus(cust.as_result)
      
      let bgColor, iconColor, iconClass
      if (markerColor === 'gray') {
        bgColor = '#D1D5DB'  // 연한 회색 (A/S 완료)
        iconColor = '#6B7280'
        iconClass = 'fa-check-circle'
      } else if (markerColor === 'g') {
        bgColor = '#10B981'  // 초록색
        iconColor = '#FFFFFF'
        iconClass = 'fa-check-circle'
      } else if (markerColor === 'y') {
        bgColor = '#F59E0B'  // 노란색
        iconColor = '#FFFFFF'
        iconClass = 'fa-clock'
      } else if (markerColor === 'r') {
        bgColor = '#EF4444'  // 빨간색
        iconColor = '#FFFFFF'
        iconClass = 'fa-exclamation-circle'
      } else {
        bgColor = '#3B82F6'  // 파란색 (기본)
        iconColor = '#FFFFFF'
        iconClass = 'fa-map-marker-alt'
      }
      
      const markerContent = `
        <div onclick="handleMarkerClick('${cust.id}')" class="custom-marker" id="marker-cid-${cust.id}" data-customer-id="${cust.id}" style="position: relative; cursor: pointer; transform: translate(-50%, -100%);">
          <div style="position: relative;">
            <div style="
              width: 48px;
              height: 48px;
              background: ${bgColor};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              border: 3px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <i class="fas ${iconClass}" style="
                color: ${iconColor};
                font-size: 20px;
                transform: rotate(45deg);
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
              "></i>
            </div>
            <div style="
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-top: 12px solid ${bgColor};
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            "></div>
          </div>
        </div>
      `
      
      const customOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(cust.latitude, cust.longitude),
        content: markerContent,
        zIndex: 100
      })
      
      customOverlay.setMap(state.map)
      state.markers.push(customOverlay)
    })
    
    console.log('✅ 마커 재생성 완료:', validCustomers.length, '개')
  }
}

// ============================================
// 전역 함수 등록
// ============================================
window.handleMarkerClick = handleMarkerClick
window.openASResultModal = openASResultModal
window.closeASResultModal = closeASResultModal
window.handleASPhotoUpload = handleASPhotoUpload
window.removeASPhoto = removeASPhoto
window.completeASResult = completeASResult
window.toggleGPS = toggleGPS
window.logout = logout
window.switchToUserView = switchToUserView
window.toggleSelectAll = toggleSelectAll
window.deleteSelectedCustomers = deleteSelectedCustomers
window.downloadASResults = downloadASResults
window.openUploadModal = openUploadModal
window.closeUploadModal = closeUploadModal
window.handleFileSelect = handleFileSelect
window.downloadSampleExcel = downloadSampleExcel
window.confirmUpload = confirmUpload
window.showCustomerDetail = showCustomerDetail
window.showCustomerDetailOnMap = showCustomerDetailOnMap
window.closeCustomerDetail = closeCustomerDetail
window.openDirections = openDirections
window.openNavigation = openNavigation
window.renderAdminDashboard = renderAdminDashboard
window.toggleCustomerPanel = toggleCustomerPanel
window.moveToUserLocation = moveToUserLocation
window.toggleMapType = toggleMapType
window.togglePasswordVisibility = togglePasswordVisibility
window.renderLogin = renderLogin
window.renderRegister = renderRegister

// ============================================
// 앱 초기화
// ============================================
console.log('🚀 app.js 로드 완료')

// DOM 로드 완료 시 앱 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  // DOM이 이미 로드된 경우
  initApp()
}

function initApp() {
  console.log('🎯 앱 초기화 시작...')
  console.log('📍 DOM 상태:', document.readyState)
  
  const app = document.getElementById('app')
  console.log('📍 app 엘리먼트:', app)
  
  if (!app) {
    console.error('❌ app 엘리먼트를 찾을 수 없습니다!')
    return
  }
  
  // 세션 확인
  if (loadSession()) {
    console.log('✅ 세션 복원:', state.currentUser.name)
    
    // 역할에 따라 화면 렌더링
    if (state.currentUser.role === 'admin') {
      renderAdminDashboard()
    } else {
      renderUserMapView()
    }
  } else {
    console.log('ℹ️ 세션 없음 - 로그인 화면 표시')
    
    // 테스트: 직접 HTML 삽입
    app.innerHTML = '<div style="padding: 50px; text-align: center; font-size: 24px;">테스트: 로그인 화면 로딩 중...</div>'
    console.log('📍 app.innerHTML 설정 완료')
    
    // 실제 로그인 화면 렌더링
    setTimeout(() => {
      console.log('📍 renderLogin() 호출')
      renderLogin()
    }, 100)
  }
  
  console.log('✅ 앱 초기화 완료')
}

console.log('📱 앱 준비 완료 - 로그인 화면 대기 중')
