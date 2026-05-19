import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  fetchTeamMembers,
  syncTeamRestaurants,
  updateTeamLocation,
} from '../../../shared/api/teams-api';

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.brand.inputBg};
  -webkit-app-region: no-drag;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
`;

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const Input = styled.input`
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0 12px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.inputText};
  font-size: 13px;
  font-family: inherit;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.brand.inputPlaceholder};
  }

  &:focus {
    border-color: ${({ theme }) => theme.brand.primary};
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 8px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`;

const PrimaryButton = styled.button`
  flex: 1;
  min-height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.brand.primary};
  color: ${({ theme }) => theme.brand.promptText};
  font-size: 12px;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.brand.primaryHover};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  flex: 1;
  min-height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.title};
  font-size: 12px;
  font-weight: 700;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      `color-mix(in srgb, ${theme.brand.primary} 16%, ${theme.brand.background})`};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Meta = styled.p`
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
  line-height: 1.5;
`;

const Notice = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.brand.background};
  color: ${({ theme }) => theme.brand.subtitle};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
`;

const ErrorBox = styled.p`
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 12px;
  font-weight: 600;
  text-align: center;
`;

function readError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data?.message.join(', ');
  }
  if (error instanceof Error) return error.message;
  return '저장 중 오류가 발생했어.';
}

export function TeamLocationSection() {
  const queryClient = useQueryClient();
  const teamQuery = useQuery({
    queryKey: ['team', 'me', 'members'],
    queryFn: fetchTeamMembers,
  });
  const location = teamQuery.data?.team?.location;

  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(800);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  // 서버 상태가 들어오면 폼 초기값을 채워준다.
  // 입력 도중에 덮어쓰지 않도록 '필드 비어있음' 조건 + 서버 값 우선.
  useEffect(() => {
    if (!location) return;
    setAddress((prev) => (prev === '' ? (location.address ?? '') : prev));
    setRadius((prev) => (prev === 800 ? location.searchRadiusMeters : prev));
  }, [location]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTeamLocation({
        address: address.trim().length > 0 ? address.trim() : null,
        searchRadiusMeters: radius,
      }),
    onSuccess: () => {
      setErrorMessage(null);
      setSavedHint(
        '주소를 저장했어. 좌표 변환과 주변 식당 동기화는 잠시 뒤 자동으로 끝나.',
      );
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({
        queryKey: ['lunch-votes', 'suggestions'],
      });
    },
    onError: (error) => {
      setErrorMessage(readError(error));
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncTeamRestaurants,
    onSuccess: (result) => {
      setErrorMessage(null);
      if (!result.enabled) {
        setSavedHint(
          result.reason ?? '카카오 API 키가 없어 동기화를 건너뛰었어.',
        );
      } else if (result.reason) {
        setSavedHint(result.reason);
      } else {
        setSavedHint(
          `${result.upserted}곳 갱신 완료 (가져온 데이터 ${result.fetched}곳).`,
        );
        queryClient.invalidateQueries({
          queryKey: ['lunch-votes', 'suggestions'],
        });
      }
    },
    onError: (error) => {
      setErrorMessage(readError(error));
    },
  });

  // 알림은 잠시 보이고 사라진다.
  useEffect(() => {
    if (!savedHint) return;
    const timer = window.setTimeout(() => setSavedHint(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [savedHint]);

  // 팀이 없으면 입력해 봐야 저장이 의미가 없으니, 카드 자체는 보여주되 입력은 잠그고 안내만 띄운다.
  const hasTeam = Boolean(teamQuery.data?.team);

  if (!hasTeam) {
    return (
      <Card>
        <Title>회사 위치</Title>
        <Notice>
          팀 이름을 먼저 저장하면 같은 자리에서 회사 위치도 등록할 수 있어.
        </Notice>
      </Card>
    );
  }

  const hasCoords =
    typeof location?.lat === 'number' && typeof location?.lng === 'number';

  return (
    <Card>
      <Title>회사 위치</Title>
      <FieldLabel>
        도로명 주소
        <Row>
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="예: 서울 강남구 테헤란로 152"
            maxLength={200}
          />
          <Input
            type="number"
            min={100}
            max={5000}
            step={100}
            value={radius}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) setRadius(next);
            }}
            placeholder="반경(m)"
          />
        </Row>
      </FieldLabel>
      {hasCoords ? (
        <Meta>좌표 변환 완료 · 반경 {location?.searchRadiusMeters}m</Meta>
      ) : location?.address ? (
        <Notice>
          좌표 변환이 아직 안 됐어. 위 &quot;주소 저장&quot;을 한 번 더 눌러 봐.
        </Notice>
      ) : (
        <Notice>정확도를 높이려면 주소를 입력해 줘.</Notice>
      )}
      <ButtonRow>
        <PrimaryButton
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? '저장 중…' : '주소 저장'}
        </PrimaryButton>
        <SecondaryButton
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={!hasCoords || syncMutation.isPending}
          title={
            hasCoords
              ? '주변 식당을 다시 가져온다'
              : '좌표가 채워진 뒤에 사용할 수 있어'
          }
        >
          {syncMutation.isPending ? '동기화 중…' : '지금 동기화'}
        </SecondaryButton>
      </ButtonRow>
      {savedHint && <Notice>{savedHint}</Notice>}
      {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
    </Card>
  );
}
