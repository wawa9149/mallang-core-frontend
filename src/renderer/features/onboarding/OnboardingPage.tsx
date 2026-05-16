import { PageLayout } from '../../shared/components/PageLayout';

export function OnboardingPage() {
  return (
    <PageLayout
      title="처음 만나서 반가워."
      subtitle="너에 대해 좀 알려줘. 그래야 내가 옆에 제대로 있어줄 수 있어."
    >
      {/* TODO: 출근/점심/퇴근 시간, 음식 취향, 취미 입력 폼 (React Hook Form + Zod) */}
      <p>온보딩 폼을 여기에 단계별로 추가한다.</p>
    </PageLayout>
  );
}
