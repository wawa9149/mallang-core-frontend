import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import styled from 'styled-components';
import { clearOpenAiKey, setOpenAiKey } from '../../../shared/api/users-api';
import { useAuthStore } from '../../../shared/stores/auth-store';

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
`;

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const HeaderStatus = styled.span<{ $on: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme, $on }) =>
    $on ? theme.colors.success : theme.brand.subtitle};
`;

const Hint = styled.p`
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Row = styled.div`
  display: flex;
  gap: 6px;
`;

const Input = styled.input`
  flex: 1;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0 12px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.inputText};
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.brand.inputPlaceholder};
  }
  &:focus {
    border-color: ${({ theme }) => theme.brand.primary};
  }
`;

const PrimaryBtn = styled.button`
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  background: ${({ theme }) => theme.brand.primary};
  color: ${({ theme }) => theme.brand.promptText};
  font-size: 12px;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.brand.primaryHover};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TextBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 11px;
  font-weight: 700;

  &:hover {
    color: ${({ theme }) => theme.brand.title};
  }
`;

const DangerBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 11px;
  font-weight: 700;

  &:hover {
    background: ${({ theme }) => theme.colors.dangerSurface};
  }
`;

const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const ErrorMsg = styled.p`
  margin: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.danger};
`;

const SuccessMsg = styled.p`
  margin: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.success};
`;

export function OpenAiKeySection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const setMutation = useMutation({
    mutationFn: (apiKey: string) => setOpenAiKey(apiKey),
    onSuccess: ({ user: nextUser }) => {
      setUser(nextUser);
      setDraft('');
      setEditing(false);
      setFeedback('✓ 키가 저장됐어');
      setTimeout(() => setFeedback(null), 2000);
    },
    onError: (error) => {
      setFeedback(readErrorMessage(error));
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearOpenAiKey,
    onSuccess: ({ user: nextUser }) => {
      setUser(nextUser);
      setEditing(false);
      setDraft('');
      setFeedback('키를 삭제했어');
      setTimeout(() => setFeedback(null), 2000);
    },
    onError: (error) => {
      setFeedback(readErrorMessage(error));
    },
  });

  const pending = setMutation.isPending || clearMutation.isPending;

  // 마이페이지 바깥 폼(<Form onSubmit={handleSubmit}>) 안에 들어가 있어서
  // <form>을 또 쓰면 HTML 중첩 폼이 돼서 안쪽 submit이 사라진다.
  // 그래서 여기서는 form 태그 없이 버튼 onClick + Enter 키 핸들러로 직접 mutation을 발사한다.
  const submitKey = () => {
    const value = draft.trim();
    if (value.length < 20) {
      setFeedback('OpenAI 키 형식이 맞는지 확인해 줘 (sk-로 시작, 20자 이상).');
      return;
    }
    setMutation.mutate(value);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // 바깥 마이페이지 폼이 PATCH /users/me를 쏘는 걸 막고, 여기서 키 저장만 실행.
      event.preventDefault();
      event.stopPropagation();
      submitKey();
    }
  };

  const hasKey = Boolean(user?.hasOpenAiKey);
  const keyHint = user?.openaiKeyHint ?? 'sk-...';

  return (
    <Card>
      <Header>
        <HeaderTitle>말랑이 두뇌 (OpenAI API 키)</HeaderTitle>
        <HeaderStatus $on={hasKey}>{hasKey ? '연결됨' : '미연결'}</HeaderStatus>
      </Header>
      {!hasKey || editing ? (
        <div>
          <Row>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              type="password"
            />
            <PrimaryBtn type="button" onClick={submitKey} disabled={pending}>
              {setMutation.isPending ? '저장 중…' : '등록'}
            </PrimaryBtn>
          </Row>
          {editing && (
            <Footer style={{ marginTop: 6 }}>
              <TextBtn
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft('');
                }}
              >
                취소
              </TextBtn>
            </Footer>
          )}
        </div>
      ) : (
        <>
          <Hint>
            등록된 키: <strong>{keyHint}</strong>
          </Hint>
          <Footer>
            <TextBtn type="button" onClick={() => setEditing(true)}>
              교체하기
            </TextBtn>
            <DangerBtn
              type="button"
              onClick={() => clearMutation.mutate()}
              disabled={pending}
            >
              삭제
            </DangerBtn>
          </Footer>
        </>
      )}
      {feedback &&
        (feedback.startsWith('✓') ? (
          <SuccessMsg>{feedback}</SuccessMsg>
        ) : (
          <ErrorMsg>{feedback}</ErrorMsg>
        ))}
    </Card>
  );
}

function readErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data?.message.join(', ');
  }
  if (error instanceof Error) return error.message;
  return '키 처리 중 오류가 발생했어.';
}
