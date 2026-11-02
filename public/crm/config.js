/* 수신거부 페이지 설정. enabled 가 false 이거나 functionsUrl 이 비어 있으면 페이지는 아무것도 보여주지 않고 홈으로 돌아간다.
   켜는 순서: Supabase 에 ops/crm/functions/unsubscribe 배포 → 아래 두 값 입력 → 광고 메일 발송 시작. (키·비밀값은 여기에 넣지 않는다) */
window.CRM_PUBLIC = {
  enabled: false,
  functionsUrl: "" // 예: "https://<project-ref>.supabase.co/functions/v1"
};
