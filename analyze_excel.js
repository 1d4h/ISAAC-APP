const XLSX = require('xlsx');
const fs = require('fs');

try {
  console.log('📂 Excel 파일 읽기 시작...');
  const filePath = '/home/user/uploaded_files/26년AS 접수대장(2026-1-23).xlsx';
  
  // 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    console.error('❌ 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  
  // Excel 파일 읽기
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  
  console.log('\n📊 워크북 정보:');
  console.log('- 시트 개수:', workbook.SheetNames.length);
  console.log('- 시트 이름 목록:', workbook.SheetNames);
  
  // 첫 번째 시트 분석
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  console.log('\n📋 첫 번째 시트:', firstSheetName);
  
  // 시트를 JSON으로 변환 (헤더 포함)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: '',
    raw: false,
    header: 1  // 배열 형태로 변환
  });
  
  console.log('- 전체 행 수:', jsonData.length);
  
  if (jsonData.length > 0) {
    console.log('\n📌 헤더 (첫 번째 행):');
    console.log(JSON.stringify(jsonData[0], null, 2));
    
    console.log('\n📌 데이터 샘플 (2-4행):');
    for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
      console.log(`\n행 ${i + 1}:`, JSON.stringify(jsonData[i], null, 2));
    }
  }
  
  // 템플릿과 비교
  console.log('\n\n🔍 템플릿과 비교:');
  const expectedHeaders = [
    '순번', '횟수', '접수일자', '업체', '구분', '고객명', '전화번호', 
    '설치연월', '열원', '주소', 'AS접수내용', '설치팀', '지역', '접수자', 'AS결과'
  ];
  
  console.log('✅ 템플릿 헤더 (15개):');
  console.log(expectedHeaders);
  
  if (jsonData.length > 0) {
    console.log('\n📝 실제 파일 헤더 (' + jsonData[0].length + '개):');
    console.log(jsonData[0]);
    
    console.log('\n⚖️ 헤더 비교:');
    const actualHeaders = jsonData[0];
    
    // 누락된 헤더 확인
    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
      console.log('❌ 템플릿에는 있지만 실제 파일에는 없는 헤더:', missingHeaders);
    }
    
    // 추가된 헤더 확인
    const extraHeaders = actualHeaders.filter(h => !expectedHeaders.includes(h) && h !== '');
    if (extraHeaders.length > 0) {
      console.log('⚠️ 실제 파일에는 있지만 템플릿에는 없는 헤더:', extraHeaders);
    }
    
    // 순서 비교
    console.log('\n📊 헤더 순서 비교:');
    for (let i = 0; i < Math.max(expectedHeaders.length, actualHeaders.length); i++) {
      const expected = expectedHeaders[i] || '(없음)';
      const actual = actualHeaders[i] || '(없음)';
      const match = expected === actual ? '✅' : '❌';
      console.log(`  ${i + 1}. ${match} 템플릿: "${expected}" | 실제: "${actual}"`);
    }
  }
  
  console.log('\n✅ 분석 완료!');
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  console.error(error.stack);
  process.exit(1);
}
