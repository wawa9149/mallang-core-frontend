import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuthStore } from '../../shared/stores/auth-store';
import { AuthLayout } from './components/AuthLayout';
import { Field } from './components/Field';
import { PrimaryButton, TextLink } from './components/PrimaryButton';
import { signupSchema, type SignupInput } from './schemas';

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

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    // TODO: POST /auth/signup 으로 교체 (가입 후 자동 로그인)
    await new Promise((resolve) => setTimeout(resolve, 500));
    const now = new Date().toISOString();
    setUser({
      id: 'mock-user',
      name: values.email.split('@')[0] ?? '말랑이',
      email: values.email,
      companyId: null,
      groupId: null,
      workStartTime: '10:00',
      lunchTime: '12:30',
      workEndTime: '18:00',
      averageOvertimeCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await window.mallang?.window.openMallang();
    navigate('/onboarding', { replace: true });
  });

  return (
    <AuthLayout subtitle="오늘도 말랑한 회사 생활을 위한" title="말랑코어">
      <Form onSubmit={onSubmit} noValidate>
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
