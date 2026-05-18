import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { AuthError, login } from '../../shared/api/auth-api';
import { transitionToMallangWindow } from '../../shared/window/transition-to-mallang';
import { AuthLayout } from './components/AuthLayout';
import { Field } from './components/Field';
import { PrimaryButton, TextLink } from './components/PrimaryButton';
import { loginSchema, type LoginInput } from './schemas';

interface LoginLocationState {
  signedUpEmail?: string;
}

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

const SuccessAlert = styled.p`
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.successSurface};
  color: ${({ theme }) => theme.colors.success};
  font-size: 13px;
  font-weight: 600;
  text-align: center;
`;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signedUpEmail =
    (location.state as LoginLocationState | null)?.signedUpEmail ?? null;
  const [signupNotice, setSignupNotice] = useState<string | null>(
    signedUpEmail
      ? `${signedUpEmail} 계정이 만들어졌어! 비밀번호로 로그인해 줘.`
      : null,
  );

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: signedUpEmail ?? '', password: '' },
  });

  useEffect(() => {
    if (!signedUpEmail) return;
    // 알림은 한 번 본 후 history state에서 제거해서 새로고침 시 다시 뜨지 않도록 한다.
    window.history.replaceState({}, '');
  }, [signedUpEmail]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors();
    setSignupNotice(null);
    try {
      // auth-api.login이 응답 받은 user/토큰을 useAuthStore에 채워 준다.
      await login(values.email, values.password);
      await transitionToMallangWindow();
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : error instanceof Error
            ? error.message
            : '로그인 중 알 수 없는 오류가 발생했어.';
      setError('root', { type: 'server', message });
    }
  });

  return (
    <AuthLayout subtitle="오늘도 말랑한 회사 생활을 위한" title="말랑코어">
      <Form onSubmit={onSubmit} noValidate>
        {signupNotice && <SuccessAlert>{signupNotice}</SuccessAlert>}
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
          autoComplete="current-password"
          placeholder="비밀번호"
          error={errors.password?.message}
          {...register('password')}
        />
        <PrimaryButton type="submit" disabled={isSubmitting}>
          로그인
        </PrimaryButton>
        <Footer>
          <TextLink type="button" onClick={() => navigate('/signup')}>
            계정 만들기
          </TextLink>
        </Footer>
      </Form>
    </AuthLayout>
  );
}
