import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const app = new Hono()

// 인메모리 데이터베이스 (임시)
const db = {
  users: [
    {
      id: 1,
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      name: 'Master Admin',
      email: 'admin@example.com',
      status: 'approved',
      created_at: new Date().toISOString()
    }
  ],
  customers: [],
  as_records: [],
  as_photos: []
}

console.log('✅ 로컬 인메모리 DB 초기화 완료')
console.log('⚠️ Supabase 연결 문제로 임시 로컬 모드로 실행됩니다')
console.log('📝 로그인: admin / admin123')

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// 인증 API
// ============================================
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    console.log('🔐 로그인 시도:', username)
    
    // 인메모리 DB에서 사용자 조회
    const user = db.users.find(u => u.username === username)
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없음:', username)
      return c.json({ success: false, message: '사용자를 찾을 수 없습니다' }, 404)
    }
    
    // 비밀번호 확인
    const isValid = bcrypt.compareSync(password, user.password)
    
    if (!isValid) {
      console.log('❌ 비밀번호 불일치:', username)
      return c.json({ success: false, message: '비밀번호가 일치하지 않습니다' }, 401)
    }
    
    console.log('✅ 로그인 성공:', username, '/', user.role)
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        status: user.status
      }
    })
  } catch (error) {
    console.error('로그인 오류:', error)
    return c.json({ success: false, message: '로그인 중 오류가 발생했습니다' }, 500)
  }
})

// 고객 목록 조회
app.get('/api/customers', async (c) => {
  try {
    console.log('✅ 고객 조회 성공:', db.customers.length + '명')
    return c.json({
      success: true,
      data: db.customers
    })
  } catch (error) {
    console.error('고객 조회 오류:', error)
    return c.json({ success: false, message: '고객 조회 중 오류가 발생했습니다' }, 500)
  }
})

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>고객관리 시스템</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=d72dc90ac4e09b31f1e6e28ea1b6c01d&libraries=services"></script>
      <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
      <script>
        console.log('✅ Supabase 연결 문제로 로컬 모드로 실행 중')
        console.log('📝 임시 관리자 계정: admin / admin123')
      </script>
    </head>
    <body class="bg-gray-100 p-8">
      <div class="max-w-6xl mx-auto">
        <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <div class="flex items-center">
            <i class="fas fa-exclamation-triangle text-yellow-700 text-2xl mr-3"></i>
            <div>
              <p class="font-bold text-yellow-700">⚠️ Supabase 연결 오류</p>
              <p class="text-sm text-yellow-600">현재 로컬 모드로 실행 중입니다. Supabase 프로젝트 상태를 확인해주세요.</p>
              <p class="text-sm text-yellow-600 mt-1">임시 계정: <strong>admin / admin123</strong></p>
            </div>
          </div>
        </div>
        
        <div id="app"></div>
      </div>
      
      <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// 서버 시작
const port = 3000
serve({
  fetch: app.fetch,
  port
})

console.log(`✅ 서버 시작: http://localhost:${port}`)
console.log('⚠️ 로컬 모드 - Supabase 연결 필요!')
