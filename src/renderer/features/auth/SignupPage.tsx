import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { AuthError, signup } from '../../shared/api/auth-api';
import { useAuthStore } from '../../shared/stores/auth-store';
import { AuthLayout } from './components/AuthLayout';
import { Field } from './components/Field';
import { PrimaryButton, TextLink } from './components/PrimaryButton';
import { signupSchema, type SignupInput } from './schemas';

const REDIRECT_DELAY_MS = 1400;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 4px;
`;

const FormAlert = styled.p`
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.dangerSurface};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 13px;
  font-weight: 600;
  text-align: center;
`;

const Success = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px 16px;
  text-align: center;
`;

const SuccessTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.brand.title};
`;

const SuccessDescription = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: ${({ theme }) => theme.brand.subtitle};
`;

const SuccessHint = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.brand.subtitle};
`;

export function SignupPage() {
  const navigate = useNavigate();
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  });

  useEffect(() => {
    if (!signedUpEmail) return;
    const timer = window.setTimeout(() => {
      navigate('/login', { state: { signedUpEmail } });
    }, REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [signedUpEmail, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors();
    try {
      const result = await signup(values.email, values.password);
      // signup 시점에 백엔드가 토큰을 함께 주지만, 우리는 명시적 로그인 UX를 유지하기 위해
      // 세션을 한 번 비워서 사용자가 다시 비밀번호로 로그인하게 만든다.
      useAuthStore.getState().signOut();
      setSignedUpEmail(result.user.email);
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : error instanceof Error
            ? error.message
            : '계정 생성 중 알 수 없는 오류가 발생했어.';
      setError('root', { type: 'server', message });
    }
  });

  if (signedUpEmail) {
    return (
      <AuthLayout subtitle="오늘도 말랑한 회사 생활을 위한" title="말랑코어">
        <Success>
          <SuccessTitle>가입이 완료됐어!</SuccessTitle>
          <SuccessDescription>
            {signedUpEmail}
            <br />이 이메일로 로그인하면 말랑이를 만날 수 있어.
          </SuccessDescription>
          <SuccessHint>잠시 후 로그인 화면으로 이동할게…</SuccessHint>
          <PrimaryButton
            type="button"
            onClick={() => navigate('/login', { state: { signedUpEmail } })}
          >
            지금 로그인하러 가기
          </PrimaryButton>
        </Success>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="오늘도 말랑한 회사 생활을 위한" title="말랑코어">
      <Form onSubmit={onSubmit} noValidate>
        {errors.root?.message && <FormAlert>{errors.root.message}</FormAlert>}
        <Field
          type="email"
          autoComplete="email"
          placeholder="이메일"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호"
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호 확인"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />
        <PrimaryButton type="submit" disabled={isSubmitting}>
          계정 생성
        </PrimaryButton>
        <Footer>
          <TextLink type="button" onClick={() => navigate('/login')}>
            계정이 이미 있어요!
          </TextLink>
        </Footer>
      </Form>
    </AuthLayout>
  );
}
