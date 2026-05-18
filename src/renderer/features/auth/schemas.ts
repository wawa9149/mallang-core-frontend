import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해줘.').email('이메일 형식이 아니야.'),
  password: z.string().min(1, '비밀번호를 입력해줘.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, '이메일을 입력해줘.')
      .email('이메일 형식이 아니야.'),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이야.')
      .max(64, '비밀번호가 너무 길어.'),
    passwordConfirm: z.string().min(1, '비밀번호를 한 번 더 입력해줘.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않아.',
  });

export type SignupInput = z.infer<typeof signupSchema>;
