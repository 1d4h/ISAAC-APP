module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        TMAP_APP_KEY: 'vSWmSa8CcO4uvyc0EsAg46SWvxNVAKzL8KGbckPB',
        SUPABASE_URL: 'https://peelrrycglnqdcxtllfr.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZWxycnljZ2xucWRjeHRsbGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MjM5NzAsImV4cCI6MjA4NjA5OTk3MH0.t_Hap-t_4DurLLCPzSD-o88uhtL5HbpNsxvrhTTCNyw',
        // ⚠️ 카카오 REST API Key (카카오 개발자 콘솔 > 앱 > 앱 키 > REST API 키)
        KAKAO_REST_API_KEY: 'c933c69ba4e0228895438c6a8c327e74',
        KAKAO_JAVASCRIPT_KEY: 'c933c69ba4e0228895438c6a8c327e74',
        // ⚠️ 현재 샌드박스 공개 URL (세션 변경 시 업데이트 필요)
        BASE_URL: 'https://3000-i7blhya91auh0lj50ip2a-cc2fbc16.sandbox.novita.ai'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
